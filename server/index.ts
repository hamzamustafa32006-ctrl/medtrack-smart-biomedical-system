import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cron from "node-cron";
import { generateMaintenanceAlerts } from "./alertService";
import { updateScheduleStatuses } from "./scheduleService";
import { updateContractStatuses } from "./contractService";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Setup daily maintenance alert generation, schedule status updates, and contract expiry detection
  // Runs every day at midnight (Kuwait timezone: Asia/Kuwait UTC+3)
  cron.schedule('0 0 * * *', async () => {
    try {
      // Generate equipment maintenance alerts
      log('[SCHEDULER] Starting daily maintenance alert generation...');
      const alertResult = await generateMaintenanceAlerts();
      log(`[SCHEDULER] Alert generation complete: ${alertResult.created} created, ${alertResult.updated} updated, ${alertResult.skipped} skipped${alertResult.errors.length > 0 ? `, ${alertResult.errors.length} errors` : ''}`);
      
      if (alertResult.errors.length > 0) {
        console.error('[SCHEDULER] Alert generation errors:', alertResult.errors);
      }
      
      // Update maintenance schedule statuses
      log('[SCHEDULER] Starting schedule status updates...');
      const scheduleResult = await updateScheduleStatuses();
      log(`[SCHEDULER] Schedule update complete: ${scheduleResult.updated} updated, ${scheduleResult.alertsCreated} alerts created, ${scheduleResult.skipped} skipped${scheduleResult.errors.length > 0 ? `, ${scheduleResult.errors.length} errors` : ''}`);
      
      if (scheduleResult.errors.length > 0) {
        console.error('[SCHEDULER] Schedule update errors:', scheduleResult.errors);
      }
      
      // Update contract expiry statuses
      log('[SCHEDULER] Starting contract expiry detection...');
      const contractResult = await updateContractStatuses();
      log(`[SCHEDULER] Contract update complete: ${contractResult.expired} expired, ${contractResult.pendingRenewal} pending renewal, ${contractResult.alertsCreated} alerts created${contractResult.errors.length > 0 ? `, ${contractResult.errors.length} errors` : ''}`);
      
      if (contractResult.errors.length > 0) {
        console.error('[SCHEDULER] Contract update errors:', contractResult.errors);
      }
    } catch (error) {
      console.error('[SCHEDULER] Daily scheduler failed:', error);
    }
  }, {
    timezone: "Asia/Kuwait" // Run in Kuwait timezone
  });

  log('[SCHEDULER] Daily maintenance scheduler initialized (equipment alerts, schedule updates & contract expiry at midnight Kuwait time)');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

# Maintenance Alert App

## Overview
The Maintenance Alert App is a professional maintenance tracking system for engineers in hospital and industrial environments. It enables users to track equipment maintenance schedules, manage service contracts, and receive timely alerts for upcoming maintenance and contract expirations. This full-stack web application prioritizes reliability, clarity, and actionable information, crucial for high-stakes operational contexts.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework & Build System**: React with TypeScript, Vite for fast HMR and optimized builds, Wouter for lightweight client-side routing.
- **UI Design System**: shadcn/ui built on Radix UI, custom professional minimalist design with Primary Blue (#0057B7) and Accent Orange (#FF6D00), Tailwind CSS, Inter/Roboto fonts, responsive mobile-first design with dedicated bottom navigation.
- **State Management**: TanStack Query for server state, React Hook Form with Zod for form validation, Context API for authentication.
- **Navigation System**: Simplified 3-tier structure (Main, More, User Area) for reduced cognitive load. Desktop uses a fixed sidebar (`AppSidebar`), while mobile uses a fixed bottom navigation bar (`BottomNav`), both with active state highlighting.
- **Equipment Management Page**: Features free-text facility and location entry for flexibility, enhanced data tracking (e.g., `imageUrl`, `calibrationRequired`, `usageHours`, `department`), toggleable List (table) and Grid (card) views, Recharts-based data visualizations (Status/Condition distribution), color-coded badge system (Status, Criticality, Condition), search and filter functionalities. Equipment details are shown in a Sheet component with a tabbed interface (Overview, Maintenance & Alerts, Location & Facility, History) including QR code display for equipment ID. CRUD operations use queryClient for cache invalidation.

### Backend Architecture
- **Framework & Runtime**: Express.js with Node.js and TypeScript.
- **API Design**: RESTful API with resource-oriented patterns, middleware for authentication, RBAC, request logging, and audit logging.
- **Authentication & Authorization**: Replit Auth (OIDC) integrated with Passport.js, session storage in PostgreSQL, user-scoped data access enforced.
- **Data Access Layer**: Storage abstraction with `IStorage` interface, `DatabaseStorage` class, Drizzle ORM for type-safe queries, all queries filtered by `userId`.
- **Automated Alert Generation**: Daily `node-cron` scheduler (Asia/Kuwait timezone) scans equipment for upcoming `nextDueDate`. Implements a three-tier alert severity (Info, Warning, Critical) with automatic escalation. Uses a production-grade UPSERT pattern with `UNIQUE` constraints to prevent duplicate active alerts and ensure atomic updates, tracking `created`, `updated`, and `skipped` metrics.

### Data Storage
- **Database Technology**: PostgreSQL via Neon serverless database, WebSocket connection pooling.
- **Database Schema**: Managed by Drizzle ORM. Key tables include `sessions`, `users`, `facilities`, `locations`, `equipment` (with flexible free-text or foreign key facility/location, enhanced biomedical fields), `contracts`, `maintenanceRecords`, `maintenancePlans`, `maintenanceTasks`, `alerts` (multi-level, escalation, multi-channel delivery), `notificationLogs`, `auditLogs`.
- **Schema Validation**: Drizzle-Zod for Zod schema generation, runtime validation on API endpoints.

## External Dependencies

- **Authentication Service**: Replit Auth (OIDC), `connect-pg-simple` for PostgreSQL session storage.
- **Database Service**: Neon serverless PostgreSQL database using `@neondatabase/serverless`.
- **Third-Party UI Libraries**: Radix UI, Lucide React, `date-fns` and `date-fns-tz` for date/time handling, `class-variance-authority` (CVA) for styling.
- **Date Formatting System**: Defaults to Kuwait timezone (Asia/Kuwait). Frontend utilities format dates consistently (e.g., `dd/MM/yyyy`).
- **Build & Development Tools**: Replit-specific plugins, esbuild, tsx, drizzle-kit.
- **Styling Dependencies**: Tailwind CSS, PostCSS with autoprefixer.
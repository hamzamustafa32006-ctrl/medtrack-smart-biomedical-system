# Maintenance Alert App

## Overview
The Maintenance Alert App is a professional maintenance tracking system for engineers in hospital and industrial environments. It enables users to track equipment maintenance schedules, manage service contracts, and receive timely alerts for upcoming maintenance and contract expirations. This full-stack web application prioritizes reliability, clarity, and actionable information, crucial for high-stakes operational contexts.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Updates (November 2025)

### Role-Based Access Control (RBAC) System
- **4 User Roles**: admin, supervisor, technician, viewer with 13 predefined permissions
- **Frontend Hooks**: `useRole`, `useIsAdmin`, `useCurrentRole`, `useCanApproveMaintenance` for conditional UI rendering
- **UI Components**: `RequireRole`, `AdminOnly`, `SupervisorOnly`, `RoleSwitch` for role-based content display
- **Role Badge**: Header displays current user role with color coding (admin = primary blue)
- **Backend Authorization**: Middleware (`requirePermission`, `requireRole`, `requireAdmin`) **ENFORCED** on sensitive routes:
  - PATCH/DELETE operations (vendors, facilities, locations, equipment, schedules) → `requirePermission('edit_all')`
  - Maintenance record updates → `requirePermission('update_tasks')` (Technicians can update)
  - Maintenance task updates → `requirePermission('update_tasks')` (Technicians can update)
  - Schedule assignment → `requirePermission('edit_all')` (Admin/Supervisor only)
  - Maintenance approval/completion (records & schedules) → `requirePermission('approve_maintenance')`
  - All routes respect user roles: Admin/Supervisor can edit/approve/assign, Technicians can update, Viewers can only view
- **Auto-Seeding**: Permissions automatically seeded on server startup (idempotent)
- **Development Mode**: New users automatically assigned "admin" role for easier testing

### Automated Maintenance Record Generation
- **SQL Function**: `generate_maintenance_records(days_ahead INT)` for automated record creation
- **Smart Generation**: Creates records from maintenance schedules (upcoming/overdue) and critical alerts
- **Duplicate Prevention**: Checks for existing open records before creating new ones
- **Equipment Status Updates**: Automatically updates equipment status based on alerts and schedules
- **User Scoping**: All generated records properly scoped to equipment owner's userId
- **Daily Automation**: Cron job runs at midnight (Kuwait timezone) to auto-generate records for next 7 days
- **Integration**: Part of unified daily scheduler (alerts → schedules → contracts → maintenance records)

## System Architecture

### Frontend Architecture
- **Framework & Build System**: React with TypeScript, Vite for fast HMR and optimized builds, Wouter for lightweight client-side routing.
- **UI Design System**: shadcn/ui built on Radix UI, custom professional minimalist design with Primary Blue (#0057B7) and Accent Orange (#FF6D00), Tailwind CSS, Inter/Roboto fonts, responsive mobile-first design with dedicated bottom navigation.
- **State Management**: TanStack Query for server state, React Hook Form with Zod for form validation, Context API for authentication.
- **Navigation System**: Simplified 3-tier structure (Main, More, User Area) for reduced cognitive load. Desktop uses a fixed sidebar (`AppSidebar`), while mobile uses a fixed bottom navigation bar (`BottomNav`), both with active state highlighting. Main navigation includes Home, Analytics, Equipment, and Maintenance pages.
- **Maintenance Records Page** (`/maintenance`): Comprehensive maintenance record management system with professional CMMS features:
  - **Advanced Filtering**: Search across equipment names, technicians, descriptions; filter by status (In Progress, Completed, Pending Verification) and maintenance type (Preventive, Corrective, Calibration, Inspection, Emergency)
  - **Interactive Table**: Displays equipment name, type badges (color-coded), dates, technician, status, cost (KWD) with sortable columns
  - **Add Maintenance Dialog**: Full-featured form for creating new maintenance records with equipment selection, type, dates, description, actions taken, parts used, cost tracking, and notes
  - **Details Sheet**: Slide-out drawer showing complete maintenance record details including equipment info, maintenance specifics, actions, parts, and verification status
  - **Integration**: Seamlessly integrates with Equipment page History tab for equipment-specific maintenance records view
- **Equipment Management Page**: Features free-text facility and location entry for flexibility, enhanced data tracking (e.g., `imageUrl`, `calibrationRequired`, `usageHours`, `department`), toggleable List (table) and Grid (card) views, Recharts-based data visualizations (Status/Condition distribution), color-coded badge system (Status, Criticality, Condition), search and filter functionalities. Equipment details are shown in a Sheet component with a tabbed interface (Overview, Maintenance & Alerts, Location & Facility, History) including QR code display for equipment ID. CRUD operations use queryClient for cache invalidation.
- **Analytics Dashboard Page** (`/dashboard`): Real-time equipment analytics with synchronized filtering system. Features include:
  - **Dynamic Filter Panel**: 4 filters (Maintenance Status, Equipment Status, Facility, Search) with 300ms debounced search
  - **6 KPI Widgets**: Total Equipment, Active, Overdue, Critical, Under Maintenance, Due Soon (7 days)
  - **3 Interactive Charts**: Equipment Status Distribution (pie), Maintenance Priority (pie), Equipment by Facility (bar)
  - **Equipment Table**: Filtered results with Name, ID, Status, Priority, Next Due Date, Facility columns
  - **Auto-Synchronization**: All widgets, charts, and table update instantly when filters change
  - **Memoized Calculations**: Performance-optimized with useMemo for metrics and chart data
  - Uses `/api/equipment/status` endpoint for filtered data with pagination support

### Backend Architecture
- **Framework & Runtime**: Express.js with Node.js and TypeScript.
- **API Design**: RESTful API with resource-oriented patterns, middleware for authentication, RBAC, request logging, and audit logging.
- **Authentication & Authorization**: Replit Auth (OIDC) integrated with Passport.js, session storage in PostgreSQL, user-scoped data access enforced.
- **Data Access Layer**: Storage abstraction with `IStorage` interface, `DatabaseStorage` class, Drizzle ORM for type-safe queries, all queries filtered by `userId`.
- **Automated Alert Generation**: Daily `node-cron` scheduler (Asia/Kuwait timezone) scans equipment for upcoming `nextDueDate`. Implements a three-tier alert severity (Info, Warning, Critical) with automatic escalation. Uses a production-grade UPSERT pattern with `UNIQUE` constraints to prevent duplicate active alerts and ensure atomic updates, tracking `created`, `updated`, and `skipped` metrics.
- **Automated Maintenance Scheduling**: Comprehensive maintenance schedule management with automatic status updates and rescheduling. Daily cron job updates schedule statuses to "Overdue" when past due date and generates critical/warning alerts. Includes technician assignment, frequency-based auto-rescheduling on completion, and integration with equipment records. All schedule operations enforce user scoping and use storage abstraction layer for data access.
- **Automated Contract Expiry Detection**: Daily cron job (midnight Kuwait time) scans all active contracts and generates three-tier alerts: 30-day warning, 7-day critical, and expired status. Supports contract auto-renewal feature with automatic extension of contracts marked for auto-renewal. Uses contractService for centralized contract expiry logic with UPSERT pattern to prevent duplicate alerts.
- **Analytics Endpoints**: Four dashboard analytics endpoints serve real-time equipment metrics:
  - `/api/equipment/dashboard-summary`: Basic status counts (total, critical, warning, ok, overdue, urgent)
  - `/api/analytics/summary`: Extended metrics including 7-day resolution and upcoming due dates
  - `/api/analytics/stream`: Server-Sent Events (SSE) endpoint for real-time analytics updates with hash-based change detection
  - `/widgets/analytics-summary.js`: Static JavaScript widget that renders dashboard counters once
  - `/widgets/analytics-live.js`: Real-time JavaScript widget using EventSource for live updates every 5 seconds
  
  All endpoints use the storage abstraction layer with efficient SQL aggregation using FILTER clauses. The SSE implementation includes connection management, automatic cleanup on disconnect, and graceful fallback to polling for browsers without EventSource support.
- **Status-Filtered Equipment Endpoint**: Advanced filtering endpoint (`/api/equipment/status`) for equipment maintenance views with five status categories:
  - `overdue`: Equipment past due for maintenance (using `isOverdue` flag)
  - `upcoming`: Equipment due within 7 days (not overdue, but approaching)
  - `resolved`: Equipment serviced in the last 7 days (based on `lastMaintenanceDate`)
  - `critical`: Equipment with red status color (high priority)
  - `all`: All equipment (no status filter)
  
  Features full-text search across name, equipment ID, serial, manufacturer, and model fields. Supports pagination (limit/offset), multi-field sorting (name, nextDueDate, daysOverdue, statusColor, equipmentId, serial), and configurable sort direction (asc/desc). Returns paginated results with total count for efficient UI rendering.
- **Maintenance Record Management API**: Professional maintenance tracking endpoints with comprehensive CRUD operations:
  - `GET /api/maintenance-records`: Retrieve all user's maintenance records (simple list)
  - `GET /api/maintenance-records/details`: Advanced endpoint with filtering by equipmentId, status, maintenanceType, technicianId; returns records with joined equipment, facility, and technician details
  - `GET /api/maintenance-records/:id`: Fetch single record by ID with access control
  - `POST /api/maintenance-records`: Create new maintenance record with automatic equipment status updates ("Under Maintenance" for in-progress records)
  - `PATCH /api/maintenance-records/:id`: Update existing record with partial data support
  - `PATCH /api/maintenance-records/:id/complete`: Complete maintenance record with automated workflows: auto-resolve open equipment alerts, update equipment status to "Active", set completion timestamps, calculate next scheduled date based on maintenance frequency, support verification workflow
  
  All endpoints enforce user scoping and validate inputs with Zod schemas.

### Data Storage
- **Database Technology**: PostgreSQL via Neon serverless database, WebSocket connection pooling.
- **Database Schema**: Managed by Drizzle ORM. Key tables include `sessions`, `users` (with role field: admin/supervisor/technician/viewer), `roles_permissions` (role-permission mappings with 13 default permissions), `facilities`, `locations`, `equipment` (with flexible free-text or foreign key facility/location, enhanced biomedical fields, and analytics tracking columns: `priority`, `riskScore`, `statusColor`, `lastCheck`, `daysOverdue`, `isOverdue`), `contracts`, `maintenanceRecords` (enhanced with professional fields: `technicianId`, `startDate`, `endDate`, `actionsTaken`, `partsUsed`, `cost`, `status` [In Progress/Completed/Pending Verification], `verificationStatus` [Verified/Rejected/Pending], `verifiedBy`, `verifiedAt`), `maintenancePlans`, `maintenanceTasks`, `maintenance_schedules` (automated scheduling with status tracking, technician assignment, frequency-based rescheduling), `alerts` (multi-level, escalation, multi-channel delivery), `notificationLogs`, `auditLogs`.
- **Stored Functions**: `generate_maintenance_records(days_ahead INT)` - Automated maintenance record creation from schedules and critical alerts with duplicate prevention.
- **Schema Validation**: Drizzle-Zod for Zod schema generation, runtime validation on API endpoints.
- **Data Integrity**: Unique constraints on (userId, serial) for equipment and (userId, contractNumber) for contracts prevent duplicates while supporting multi-tenancy.
- **Analytics Tracking**: Equipment table includes real-time analytics columns for dashboard visualization: color-coded status (`statusColor`: red/orange/green based on maintenance overdue days), priority flags, risk scores (0-100), and overdue tracking metrics.

## External Dependencies

- **Authentication Service**: Replit Auth (OIDC), `connect-pg-simple` for PostgreSQL session storage.
- **Database Service**: Neon serverless PostgreSQL database using `@neondatabase/serverless`.
- **Third-Party UI Libraries**: Radix UI, Lucide React, `date-fns` and `date-fns-tz` for date/time handling, `class-variance-authority` (CVA) for styling.
- **Date Formatting System**: Defaults to Kuwait timezone (Asia/Kuwait). Frontend utilities format dates consistently (e.g., `dd/MM/yyyy`).
- **Build & Development Tools**: Replit-specific plugins, esbuild, tsx, drizzle-kit.
- **Styling Dependencies**: Tailwind CSS, PostCSS with autoprefixer.
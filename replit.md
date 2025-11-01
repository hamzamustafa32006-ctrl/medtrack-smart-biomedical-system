# Maintenance Alert App

## Overview
The Maintenance Alert App is a professional maintenance tracking system for engineers in hospital and industrial environments. It enables users to track equipment maintenance schedules, manage service contracts, and receive timely alerts for upcoming maintenance and contract expirations. This full-stack web application prioritizes reliability, clarity, and actionable information, crucial for high-stakes operational contexts. The project's ambition is to provide a robust solution for critical maintenance operations, ensuring operational continuity and efficiency in high-stakes environments.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework & Build System**: React with TypeScript, Vite, Wouter for routing.
- **UI Design System**: shadcn/ui built on Radix UI, custom professional minimalist design (Primary Blue, Accent Orange), Tailwind CSS, Inter/Roboto fonts, responsive mobile-first design with dedicated bottom navigation.
- **State Management**: TanStack Query for server state, React Hook Form with Zod for form validation, Context API for authentication.
- **Navigation System**: Simplified 3-tier structure (Main, More, User Area) with distinct desktop sidebar (`AppSidebar`) and mobile bottom navigation (`BottomNav`).
- **Pages**:
    - **Maintenance Records Page**: Advanced filtering, interactive table, add maintenance dialog, details sheet for comprehensive record management.
    - **Equipment Management Page**: Free-text facility/location entry, enhanced data tracking, toggleable List/Grid views, Recharts-based data visualizations, color-coded badges, search/filter, Sheet component for equipment details (Overview, Maintenance & Alerts, Location & Facility, History) with QR code.
    - **Analytics Dashboard Page**: Real-time analytics with dynamic filter panel, 6 KPI widgets, 3 interactive charts (Equipment Status, Maintenance Priority, Equipment by Facility), and a filtered equipment table. Auto-synchronization and memoized calculations for performance.
- **Enhanced Equipment Details View**: Displays enriched equipment data with equipment image gallery in Overview tab (supports external URLs with error handling), maintenance progress indicator, active alerts with severity-based color coding, and visual maintenance timeline in History tab with color-coded status indicators (green=completed, yellow=in-progress, blue=pending), technician details, and cost tracking.

### Backend Architecture
- **Framework & Runtime**: Express.js with Node.js and TypeScript.
- **API Design**: RESTful API with resource-oriented patterns, middleware for authentication, RBAC, request logging, and audit logging.
- **Authentication & Authorization**: Replit Auth (OIDC) with Passport.js, session storage in PostgreSQL. User-scoped data access enforced across all operations. Implements a comprehensive Role-Based Access Control (RBAC) system with 4 user roles (admin, supervisor, technician, viewer) and 13 predefined permissions. Backend authorization middleware (`requirePermission`, `requireRole`, `requireAdmin`) enforces permissions on sensitive routes and operations.
- **Data Access Layer**: `IStorage` interface, `DatabaseStorage` class, Drizzle ORM for type-safe queries.
- **Automated Processes (Cron Jobs - Asia/Kuwait timezone)**:
    - **Alert Generation**: Scans equipment for upcoming `nextDueDate`, generates three-tier alerts (Info, Warning, Critical) with automatic escalation. Uses UPSERT for duplicate prevention.
    - **Maintenance Scheduling**: Manages maintenance schedules, updates statuses (e.g., "Overdue"), and integrates with equipment records. Includes technician assignment and frequency-based auto-rescheduling.
    - **Contract Expiry Detection**: Scans active contracts, generates three-tier alerts (30-day, 7-day, expired), and supports auto-renewal.
    - **Maintenance Record Generation**: SQL function `generate_maintenance_records(days_ahead INT)` automatically creates records from schedules and critical alerts, preventing duplicates, updating equipment status, and ensuring user scoping.
- **Analytics Endpoints**: Four dashboard analytics endpoints, including Server-Sent Events (SSE) for real-time updates with hash-based change detection, and static/live JavaScript widgets.
- **Status-Filtered Equipment Endpoint**: Advanced filtering (`/api/equipment/status`) for maintenance views (overdue, upcoming, resolved, critical, all) with full-text search, pagination, and multi-field sorting.
- **Maintenance Record Management API**: Comprehensive CRUD operations for maintenance records, including advanced filtering, creation with automatic equipment status updates ("Under Maintenance"), and completion with automated workflows (alert resolution, status update to "Active", next scheduled date calculation, verification support).

### Data Storage
- **Database Technology**: PostgreSQL via Neon serverless database.
- **Database Schema**: Drizzle ORM managed. Key tables include `sessions`, `users` (with roles), `roles_permissions`, `facilities`, `locations`, `equipment` (with enhanced biomedical fields including `imageUrl` for equipment photos, analytics tracking columns like `priority`, `riskScore`, `statusColor`, `daysOverdue`), `contracts`, `maintenanceRecords` (professional fields: `technicianId`, `cost`, `status`, `verificationStatus`), `maintenance_schedules`, `alerts`, `notificationLogs`, `auditLogs`.
- **Stored Functions**: `generate_maintenance_records(days_ahead INT)`.
- **Schema Validation**: Drizzle-Zod for runtime validation.
- **Data Integrity**: Unique constraints for multi-tenancy.
- **Analytics Tracking**: Equipment table includes real-time analytics columns for dashboard visualization (e.g., `statusColor`, `riskScore`).

## External Dependencies
- **Authentication Service**: Replit Auth (OIDC), `connect-pg-simple`.
- **Database Service**: Neon serverless PostgreSQL database using `@neondatabase/serverless`.
- **Third-Party UI Libraries**: Radix UI, Lucide React, `date-fns` and `date-fns-tz`, `class-variance-authority` (CVA).
- **Date Formatting System**: Defaults to Kuwait timezone (Asia/Kuwait).
- **Build & Development Tools**: Replit-specific plugins, esbuild, tsx, drizzle-kit.
- **Styling Dependencies**: Tailwind CSS, PostCSS with autoprefixer.
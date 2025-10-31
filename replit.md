# Maintenance Alert App

## Overview

The Maintenance Alert App is a professional maintenance tracking system designed for engineers in hospital and industrial environments. The application helps users track equipment maintenance schedules, manage service contracts, and receive timely alerts about upcoming maintenance deadlines and contract expirations. Built as a full-stack web application, it prioritizes reliability, clarity, and actionable information delivery in high-stakes operational contexts.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server, providing fast HMR and optimized production builds
- Wouter for lightweight client-side routing without external dependencies

**UI Design System**
- shadcn/ui component library built on Radix UI primitives
- Custom design system following a professional, minimalist aesthetic with specific color palette:
  - Primary Blue (#0057B7) for actionable elements and navigation
  - Accent Orange (#FF6D00) for urgent alerts and notifications
  - Grayscale hierarchy for content organization and reduced visual noise
- Tailwind CSS for utility-first styling with custom configuration
- Typography: Inter/Roboto font families loaded via Google Fonts CDN
- Responsive design with mobile-first approach, including dedicated bottom navigation for mobile devices

**State Management**
- TanStack Query (React Query) for server state management, data fetching, and caching
- React Hook Form with Zod resolver for form state and validation
- Context API for authentication state

**Component Structure**
- Page components in `client/src/pages/`: landing, home (alerts), equipment, history, settings
- Reusable UI components in `client/src/components/ui/` from shadcn/ui
- Custom app components: AppSidebar, BottomNav, TopBar, AlertCenter
- Conditional rendering based on screen size (mobile vs. desktop navigation)

**Equipment Management Page** (`client/src/pages/equipment.tsx`)
- Modern table view with sortable columns (Name, Location, Status, Criticality)
- Status badges (Operational: green, Maintenance: yellow, Decommissioned: gray)
- Criticality badges (Critical: red, High: orange, Medium: yellow, Low: blue)
- Search functionality for equipment names
- Filter dropdowns for facility, status, and criticality
- Equipment Detail Dashboard (Sheet component, 700px width):
  - **Enhanced Header**: Equipment name (2xl bold), manufacturer • model subtitle, status & criticality badges
  - **Tabbed Interface** (4 tabs):
    1. **Overview Tab**: 2-column grid with InfoItem helper showing Equipment ID, Serial Number, Criticality badge, Install Date, Purchase Date, Warranty Expiry, Barcode; Service Contracts section; Equipment Notes card
    2. **Maintenance & Alerts Tab**: Next Maintenance card (large date + color-coded countdown: red if overdue, orange if ≤7 days), Last Maintenance card, Maintenance Schedule card, Active Alerts placeholder
    3. **Location & Facility Tab**: Card showing Facility name, Department/Area, Floor, Room with Building2 icon
    4. **History Tab**: Maintenance History table (fetches from `/api/maintenance-records`, filters by equipmentId, sorts by date descending) showing Date, Type, Status (Completed/Pending badges), Performed By, Notes; Equipment Notes section; Add Service Contract button
  - **InfoItem Helper Component**: Reusable label-value pair component with icon support for consistent metadata display
  - **Data Integration**: useQuery for maintenance records with `staleTime: 0` for fresh data on mount
- All dates displayed in dd/MM/yyyy format using formatDate() utility
- Dialog forms for creating new equipment with facility/location selection
- CRUD operations with proper cache invalidation via queryClient

### Backend Architecture

**Framework & Runtime**
- Express.js server running on Node.js
- TypeScript for type safety across the entire backend
- Session-based authentication using express-session

**API Design**
- RESTful API endpoints following resource-oriented patterns
- Route structure in `server/routes.ts`:
  - `/api/auth/*` - Authentication endpoints
  - `/api/facilities` - Facility management (CRUD)
  - `/api/locations` - Location management within facilities
  - `/api/equipment` - Equipment CRUD with CSV import/export
  - `/api/contracts` - Contract management
  - `/api/maintenance-records` - Maintenance history tracking
  - `/api/maintenance-plans` - Plan creation and management
  - `/api/maintenance-tasks` - Task generation, assignment, completion
  - `/api/alerts` - Alert management (acknowledge, snooze, resolve)
  - `/api/notifications` - Notification logs and delivery status
  - `/api/audit-logs` - Audit trail queries (admin only)
- Middleware for authentication checks and RBAC enforcement on protected routes
- Request logging middleware for API monitoring
- Audit logging middleware for all write operations

**Authentication & Authorization**
- Replit Auth integration via OpenID Connect (OIDC)
- Passport.js strategy for authentication flow
- Session storage in PostgreSQL for persistence
- User-scoped data access enforced at the storage layer

**Data Access Layer**
- Storage abstraction pattern with `IStorage` interface
- `DatabaseStorage` class implementing CRUD operations
- All queries filtered by `userId` to ensure data isolation
- Drizzle ORM for type-safe database queries

### Data Storage

**Database Technology**
- PostgreSQL via Neon serverless database
- WebSocket connection pooling for efficient database access
- Schema managed through Drizzle ORM with migrations in `migrations/` directory

**Database Schema** (`shared/schema.ts`)
- `sessions` - Express session storage (required for authentication)
- `users` - User profiles with roles (admin, supervisor, technician, viewer), notification preferences, timezone (Kuwait default)
- `facilities` - Facility/building hierarchy with codes and addresses
- `locations` - Specific locations within facilities (floor, room, department)
- `equipment` - Equipment tracking with facility/location refs, manufacturer, model, serial, status, criticality, barcode, install dates
- `contracts` - Service contracts (vendor info, dates, alert thresholds)
- `maintenanceRecords` - Maintenance history (dates, types, completion status)
- `maintenancePlans` - Scheduled maintenance definitions (frequency, buffer days, checklist, policy: PM/Calibration/Safety)
- `maintenanceTasks` - Auto-generated tasks from plans (due dates, status, assignment, priority, completion tracking)
- `alerts` - Multi-level alerts tied to tasks/contracts (severity, escalation, snooze, multi-channel delivery)
- `notificationLogs` - Delivery tracking for email/SMS/push notifications with provider responses
- `auditLogs` - Complete audit trail of all create/update/delete operations with before/after state

**Schema Validation**
- Drizzle-Zod for generating Zod schemas from database schema
- Runtime validation on API endpoints using Zod
- Insert and update schemas defined for all entities

### External Dependencies

**Authentication Service**
- Replit Auth (OIDC provider) for user authentication
- Session management via connect-pg-simple for PostgreSQL-backed sessions
- Required environment variables: `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`

**Database Service**
- Neon serverless PostgreSQL database
- Connection via `@neondatabase/serverless` package with WebSocket support
- Required environment variable: `DATABASE_URL`

**Third-Party UI Libraries**
- Radix UI for accessible component primitives
- Lucide React for icon system
- date-fns and date-fns-tz for date manipulation, formatting, and timezone support
- class-variance-authority (CVA) for variant-based component styling

**Date Formatting System**
- Kuwait timezone (Asia/Kuwait) as default for all users
- Date formatting utilities in `client/src/lib/dateUtils.ts`:
  - formatDate(): dd/MM/yyyy format (e.g., "15/01/2024")
  - formatDateTime(): dd/MM/yyyy HH:mm format
  - formatDateHuman(): "15 Jan 2024" format
  - formatDateCompact(): "15 Jan" format
- All frontend pages use formatDate() for consistent Kuwait date display
- Backend stores dates as ISO timestamps in PostgreSQL (timezone-safe)

**Build & Development Tools**
- Replit-specific plugins for development experience (cartographer, dev banner, runtime error overlay)
- esbuild for production server bundling
- tsx for TypeScript execution in development
- drizzle-kit for database schema management

**Styling Dependencies**
- Tailwind CSS with custom configuration for design system
- PostCSS with autoprefixer for CSS processing
- Custom CSS variables for theming (light/dark mode support)
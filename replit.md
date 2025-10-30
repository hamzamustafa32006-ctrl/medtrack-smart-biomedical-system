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
- Custom app components: AppSidebar, BottomNav, TopBar
- Conditional rendering based on screen size (mobile vs. desktop navigation)

### Backend Architecture

**Framework & Runtime**
- Express.js server running on Node.js
- TypeScript for type safety across the entire backend
- Session-based authentication using express-session

**API Design**
- RESTful API endpoints following resource-oriented patterns
- Route structure in `server/routes.ts`:
  - `/api/auth/*` - Authentication endpoints
  - `/api/equipment` - Equipment CRUD operations
  - `/api/contracts` - Contract management
  - `/api/maintenance-records` - Maintenance history tracking
- Middleware for authentication checks on protected routes
- Request logging middleware for API monitoring

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
- `users` - User profiles from Replit Auth (email, names, profile image)
- `equipment` - Equipment tracking (name, location, model, maintenance frequency)
- `contracts` - Service contracts (vendor info, dates, alert thresholds)
- `maintenanceRecords` - Maintenance history (dates, types, completion status)

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
- date-fns for date manipulation and formatting
- class-variance-authority (CVA) for variant-based component styling

**Build & Development Tools**
- Replit-specific plugins for development experience (cartographer, dev banner, runtime error overlay)
- esbuild for production server bundling
- tsx for TypeScript execution in development
- drizzle-kit for database schema management

**Styling Dependencies**
- Tailwind CSS with custom configuration for design system
- PostCSS with autoprefixer for CSS processing
- Custom CSS variables for theming (light/dark mode support)
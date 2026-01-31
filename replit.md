# Sunin Hotel Booking System

## Overview

A hotel room booking and scheduling web application designed for small hotel owners to replace Excel-based management. The system provides room management, booking management with double-booking prevention, and a calendar view for visualizing room occupancy. Built as a single-user application for hotel owner/staff use.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens (CSS variables for theming)
- **Form Handling**: React Hook Form with Zod validation
- **Date Handling**: date-fns for date manipulation, react-day-picker for calendar inputs

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **API Design**: RESTful API with typed routes defined in `shared/routes.ts`
- **Validation**: Zod schemas shared between frontend and backend for type-safe API contracts
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

### Data Storage
- **Database**: PostgreSQL
- **Schema Location**: `shared/schema.ts` - contains table definitions for rooms and bookings
- **Migrations**: Drizzle Kit for schema migrations (`drizzle-kit push`)

### Project Structure
```
├── client/           # React frontend application
│   └── src/
│       ├── components/   # UI components including shadcn/ui
│       ├── hooks/        # Custom React hooks for data fetching
│       ├── pages/        # Page components (Dashboard, Bookings, Rooms, Calendar)
│       └── lib/          # Utility functions and query client setup
├── server/           # Express backend
│   ├── db.ts         # Database connection
│   ├── routes.ts     # API route handlers
│   └── storage.ts    # Data access layer
├── shared/           # Shared code between frontend and backend
│   ├── schema.ts     # Drizzle database schema and Zod types
│   └── routes.ts     # API contract definitions
└── migrations/       # Database migrations
```

### Key Design Patterns
- **Shared Types**: Database schema and API types are defined once in `shared/` and used by both frontend and backend
- **Type-Safe API**: API routes include Zod schemas for input validation and response typing
- **Storage Abstraction**: `IStorage` interface in `server/storage.ts` abstracts database operations
- **Component-Based UI**: Reusable UI components following shadcn/ui patterns

### Build System
- **Development**: Vite for frontend hot module replacement, tsx for backend TypeScript execution
- **Production Build**: esbuild bundles server code, Vite builds frontend assets
- **Output**: Combined into `dist/` directory with server as `index.cjs` and frontend in `dist/public/`

## External Dependencies

### Database
- **PostgreSQL**: Primary database (connection via `DATABASE_URL` environment variable)
- **connect-pg-simple**: Session storage for PostgreSQL (available but not currently used)

### UI Framework Dependencies
- **Radix UI**: Headless UI primitives for accessible components
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### Development Tools
- **Vite**: Frontend build tool and dev server
- **Drizzle Kit**: Database migration tooling
- **TypeScript**: Static type checking across the entire codebase
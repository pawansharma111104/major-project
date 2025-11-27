# Battlefield Tracker - Tactical GPS System

## Overview

Battlefield Tracker is a real-time tactical GPS tracking application designed for military operations. The system enables secure communication between soldiers in the field and command trackers, featuring live location tracking, encrypted messaging, and drone-based facial verification capabilities. Built as a mission-critical application, it prioritizes information clarity, reliability, and operational efficiency in field conditions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast hot module replacement
- Single-page application (SPA) architecture with client-side routing

**UI Component System**
- Shadcn UI (New York variant) component library built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Material Design principles combined with tactical UI conventions for high-visibility, information-dense interfaces
- Design optimized for field operations: high contrast colors, large touch targets (48px minimum), monospaced fonts for coordinates

**State Management & Data Fetching**
- TanStack Query (React Query) for server state management and caching
- WebSocket connections for real-time bidirectional communication
- Local component state with React hooks for UI-specific state

**Key Frontend Features**
- **Soldier Dashboard**: GPS tracking toggle, quick-action encrypted messaging (engaged enemy, need medical, request backup, all clear)
- **Tracker Dashboard**: Three view modes (radar, map, list) for monitoring soldier positions, drone verification initiation
- **Authentication**: Role-based login system (soldier vs tracker roles)

### Backend Architecture

**Server Framework**
- Express.js as the HTTP server framework
- Node.js runtime with ES modules
- Dual-mode server setup: development (Vite integration) and production (static file serving)

**WebSocket Server**
- WebSocket server running alongside Express for real-time communication
- Connection tracking with user metadata (userId, codename, role)
- Broadcast messaging for location updates and tactical messages
- Event-driven architecture for soldier status changes and verification requests

**Data Layer**
- Drizzle ORM for type-safe database interactions
- PostgreSQL database via Neon serverless
- Database connection pooling through Neon's WebSocket interface

**Authentication & Security**
- bcrypt.js for password hashing (10 salt rounds)
- Client-side AES-256 encryption for tactical messages using crypto-js
- Session-based authentication pattern
- Role-based access control (soldier vs tracker permissions)

### Database Schema

**Core Tables**

1. **soldiers** - User authentication and profiles
   - Codename-based identity (unique identifier instead of traditional usernames)
   - Role assignment (soldier/tracker)
   - Status tracking (online, offline, engaged, needsAssistance)
   - Last seen timestamps for presence tracking

2. **locationUpdates** - GPS coordinate history
   - Real-time latitude/longitude coordinates
   - Accuracy metadata from device GPS
   - Cascading deletes on soldier removal
   - Timestamp-ordered for location history

3. **messages** - Encrypted tactical communications
   - Pre-defined message types (engagedEnemy, needMedical, requestBackup, allClear)
   - AES-256 encrypted content storage
   - Acknowledgment tracking for command center
   - Foreign key relationship to soldiers

4. **droneVerifications** - Facial verification records
   - Verification workflow tracking (pending → verified/failed/alert)
   - Drone GPS coordinates at verification time
   - Confidence scores for AI verification results
   - Tracker initiation tracking

**Design Decisions**
- UUID primary keys for distributed system compatibility
- Soft real-time data model (location updates stored vs purely ephemeral)
- Cascade deletes to maintain referential integrity
- JSONB for flexible drone coordinate storage

### API Structure

**RESTful Endpoints**
- `POST /api/auth/register` - Soldier/tracker registration with role assignment
- `POST /api/auth/login` - Codename/password authentication

**WebSocket Protocol**
- `register` - Client connection registration with user metadata
- `locationUpdate` - Real-time GPS coordinate broadcasting
- `message` - Encrypted tactical message relay
- `statusChange` - Soldier status updates (online/engaged/needsAssistance)
- `requestVerification` - Drone verification initiation
- `verificationComplete` - Verification result notification

### External Dependencies

**Database & Infrastructure**
- Neon Serverless PostgreSQL - Serverless database with WebSocket pooling
- Drizzle ORM - Type-safe database toolkit with schema migration support

**UI Component Libraries**
- Radix UI - Accessible, unstyled component primitives (21+ components)
- Tailwind CSS - Utility-first CSS framework with custom tactical theme
- Lucide React - Icon system for tactical UI elements

**Cryptography**
- crypto-js - AES-256 encryption for message security
- bcryptjs - Password hashing for authentication

**Development Tools**
- TypeScript - Static typing for both client and server
- Vite - Fast development server with HMR
- ESBuild - Production bundling for server code
- Replit plugins - Development banner, error overlay, cartographer for Replit environment

**Form Handling & Validation**
- React Hook Form - Performant form state management
- Zod - Schema validation with TypeScript inference
- @hookform/resolvers - Zod integration with React Hook Form

**Design System Integration**
- shadcn/ui configuration with path aliases (@/components, @/lib, @/hooks)
- Google Fonts CDN - Roboto Mono (monospace data), Inter/Roboto (UI text)
- Custom CSS variables for tactical color palette (high contrast light/dark modes)
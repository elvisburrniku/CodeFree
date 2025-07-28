# CodeCraft AI - AI-Powered Development Platform

## Overview

CodeCraft AI is a comprehensive full-stack web application that combines AI-powered code generation with a complete development environment. The platform allows users to create, edit, and deploy applications with AI assistance, featuring real-time collaboration, code editing, and project management capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query for server state, React hooks for local state
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Session Management**: express-session with PostgreSQL store
- **Authentication**: Replit Auth (OpenID Connect) integration
- **API Design**: RESTful endpoints with JSON responses

### Database Layer
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM with type-safe queries
- **Schema**: Shared schema definitions between client and server
- **Migrations**: Drizzle Kit for database schema management

## Key Components

### Authentication System
- **Provider**: Replit Auth using OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions for scalability
- **User Management**: Complete user lifecycle with profile management
- **Credit System**: Built-in credit tracking for AI usage

### AI Integration
- **Provider**: OpenAI GPT-4o for code generation and chat
- **Features**: Code generation, file creation, intelligent suggestions
- **Usage Tracking**: Credit-based system with usage monitoring
- **Chat Interface**: Real-time AI chat modal with context awareness

### Code Editor
- **Editor**: Monaco Editor (VS Code engine) integration
- **Features**: Syntax highlighting, auto-completion, error detection
- **File Management**: Tree-based file explorer with CRUD operations
- **Live Preview**: Real-time preview panel for web applications

### Project Management
- **Templates**: Pre-configured project templates (React, etc.)
- **File System**: Virtual file system with database persistence
- **Version Control**: File history and change tracking
- **Deployment**: Integration-ready deployment pipeline

### Payment System
- **Provider**: Stripe integration for subscription management
- **Plans**: Credit-based and subscription-based billing
- **Security**: Secure payment processing with webhook handling

## Data Flow

1. **Authentication Flow**:
   - User authenticates via Replit OAuth
   - Session created and stored in PostgreSQL
   - User profile synchronized with database

2. **Project Creation Flow**:
   - User selects template or creates blank project
   - Project metadata stored in database
   - Initial file structure created

3. **AI Generation Flow**:
   - User submits prompt via chat interface
   - Request sent to OpenAI API with context
   - Generated code parsed and files created
   - Credits deducted from user account

4. **Code Editing Flow**:
   - Monaco Editor loads file content
   - Real-time changes stored in memory
   - Auto-save functionality persists to database
   - Live preview updates automatically

## External Dependencies

### Core Services
- **Neon Database**: Serverless PostgreSQL hosting
- **OpenAI API**: GPT-4o for AI code generation
- **Stripe**: Payment processing and subscription management
- **Replit Auth**: Authentication and user management

### Development Tools
- **Monaco Editor**: Code editing functionality
- **Vite**: Build tool and development server
- **Tailwind CSS**: Utility-first styling framework
- **Radix UI**: Accessible component primitives

### Runtime Dependencies
- **Express.js**: Web application framework
- **Drizzle ORM**: Type-safe database operations
- **TanStack Query**: Server state management
- **Zod**: Runtime type validation

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with hot module replacement
- **Database**: Neon development database with Drizzle migrations
- **Environment Variables**: Secure configuration management

### Production Build
- **Frontend**: Static assets built with Vite
- **Backend**: Node.js server with compiled TypeScript
- **Database**: Production PostgreSQL with connection pooling
- **Deployment**: Single deployment target with both frontend and backend

### Environment Configuration
- **Build Process**: Vite builds frontend, esbuild compiles backend
- **Asset Serving**: Express serves static files in production
- **Database Migrations**: Automated schema deployment with Drizzle
- **Session Management**: Persistent sessions across deployments

The application follows a monorepo structure with shared TypeScript definitions, enabling type safety across the entire stack while maintaining clear separation between client and server concerns.
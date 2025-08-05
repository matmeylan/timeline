# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `deno task dev` (runs DB initialization then starts dev server with file watching)
- **Build for production**: `deno task build`
- **Run production server**: `deno task preview`
- **Lint and type check**: `deno task check` (runs deno lint, type checking for .ts and .tsx files)
- **Format code**: `npm run format` (formats JS/TS/TSX/HTML/CSS/JSON with Prettier)
- **Database initialization**: `deno task db` (initializes SQLite database with migrations)

## Architecture Overview

### Framework & Runtime
- **Fresh framework** (Deno-based) with Tailwind CSS and Preact
- **SQLite database** with custom migration system
- **File-based routing** in `src/routes/` directory

### Core Domain Structure
The application follows a domain-driven design pattern:

- **`src/core/domain/`**: Contains business logic organized by domain:
  - `user/`: User management, sessions, passkeys (WebAuthn authentication)
  - `journal.ts`/`journal.types.ts`: Journal and journal entry management
  - `file.ts`/`file.types.ts`: File upload/download functionality

- **`src/core/auth/`**: Authentication system with multiple strategies:
  - Password-based auth with Argon2 hashing
  - WebAuthn/passkey support
  - Email verification workflow
  - Session management with SQLite storage
  - Rate limiting

- **`src/core/database/`**: SQLite database layer with custom model types

### Route Architecture
- **Nested middleware system**: Global middleware in `src/routes/_middleware.ts` handles session validation
- **Route groups**: 
  - `(auth)/`: Authentication-related routes with sub-groups for authenticated/guest/any users
  - `[user]/[slug]/`: Dynamic user journals with nested entry management
- **Route state management**: Centralized in middleware, provides `user` and `session` to all routes
- **Route definitions**: Strongly typed route helpers in `src/core/route/routes.ts` with reserved route protection

### Key Features
- **Multi-user journal system**: Users can create multiple journals with unique slugs
- **Rich text editing**: Milkdown editor with markdown support
- **File management**: Upload/download system with user-scoped file organization
- **WebAuthn authentication**: Modern passwordless authentication alongside traditional passwords

### Database Migrations
- Location: `scripts/db/migrations/`
- Run via: `deno task db`
- Migration files are timestamped TypeScript files

### Component Organization
- **`src/components/`**: Reusable UI components (Button, Container, Header, etc.)
- **`src/islands/`**: Client-side interactive components (Fresh islands pattern)
  - Auth-related islands for login/register with passkeys
  - Content editor for rich text editing

### Static Assets
- **Styles**: Custom CSS in `src/static/styles/` with vendor styles for Milkdown themes
- **File uploads**: Stored in `data/files/user/[username]/[fileId]/` structure
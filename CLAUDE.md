# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Project Nebula is a developer HUD for AI-assisted coding. TypeScript monorepo with:
- **Convex** - Real-time backend (local self-hosted)
- **Temporal** - Workflow orchestration for missions
- **Tauri** - Desktop app (React + TailwindCSS)

## Commands

```bash
just up            # Start k3d cluster + all services via Tilt
just down          # Stop services (keeps cluster)
just reset         # Full reset (delete cluster + registry)

just check         # Type-check all packages
just lint          # Lint everything
just test          # Run tests
just build         # Production build
just desktop-build # Build desktop app for production
```

### Single-package commands

Use Turbo's filter to target specific packages:

```bash
pnpm turbo check --filter=@nebula/worker   # Type-check worker only
pnpm turbo test --filter=@nebula/shared    # Test shared only
pnpm turbo build --filter=@nebula/convex   # Build convex only
```

### Development UIs

After `just up`:
- **Tilt UI**: http://localhost:10350 (dev orchestration, logs)
- **Temporal UI**: http://localhost:8080 (workflow debugging)
- **Convex Dashboard**: http://localhost:6791 (data browser)

## Architecture

```
infra/                 # k3d + Tilt configuration
  ctlptl.yaml          # Cluster + registry definition
  Tiltfile             # Main orchestration
  lib/Tiltfile         # Helper functions
  services/            # Per-service configs

apps/
  desktop/     # Tauri 2 + React + TailwindCSS (runs locally)
  worker/      # Temporal worker (runs in k3d)

packages/
  convex/      # Convex backend (schema, queries, mutations)
  shared/      # Shared TypeScript types + utilities
```

### Mission Phases

All work flows through four phases: **Brainstorm -> Design -> Plan -> Execute**

Temporal workflows orchestrate phase transitions. Each phase can have approval gates.

## Key Patterns

- **Enums over magic strings** - Use TypeScript enums from `@nebula/shared` for status fields
- **Shared types** - `import { Ticket, TicketStatus, Mission, MissionPhase } from '@nebula/shared'`
- **Convex schema uses string unions** - Convex validators use string literals, not TS enums. The values match the enum string values (e.g., `'brainstorm'`, `'design'`).

## Convex + Temporal Integration

```
Desktop -> Convex: User actions via mutations
Convex -> Temporal: Kick off workflows via HTTP actions
Temporal -> Convex: Activities update state via mutations
Convex -> Desktop: Real-time subscriptions
```

## Development Notes

- Convex generates `_generated/` files when running. Run `just up` before type-checking convex.
- Temporal server: `localhost:7233` (gRPC), `localhost:8233` (Web UI)
- Convex backend: `localhost:3210`, dashboard: `localhost:3211`

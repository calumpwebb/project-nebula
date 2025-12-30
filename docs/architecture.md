# Architecture

## System Overview

Project Nebula is a developer HUD for AI-assisted coding. Desktop app orchestrates AI workflows through a real-time backend.

```
Desktop (Tauri) <-> Convex (Backend) <-> Temporal (Workflows) <-> Worker
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Desktop | Tauri 2 + React + TailwindCSS | Native app, runs locally |
| Backend | Convex (self-hosted) | Real-time data, subscriptions |
| Workflows | Temporal | Mission phase orchestration |
| Worker | TypeScript | Temporal activities, AI operations |
| Infra | k3d + Tilt | Local Kubernetes development |

## Data Flow

```
User Action (Desktop)
    -> Convex Mutation
    -> HTTP Action triggers Temporal Workflow
    -> Worker executes Activities
    -> Activities update Convex via Mutations
    -> Real-time subscription updates Desktop
```

## Directory Structure

```
apps/
  desktop/          # Tauri 2 + React + TailwindCSS
  worker/           # Temporal worker (runs in k3d)

packages/
  convex/           # Convex backend (schema, queries, mutations)
    convex/         # Actual Convex functions
  shared/           # Shared TypeScript types + utilities
    src/types/      # Mission, Ticket, enums

infra/
  ctlptl.yaml       # k3d cluster + registry
  Tiltfile          # Main orchestration
  lib/Tiltfile      # Helper functions
  services/         # Per-service Tilt configs
    postgres/
    temporal/
    convex/
    nebula-worker/
```

## Services

| Service | Port | Health | Purpose |
|---------|------|--------|---------|
| PostgreSQL | 5432 | `pg_isready` | Temporal database |
| Temporal Server | 7233 | `tctl workflow list` | Workflow engine |
| Temporal UI | 8080 | HTTP `/` | Workflow debugging |
| Convex Backend | 3210 | HTTP `/version` | Real-time backend |
| Convex Dashboard | 6791 | HTTP `/` | Data browser |
| Worker | 8081 | HTTP `/health` | Temporal activities |

## Dependency Graph

```
PostgreSQL
    -> Temporal Server
        -> Temporal UI
        -> Worker
        -> Desktop

Convex Backend
    -> Convex Dashboard
    -> Convex Dev (sidecar)
```

## Mission Workflow

All work flows through phases: Brainstorm -> Design -> Plan -> Execute

Each phase:
- Has its own conversation/context
- Produces an artifact (design doc, plan)
- Can have approval gates (approve, reject, defer)

Temporal workflows manage phase transitions and state.

## Convex + Temporal Integration

**Convex responsibilities:**
- Real-time state (missions, tickets)
- Subscriptions to desktop
- HTTP actions to trigger Temporal

**Temporal responsibilities:**
- Durable workflow execution
- Phase transitions
- Retry logic and timeouts

**Worker responsibilities:**
- Execute Temporal activities
- AI operations (future)
- Git operations (future)

## Future Architecture

Planned additions:
- MCP server for AI tool access
- Git worktree management
- AI provider abstraction layer
- Review queue system

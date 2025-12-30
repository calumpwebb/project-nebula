# Nebula Knowledge Base

Quick index to detailed documentation.

## Architecture
TypeScript monorepo: Tauri desktop, Convex backend, Temporal workflows, k3d infra.
-> `docs/architecture.md`

## Development
k3d + Tilt environment, commands, adding services, troubleshooting.
-> `docs/development.md`

## Code Patterns
Enums over strings, shared types, Convex schema conventions, Temporal patterns.
-> `docs/patterns.md`

## Design Documents

### Brainstorm Log
86 pins captured, mission phases, entity design, UI/UX exploration.
-> `docs/brainstorms/nebula-brainstorm-log.md`

### k3d + Tilt Setup
Infrastructure design: cluster, services, dependencies, file structure.
-> `docs/plans/2025-12-28-k3d-tilt-dev-environment.md`

### Implementation Plan
Step-by-step k3d + Tilt implementation details.
-> `docs/plans/2025-12-28-k3d-tilt-implementation.md`

## UI/Design

### Figma Guidelines
Design system, component library documentation.
-> `docs/figma/Guidelines.md`

## Quick Reference

### Mission Phases
Brainstorm -> Design -> Plan -> Execute

### Ticket States
Backlog -> InProgress -> Done (or Blocked)

### Key Ports
| Service | Port |
|---------|------|
| Tilt UI | 10350 |
| Temporal UI | 8080 |
| Convex Dashboard | 6791 |
| Convex Backend | 3210 |
| Temporal gRPC | 7233 |

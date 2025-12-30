# Project Nebula

Developer HUD for AI-assisted coding. TypeScript monorepo: Tauri desktop, Convex backend (self-hosted), Temporal workflows.

## Issue Tracking
Uses bd (beads) for ALL tracking. No markdown TODOs.
Details: `AGENTS.md`

## Tech Stack
Tauri 2, React, TailwindCSS, Convex, Temporal, k3d, Tilt, pnpm, Turbo

## Desktop Logging
Uses `tauri-plugin-log`. Logs to stdout + platform log dir (macOS: `~/Library/Logs/com.nebula.desktop/`). Use `log::info!`, `log::error!`, etc.

## Commands
| Action | Command |
|--------|---------|
| Start all | `just up` |
| Stop | `just down` |
| Reset | `just reset` |
| Type-check | `just check` |
| Build | `just build` |
| Single pkg | `pnpm turbo check --filter=@nebula/worker` |

## Dev UIs
Tilt: localhost:10350 | Temporal: localhost:8080 | Convex: localhost:6791

## Structure
apps/<name>/deploy/manifest.ts (cdk8s), packages/convex, packages/shared, infra/lib

## Key Patterns
- Enums over strings: `import { TicketStatus, MissionPhase } from '@nebula/shared'`
- Convex uses string literals matching enum values ('brainstorm', 'design', etc.)
- Run `just up` before type-checking convex (generates _generated/)
- Command timeouts: Use 15s max for polling/waiting commands, then re-check. Avoids long waits. (Exception: test suites can use longer timeouts)
- Simple scripts: No fancy UI, colors, or box drawing. Plain text output only.

## Mission Phases
Brainstorm -> Design -> Plan -> Execute

## Planning
Wave-based parallelization: group independent tasks into parallel waves.
Plans: `docs/plans/YYYY-MM-DD-<feature>.md`

## Documentation
Index: `docs/KNOWLEDGE_BASE.md`

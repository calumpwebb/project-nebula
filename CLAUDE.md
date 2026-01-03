# Nebula

Developer HUD for AI-assisted coding. TypeScript monorepo: Tauri desktop, Convex backend (self-hosted), Temporal workflows.

## Issue Tracking

Uses bd (beads) for ALL tracking. No markdown TODOs. Details: `AGENTS.md`

- **Over-use beads**: Track everything, not just major items. We want full context history.
- If no ticket exists for work being done, create one first (`bd create`).

## Git Workflow

- **Commit often**: Be proactive with commits and pushes. Small, frequent commits > large batches.
- **Ticket in commits**: Always include ticket number(s): `feat(NEBULA-123):` or `fix(NEBULA-456, NEBULA-789):`
- **One ticket per commit**: Scope commits to a single ticket when possible.
- **Always create tickets**: Never ask for a ticket reference. If none exists, create one with `bd create` immediately.

## Tech Stack

Tauri 2, React, TailwindCSS, Convex, Temporal, k3d, Tilt, pnpm, Turbo

## Desktop Logging

Uses `tauri-plugin-log`. Logs to stdout + platform log dir (macOS: `~/Library/Logs/com.nebula.desktop/`). Use `log::info!`, `log::error!`, etc.

## Commands

| Action     | Command                                    |
| ---------- | ------------------------------------------ |
| Start all  | `just up`                                  |
| Stop       | `just down`                                |
| Reset      | `just reset`                               |
| Type-check | `just check`                               |
| Build      | `just build`                               |
| Single pkg | `pnpm turbo check --filter=@nebula/worker` |

## Dev UIs

Tilt: localhost:10350 | Temporal: localhost:8080 | Convex: localhost:6791

## Structure

apps/<name>/deploy/manifest.ts (cdk8s), packages/convex, packages/shared, infra/lib

## Key Patterns

- Enums over strings: `import { TicketStatus, MissionPhase } from '@nebula/shared'`
- Comment style: No multi-line dividers. Use single line or `// ---- Header ----` for sections.
- Convex uses string literals matching enum values ('brainstorm', 'design', etc.)
- Run `just up` before type-checking convex (generates \_generated/)
- Command timeouts: Use 15s max for polling/waiting commands, then re-check. Avoids long waits. (Exception: test suites can use longer timeouts)
- Simple scripts: No fancy UI, colors, or box drawing. Plain text output only.
- No lazy loading: Avoid dynamic imports and lazy loading patterns. Prefer simpler alternatives (e.g., HTTP APIs over Node.js-specific libraries).

## Environment Detection

Use `ENVIRONMENT` variable for all environment checks. Never check `CONVEX_CLOUD_URL` or use ad-hoc `isDev` patterns.

```typescript
import { getEnvironment, Environment } from '@nebula/shared'

const env = getEnvironment()
if (env === Environment.Local) { ... }
if (env === 'production') { ... }  // Direct comparison also works
```

Values: `local` | `production`. Defaults to `local` for safety.
Env vars: `ENVIRONMENT` (Node.js) / `VITE_ENVIRONMENT` (Vite - requires prefix).

## Mission Phases

Brainstorm -> Design -> Plan -> Execute

## Planning

Wave-based parallelization: group independent tasks into parallel waves.
Plans: `docs/plans/YYYY-MM-DD-<feature>.md`

## Documentation

Index: `docs/KNOWLEDGE_BASE.md`

## Desktop Icons

Icons must be **8-bit RGBA PNG**. Use `magick ... PNG32:output.png` to force RGBA. CI fails otherwise.

## Slash Commands

Commands live in `.claude/commands/`. Keep them as **thin wrappers** around skills:

```markdown
---
description: Short description
---

Use the Skill tool to invoke the "skill-name" skill with args: $ARGUMENTS
```

Don't duplicate logic—skills hold the implementation, commands provide discoverability.

## Memory

"Update your memory" = edit this CLAUDE.md file. Commit after every task completion.

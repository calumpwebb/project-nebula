# Project Nebula

**Note**: This project uses [bd (beads)](https://github.com/steveyegge/beads)
for issue tracking. Use `bd` commands instead of markdown TODOs.
See @AGENTS.md for workflow details.

## Agent System
Global agents: ~/.claude/CLAUDE.md
Orchestrator-first routing

---

## Quick Context
Developer HUD for AI-assisted coding. TypeScript monorepo: Tauri desktop, Convex backend (self-hosted), Temporal workflows.

## Tech Stack
Tauri 2, React, TailwindCSS, Convex, Temporal, k3d, Tilt, pnpm, Turbo

## Commands
| Action | Command |
|--------|---------|
| Start all | `just up` |
| Stop | `just down` |
| Reset | `just reset` |
| Synth infra | `just synth` |
| Type-check | `just check` |
| Lint | `just lint` |
| Test | `just test` |
| Build | `just build` |
| Single pkg | `pnpm turbo check --filter=@nebula/worker` |

## Dev UIs
Tilt: localhost:10350 | Temporal: localhost:8080 | Convex: localhost:6791

## Structure
apps/<name>/deploy/manifest.ts (cdk8s definitions), packages/convex, packages/shared, infra/lib (generators)

## Key Patterns
- Enums over strings: `import { TicketStatus, MissionPhase } from '@nebula/shared'`
- Convex uses string literals matching enum values ('brainstorm', 'design', etc.)
- Run `just up` before type-checking convex (generates _generated/)
- Link tickets to code: When there's a relevant ticket, add a comment near the code (e.g., `// TODO(NEBULA-xxx): description`). Helps future readers know there's tracked work.

## Mission Phases
Brainstorm -> Design -> Plan -> Execute

## Documentation
Index: `docs/KNOWLEDGE_BASE.md`

## Planning & Execution

**Wave-based parallelization**: All implementation plans should be structured as waves of parallel tasks, not sequential steps.

1. **Analyze dependencies** - Map which tasks depend on others
2. **Group into waves** - Tasks with no deps or same deps run together
3. **Execute with subagents** - Dispatch parallel agents per wave, wait for wave completion before next wave

Example structure:
```
Wave 1 (no deps): A1, A2, A3, A4 → 4 parallel agents
Wave 2 (needs wave 1): B1, B2, B3 → 3 parallel agents
Wave 3 (needs wave 2): C1 → 1 agent
Wave 4: Merge + test
```

Plans go in `docs/plans/YYYY-MM-DD-<feature>.md` with wave structure clearly marked.

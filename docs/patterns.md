# Code Patterns

## Type System

### Enums for Status Fields

Always use TypeScript enums from `@nebula/shared`:

```typescript
import { TicketStatus, MissionPhase, MissionStatus } from '@nebula/shared'

// Good
const status = TicketStatus.InProgress

// Bad - magic strings
const status = 'in-progress'
```

### Shared Types

Import types from shared package:

```typescript
import {
  Ticket,
  TicketStatus,
  Mission,
  MissionPhase,
  MissionStatus
} from '@nebula/shared'
```

### Convex Schema Pattern

Convex validators use string literals, not TS enums. Values match enum string values:

```typescript
// packages/convex/convex/schema.ts
import { v } from 'convex/values'

export default defineSchema({
  missions: defineTable({
    phase: v.union(
      v.literal('brainstorm'),
      v.literal('design'),
      v.literal('plan'),
      v.literal('execute')
    ),
    status: v.union(
      v.literal('active'),
      v.literal('paused'),
      v.literal('completed'),
      v.literal('aborted')
    ),
  }),
})
```

## Mission Phases

```
Brainstorm -> Design -> Plan -> Execute
```

Each phase:
- Own conversation context
- Produces artifact
- Has approval gate

Phase enum values:
- `MissionPhase.Brainstorm` = `'brainstorm'`
- `MissionPhase.Design` = `'design'`
- `MissionPhase.Plan` = `'plan'`
- `MissionPhase.Execute` = `'execute'`

## Ticket Workflow

```
Backlog -> InProgress -> Done
              |
              v
           Blocked
```

Status enum values:
- `TicketStatus.Backlog` = `'backlog'`
- `TicketStatus.InProgress` = `'in-progress'`
- `TicketStatus.Blocked` = `'blocked'`
- `TicketStatus.Done` = `'done'`

## Temporal Patterns

### Workflow Definition

```typescript
// apps/worker/src/workflows/mission.ts
import { proxyActivities } from '@temporalio/workflow'
import type * as activities from '../activities'

const { updateMissionPhase } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
})

export async function missionWorkflow(missionId: string) {
  // Workflow logic
  await updateMissionPhase(missionId, 'design')
}
```

### Activity Definition

```typescript
// apps/worker/src/activities/index.ts
export async function updateMissionPhase(
  missionId: string,
  phase: string
): Promise<void> {
  // Call Convex mutation via HTTP
}
```

## Component Patterns (Desktop)

### React + TailwindCSS

```tsx
// Standard component structure
export function MyComponent({ prop }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* content */}
    </div>
  )
}
```

## Error Handling

### Temporal Activities

Activities should throw on failure (Temporal handles retries):

```typescript
export async function riskyActivity(): Promise<void> {
  const result = await fetch(...)
  if (!result.ok) {
    throw new Error(`Failed: ${result.status}`)
  }
}
```

### Convex Mutations

Use `ConvexError` for user-facing errors:

```typescript
import { ConvexError } from 'convex/values'

export const createMission = mutation({
  handler: async (ctx, args) => {
    if (!args.ticketId) {
      throw new ConvexError('Ticket ID required')
    }
  }
})
```

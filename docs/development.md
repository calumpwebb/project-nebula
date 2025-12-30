# Development Guide

## Prerequisites

```bash
# Required tools
brew install k3d tilt tilt-dev/tap/ctlptl k9s node pnpm
```

| Tool | Purpose |
|------|---------|
| k3d | k3s in Docker - fast cluster create/delete |
| Tilt | Dev orchestration, logs, live reload |
| ctlptl | Declarative cluster + registry setup |
| k9s | Terminal UI for k8s (optional) |
| pnpm | Package manager |

## Quick Start

```bash
# Install dependencies
pnpm install

# Start everything (creates k3d cluster if needed)
just up

# Open Tilt UI for logs and status
open http://localhost:10350
```

## Commands Reference

### Primary Commands

| Command | Description |
|---------|-------------|
| `just up` | Start k3d cluster + all services via Tilt |
| `just down` | Stop services (keeps cluster) |
| `just reset` | Full reset (delete cluster + registry) |

### Build Commands

| Command | Description |
|---------|-------------|
| `just check` | Type-check all packages |
| `just lint` | Lint everything |
| `just test` | Run tests |
| `just build` | Production build |
| `just desktop-build` | Build desktop app for production |

### Package-Specific Commands

Use Turbo's filter to target specific packages:

```bash
pnpm turbo check --filter=@nebula/worker   # Type-check worker only
pnpm turbo test --filter=@nebula/shared    # Test shared only
pnpm turbo build --filter=@nebula/convex   # Build convex only
```

## Development UIs

After `just up`:

| UI | URL | Purpose |
|----|-----|---------|
| Tilt | http://localhost:10350 | Dev orchestration, logs, health |
| Temporal | http://localhost:8080 | Workflow debugging |
| Convex Dashboard | http://localhost:6791 | Data browser, function logs |

## Adding a New Service

1. Create directory: `mkdir infra/services/my-service`

2. Create Tiltfile:
```python
# infra/services/my-service/Tiltfile
load('../../lib/Tiltfile', 'nebula_service')

nebula_service(
    name='my-service',
    image='nebula-registry:5000/my-service',
    dockerfile='../../apps/my-service/Dockerfile',
    context='../..',
    k8s_yaml='./k8s.yaml',
    resource_deps=['convex-backend'],
    port_forwards=['3000:3000'],
)
```

3. Create k8s.yaml with deployment + service

4. Add to main Tiltfile:
```python
include('./services/my-service/Tiltfile')
```

## Convex Development

Convex generates `_generated/` files when running. Always run `just up` before type-checking convex package.

Schema lives in `packages/convex/convex/schema.ts`. Changes require `convex dev` restart (automatic via Tilt).

## Temporal Development

- Workflows: `apps/worker/src/workflows/`
- Activities: `apps/worker/src/activities/`
- Worker registers workflows and activities in `apps/worker/src/index.ts`

## Desktop Development

Desktop runs locally (not in k3d):
- Entry: `apps/desktop/src/main.tsx`
- Components: `apps/desktop/src/components/`
- Vite dev server: http://localhost:1420 (when running via Tilt)

## Troubleshooting

### Cluster won't start
```bash
just reset  # Full reset
just up     # Recreate
```

### Convex type errors
```bash
just up     # Ensure services running (generates _generated/)
just check  # Re-run type check
```

### Temporal workflow stuck
- Open Temporal UI: http://localhost:8080
- Find workflow, check history for errors
- Use "Terminate" if needed

### Container not rebuilding
- Check Tilt UI for build errors
- Trigger rebuild: click refresh in Tilt UI
- Force rebuild: `docker build` manually

# k3d + Tilt Development Environment

Replace Docker Compose with a proper k3d + Tilt setup for local development.

## Goals

- Single command to start everything: `tilt up`
- Proper health checks (no guessing)
- Easy environment reset
- Centralized logs via Tilt UI
- Live reload for code changes
- Easy to add new services

## Architecture

```
ctlptl (cluster management)
└── k3d cluster (nebula)
    └── local registry (nebula-registry:5000)
        └── Tilt (orchestration)
            ├── PostgreSQL (Temporal DB)
            ├── Temporal Server
            ├── Temporal UI
            ├── Convex Backend
            ├── Convex Dashboard
            ├── Nebula Worker
            └── Convex Dev (code push sidecar)

Local machine
└── Desktop App (Tauri - runs outside k8s)
```

## Services

| Service | Image | Health Check | Ports |
|---------|-------|--------------|-------|
| PostgreSQL | `postgres:16-alpine` | `pg_isready -U temporal` | 5432 |
| Temporal | `temporalio/auto-setup:1.25` | `tctl workflow list` | 7233, 7243 |
| Temporal UI | `temporalio/ui:latest` | HTTP `/` | 8080 |
| Convex Backend | `ghcr.io/get-convex/convex-backend:latest` | HTTP `/version` | 3210, 3211 |
| Convex Dashboard | `ghcr.io/get-convex/convex-dashboard:latest` | HTTP `/` | 6791 |
| Nebula Worker | `nebula-registry:5000/nebula-worker` | HTTP `/health` | 8081 |
| Convex Dev | Sidecar (runs `convex dev`) | Process running | - |
| Desktop App | Local (`pnpm tauri dev`) | - | 1420 |

## Dependency Graph

```
                    ┌─────────────┐
                    │  PostgreSQL │
                    └──────┬──────┘
                           │ healthy
                           ▼
                    ┌─────────────┐
                    │  Temporal   │
                    │   Server    │
                    └──────┬──────┘
                           │ healthy
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Temporal │ │  Nebula  │ │  Desktop │
        │    UI    │ │  Worker  │ │   App    │
        └──────────┘ └──────────┘ └──────────┘

        ┌─────────────┐
        │   Convex    │
        │   Backend   │
        └──────┬──────┘
               │ healthy
        ┌──────┴──────┐
        ▼             ▼
  ┌──────────┐  ┌──────────┐
  │  Convex  │  │  Convex  │
  │Dashboard │  │   Dev    │
  └──────────┘  └──────────┘
```

## File Structure

```
infra/
├── ctlptl.yaml                 # Cluster + registry definition
├── Tiltfile                    # Main entry point
├── lib/
│   └── Tiltfile                # Helper functions (nebula_service, etc.)
└── services/
    ├── postgres/
    │   ├── Tiltfile
    │   └── k8s.yaml
    ├── temporal/
    │   ├── Tiltfile
    │   ├── temporal.k8s.yaml
    │   └── temporal-ui.k8s.yaml
    ├── convex/
    │   ├── Tiltfile
    │   ├── backend.k8s.yaml
    │   ├── dashboard.k8s.yaml
    │   └── dev.k8s.yaml
    └── nebula-worker/
        ├── Tiltfile
        └── k8s.yaml

apps/worker/src/
├── index.ts
└── health.ts                   # New: health server module
```

## Commands

| Command | Description |
|---------|-------------|
| `tilt up` | Start everything (creates cluster if missing) |
| `tilt down` | Stop services (keeps cluster) |
| `just reset` | Full reset (delete cluster + registry) |

## Implementation Details

### ctlptl.yaml

```yaml
apiVersion: ctlptl.dev/v1alpha1
kind: Registry
name: nebula-registry
port: 5000
---
apiVersion: ctlptl.dev/v1alpha1
kind: Cluster
product: k3d
name: k3d-nebula
registry: nebula-registry
```

### Main Tiltfile

```python
# Ensure cluster exists
local('k3d cluster list | grep -q nebula || ctlptl apply -f infra/ctlptl.yaml')

allow_k8s_contexts('k3d-nebula')

# Load helpers
load('./lib/Tiltfile', 'nebula_service', 'infra_service', 'external_image')

# Infrastructure
include('./services/postgres/Tiltfile')
include('./services/temporal/Tiltfile')
include('./services/convex/Tiltfile')

# Application
include('./services/nebula-worker/Tiltfile')

# Desktop app (local, not in k8s)
local_resource(
    'desktop',
    serve_cmd='cd apps/desktop && pnpm tauri dev',
    deps=['apps/desktop/src'],
    labels=['app'],
    resource_deps=['convex-backend'],
)
```

### lib/Tiltfile (Helper Functions)

```python
def nebula_service(
    name,
    image=None,
    dockerfile=None,
    context=".",
    k8s_yaml=None,
    port_forwards=[],
    resource_deps=[],
    labels=[],
    live_update=[],
):
    """Standard Nebula service definition."""

    if dockerfile:
        docker_build(
            image,
            context,
            dockerfile=dockerfile,
            live_update=live_update,
        )

    if k8s_yaml:
        k8s_yaml(k8s_yaml)

    k8s_resource(
        name,
        port_forwards=port_forwards,
        resource_deps=resource_deps,
        labels=labels or ['app'],
    )

    return name


def infra_service(name, **kwargs):
    """Convenience wrapper for infrastructure services."""
    kwargs.setdefault('labels', ['infra'])
    return nebula_service(name, **kwargs)


def external_image(name, k8s_yaml, **kwargs):
    """For services using pre-built images (postgres, temporal, etc.)."""
    kwargs['image'] = None
    kwargs['dockerfile'] = None
    kwargs['k8s_yaml'] = k8s_yaml
    return nebula_service(name, **kwargs)
```

### Worker Health Server

```typescript
// apps/worker/src/health.ts

import { createServer } from 'node:http'

export function createHealthServer(port: number) {
  let isReady = false

  const server = createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      const code = isReady ? 200 : 503
      res.writeHead(code, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: isReady ? 'ok' : 'starting' }))
    } else {
      res.writeHead(404)
      res.end()
    }
  })

  server.listen(port, () => {
    console.log(`  Health endpoint: http://localhost:${port}/health`)
  })

  return {
    ready: () => { isReady = true },
    close: () => server.close(),
  }
}
```

```typescript
// apps/worker/src/index.ts (updated)

import { createHealthServer } from './health'

async function run() {
  const health = createHealthServer(parseInt(process.env.HEALTH_PORT || '8080'))

  // ... connect to Temporal ...

  health.ready()

  // ... in shutdown handler ...
  health.close()
}
```

### Updated justfile

```just
# Start everything
up:
    tilt up

# Stop services
down:
    tilt down

# Full reset
reset:
    tilt down || true
    ctlptl delete -f infra/ctlptl.yaml || true

# Type-check all packages
check:
    pnpm turbo check

# Lint all packages
lint:
    pnpm turbo lint

# Run all tests
test:
    pnpm turbo test

# Build all packages
build:
    pnpm turbo build

# Build desktop app for production
desktop-build:
    cd apps/desktop && pnpm tauri build
```

## Tools Required

```bash
brew install k3d tilt tilt-dev/tap/ctlptl k9s
```

| Tool | Purpose |
|------|---------|
| k3d | k3s in Docker - fast cluster create/delete |
| Tilt | Dev orchestration, logs, live reload |
| ctlptl | Declarative cluster + registry setup |
| k9s | Terminal UI for k8s (optional but recommended) |

## Exposed UIs

| UI | URL | Purpose |
|----|-----|---------|
| Tilt | http://localhost:10350 | Dev orchestration, logs, health |
| Temporal | http://localhost:8080 | Workflow debugging |
| Convex Dashboard | http://localhost:6791 | Data browser, function logs |

## Adding a New Service

1. Create directory:
   ```bash
   mkdir infra/services/my-service
   ```

2. Create `infra/services/my-service/Tiltfile`:
   ```python
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

3. Create `infra/services/my-service/k8s.yaml` with deployment + service

4. Add to main Tiltfile:
   ```python
   include('./services/my-service/Tiltfile')
   ```

## References

- [Tilt docs](https://docs.tilt.dev/)
- [k3d docs](https://k3d.io/)
- [ctlptl](https://github.com/tilt-dev/ctlptl)
- [Convex self-hosting](https://docs.convex.dev/self-hosting)
- [Temporal docker-compose](https://github.com/temporalio/docker-compose)

# cdk8s Infrastructure Design

## Overview

Replace raw K8s YAML manifests with TypeScript using cdk8s. One source of truth for K8s resources and Tilt configuration.

## Goals (in priority order)

1. **Minimal boilerplate** - one-liner for standard services
2. **Type-safe configuration** - catch mistakes at compile time
3. **Consistency enforcement** - all services get standard health probes, labels, env
4. **Composable** - DRY up patterns when they emerge

## Repo Structure

```
apps/
  nebula-worker/
    src/                    # your code
    package.json
    deploy/
      Dockerfile
      manifest.ts

  nebula-desktop/
    src/
    src-tauri/
    deploy/
      manifest.ts           # localApp - runs outside k8s

  temporal/
    deploy/
      manifest.ts           # third-party images

  grafana/
    deploy/
      manifest.ts
      datasources.yaml      # config files live alongside
      dashboards/

infra/
  lib/
    index.ts                # exports app(), setupScript(), localApp()
    types.ts                # AppConfig types
  config/
    temporal.ts             # shared env configs
    convex.ts
  dist/                     # generated output
    *.yaml
    Tiltfile.generated
```

## Core Abstractions

### `app()` - K8s Deployable

```typescript
type AppConfig = {
  // Image source - exactly one required (validated)
  dockerfile?: string      // build locally
  image?: string           // pull from registry

  // Build options (only with dockerfile)
  buildTarget?: string     // e.g., 'development'
  liveUpdate?: string[]    // paths to sync for hot reload

  // Config
  env?: Record<string, string>
  configFiles?: Record<string, string>  // mountPath -> local file

  // Exposure
  ingress?: boolean        // expose externally (default: false)
  portForwards?: string[]  // dev access, e.g., ['3000', '9090:9090']

  // Storage
  storage?: {
    path: string           // mount path in container
    size: string           // e.g., '1Gi'
  }

  // Metadata
  labels?: string[]        // Tilt grouping + k8s labels
  resourceDeps?: string[]  // must start after these
}
```

### `setupScript()` - Post-Deploy Commands

```typescript
type SetupScriptConfig = {
  cmd: string              // command to run
  cwd?: string             // working directory
  resourceDeps?: string[]  // wait for these first
  labels?: string[]
}
```

### `localApp()` - Runs Outside K8s

```typescript
type LocalAppConfig = {
  cmd: string              // serve command
  cwd?: string             // working directory
  resourceDeps?: string[]  // wait for these first
  labels?: string[]
}
```

## Enforced Standards

Not configurable - applied to all apps:

| Standard | Value |
|----------|-------|
| Health endpoint | `:8080/health` |
| Readiness probe | 10s initial, 5s period |
| Liveness probe | 15s initial, 10s period |
| Labels | `app: <name>`, `team: nebula` |
| Env | `ENVIRONMENT: 'dev'` |

## Shared Config Objects

```typescript
// infra/config/temporal.ts
export const temporalConfig = {
  TEMPORAL_ADDRESS: 'temporal:7233',
  TEMPORAL_NAMESPACE: 'default',
}

// infra/config/convex.ts
export const convexConfig = {
  CONVEX_URL: 'http://convex-backend:3210',
}
```

## Manifest Examples

### Built Service (nebula-worker)

```typescript
// apps/nebula-worker/deploy/manifest.ts
import { app } from '@nebula/infra'
import { temporalConfig } from '@nebula/infra/config'

export default app('nebula-worker', {
  dockerfile: './Dockerfile',
  buildTarget: 'development',
  liveUpdate: ['./src', '../../packages/shared/src'],
  env: {
    ...temporalConfig,
    TASK_QUEUE: 'default',
  },
  labels: ['nebula'],
  portForwards: ['8081:8080'],
  resourceDeps: ['temporal'],
})
```

### Pre-built Service (grafana)

```typescript
// apps/grafana/deploy/manifest.ts
import { app } from '@nebula/infra'

export default app('grafana', {
  image: 'grafana/grafana:11',
  ingress: true,
  labels: ['observability'],
  portForwards: ['3001:3000'],
  storage: { path: '/var/lib/grafana', size: '1Gi' },
  configFiles: {
    '/etc/grafana/provisioning/datasources': './datasources.yaml',
    '/etc/grafana/provisioning/dashboards': './dashboards/',
  },
})
```

### Multi-Component Service (convex)

```typescript
// apps/convex/deploy/manifest.ts
import { app, setupScript } from '@nebula/infra'

export default [
  app('convex-backend', {
    image: 'ghcr.io/get-convex/convex-backend:latest',
    portForwards: ['3210', '3211'],
    labels: ['convex'],
    storage: { path: '/convex/data', size: '1Gi' },
  }),

  app('convex-dashboard', {
    image: 'ghcr.io/get-convex/convex-dashboard:latest',
    portForwards: ['6791'],
    resourceDeps: ['convex-backend'],
    labels: ['convex'],
  }),

  setupScript('convex-auth-setup', {
    cmd: 'cd packages/convex && npx convex env set BETTER_AUTH_SECRET "dev-secret-do-not-use-in-production"',
    resourceDeps: ['convex-backend'],
    labels: ['convex'],
  }),
]
```

### Local App (nebula-desktop)

```typescript
// apps/nebula-desktop/deploy/manifest.ts
import { localApp } from '@nebula/infra'

export default localApp('nebula-desktop', {
  cmd: 'pnpm tauri dev',
  labels: ['nebula'],
  resourceDeps: ['convex-backend', 'nebula-worker'],
})
```

## Generation

### Commands

| Command | Description |
|---------|-------------|
| `just synth` | Generate K8s YAML + Tiltfile from manifest.ts files |
| `just up` | Run synth, then tilt up |

### Output

```
infra/dist/
  nebula-worker.yaml      # K8s Deployment + Service
  convex-backend.yaml     # includes PVC
  grafana.yaml            # includes ConfigMap
  Tiltfile.generated      # all docker_build + k8s_resource calls
```

### Tiltfile Integration

```python
# infra/Tiltfile
load_dynamic('./dist/Tiltfile.generated')

# Manual overrides if ever needed
```

## Generated K8s Resources

### From `app()` with `dockerfile`

- Deployment (with health probes, env, labels)
- Service (ClusterIP)

### From `app()` with `image`

- Deployment
- Service
- ConfigMap (if configFiles specified)
- PersistentVolumeClaim (if storage specified)

### From `setupScript()`

- Generates `local_resource` in Tiltfile

### From `localApp()`

- Generates `local_resource` in Tiltfile with `serve_cmd`

## Open Work

- `NEBULA-9lt`: Add staging/production environment support (currently hardcoded to 'dev')

## Migration Path

1. Implement `infra/lib/` with types and generator
2. Create `apps/nebula-worker/deploy/manifest.ts` first (simplest)
3. Verify generated YAML matches current
4. Migrate remaining services one by one
5. Delete old `infra/services/` YAML files

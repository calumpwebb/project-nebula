# cdk8s Infrastructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace raw K8s YAML with TypeScript using cdk8s, generating K8s manifests and Tiltfile from `apps/*/deploy/manifest.ts` files.

**Architecture:** Each app defines its deployment in `manifest.ts` using `app()`, `setupScript()`, or `localApp()`. A generator discovers all manifests, synthesizes K8s YAML and a Tiltfile, outputs to `infra/dist/`.

**Tech Stack:** TypeScript, cdk8s, ts-node/tsx for generation

**Design Doc:** `docs/plans/2025-12-29-cdk8s-infra-design.md`

---

## Wave 1: Foundation (No Dependencies - Parallel)

### Task 1.1: Create TypeScript Types

**Files:**
- Create: `infra/lib/types.ts`

**Step 1: Create the types file**

```typescript
// infra/lib/types.ts

/** Storage configuration for persistent volumes */
export interface StorageConfig {
  /** Mount path in container */
  path: string
  /** Size (e.g., '1Gi', '10Gi') */
  size: string
}

/** Base configuration shared by all resource types */
interface BaseConfig {
  /** Tilt grouping + k8s labels */
  labels?: string[]
  /** Must start after these resources */
  resourceDeps?: string[]
}

/** App built from local Dockerfile */
export interface DockerfileAppConfig extends BaseConfig {
  /** Path to Dockerfile relative to deploy/ */
  dockerfile: string
  image?: never
  /** Docker build target (e.g., 'development') */
  buildTarget?: string
  /** Paths to sync for hot reload */
  liveUpdate?: string[]
  /** Environment variables */
  env?: Record<string, string>
  /** Config files to mount: { mountPath: localPath } */
  configFiles?: Record<string, string>
  /** Expose via ingress */
  ingress?: boolean
  /** Port forwards for dev access */
  portForwards?: string[]
  /** Persistent storage */
  storage?: StorageConfig
}

/** App using pre-built image */
export interface ImageAppConfig extends BaseConfig {
  /** Container image (e.g., 'grafana/grafana:11') */
  image: string
  dockerfile?: never
  buildTarget?: never
  liveUpdate?: never
  /** Environment variables */
  env?: Record<string, string>
  /** Config files to mount: { mountPath: localPath } */
  configFiles?: Record<string, string>
  /** Expose via ingress */
  ingress?: boolean
  /** Port forwards for dev access */
  portForwards?: string[]
  /** Persistent storage */
  storage?: StorageConfig
}

/** Configuration for app() - must have either dockerfile or image */
export type AppConfig = DockerfileAppConfig | ImageAppConfig

/** Configuration for setupScript() */
export interface SetupScriptConfig extends BaseConfig {
  /** Command to run */
  cmd: string
  /** Working directory */
  cwd?: string
}

/** Configuration for localApp() */
export interface LocalAppConfig extends BaseConfig {
  /** Serve command */
  cmd: string
  /** Working directory */
  cwd?: string
}

/** Resolved app definition with name */
export interface AppDefinition {
  type: 'app'
  name: string
  config: AppConfig
}

/** Resolved setup script definition */
export interface SetupScriptDefinition {
  type: 'setupScript'
  name: string
  config: SetupScriptConfig
}

/** Resolved local app definition */
export interface LocalAppDefinition {
  type: 'localApp'
  name: string
  config: LocalAppConfig
}

/** Any manifest definition */
export type ManifestDefinition = AppDefinition | SetupScriptDefinition | LocalAppDefinition
```

**Step 2: Commit**

```bash
git add infra/lib/types.ts
git commit -m "feat(infra): add cdk8s type definitions"
```

---

### Task 1.2: Create Shared Config Objects

**Files:**
- Create: `infra/config/temporal.ts`
- Create: `infra/config/convex.ts`
- Create: `infra/config/index.ts`

**Step 1: Create temporal config**

```typescript
// infra/config/temporal.ts

export const temporalConfig = {
  TEMPORAL_ADDRESS: 'temporal:7233',
  TEMPORAL_NAMESPACE: 'default',
}
```

**Step 2: Create convex config**

```typescript
// infra/config/convex.ts

export const convexConfig = {
  CONVEX_URL: 'http://convex-backend:3210',
}
```

**Step 3: Create index export**

```typescript
// infra/config/index.ts

export { temporalConfig } from './temporal'
export { convexConfig } from './convex'
```

**Step 4: Commit**

```bash
git add infra/config/
git commit -m "feat(infra): add shared config objects"
```

---

### Task 1.3: Add Package Configuration

**Files:**
- Create: `infra/package.json`
- Create: `infra/tsconfig.json`

**Step 1: Create package.json**

```json
{
  "name": "@nebula/infra",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "synth": "tsx lib/generate.ts",
    "check": "tsc --noEmit"
  },
  "dependencies": {
    "cdk8s": "^2.68.0",
    "cdk8s-plus-27": "^2.9.0",
    "constructs": "^10.3.0",
    "glob": "^10.3.0"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": ".",
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["lib/**/*", "config/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Install dependencies**

```bash
cd infra && pnpm install
```

**Step 4: Commit**

```bash
git add infra/package.json infra/tsconfig.json pnpm-lock.yaml
git commit -m "feat(infra): add package configuration for cdk8s"
```

---

## Wave 2: Core Functions (Needs Wave 1)

### Task 2.1: Create Builder Functions

**Files:**
- Create: `infra/lib/builders.ts`
- Create: `infra/lib/index.ts`

**Step 1: Create builder functions**

```typescript
// infra/lib/builders.ts

import type {
  AppConfig,
  AppDefinition,
  SetupScriptConfig,
  SetupScriptDefinition,
  LocalAppConfig,
  LocalAppDefinition,
} from './types'

/**
 * Define a K8s deployable app.
 * Must specify either `dockerfile` (build locally) or `image` (pre-built).
 */
export function app(name: string, config: AppConfig): AppDefinition {
  // Validate: must have exactly one of dockerfile or image
  const hasDockerfile = 'dockerfile' in config && config.dockerfile
  const hasImage = 'image' in config && config.image

  if (!hasDockerfile && !hasImage) {
    throw new Error(`App "${name}": must specify either 'dockerfile' or 'image'`)
  }
  if (hasDockerfile && hasImage) {
    throw new Error(`App "${name}": cannot specify both 'dockerfile' and 'image'`)
  }

  return {
    type: 'app',
    name,
    config,
  }
}

/**
 * Define a post-deploy setup script (runs as Tilt local_resource).
 */
export function setupScript(name: string, config: SetupScriptConfig): SetupScriptDefinition {
  if (!config.cmd) {
    throw new Error(`SetupScript "${name}": must specify 'cmd'`)
  }

  return {
    type: 'setupScript',
    name,
    config,
  }
}

/**
 * Define a local app that runs outside K8s (e.g., desktop app).
 */
export function localApp(name: string, config: LocalAppConfig): LocalAppDefinition {
  if (!config.cmd) {
    throw new Error(`LocalApp "${name}": must specify 'cmd'`)
  }

  return {
    type: 'localApp',
    name,
    config,
  }
}
```

**Step 2: Create index export**

```typescript
// infra/lib/index.ts

export { app, setupScript, localApp } from './builders'
export type {
  AppConfig,
  DockerfileAppConfig,
  ImageAppConfig,
  SetupScriptConfig,
  LocalAppConfig,
  StorageConfig,
  ManifestDefinition,
} from './types'
```

**Step 3: Commit**

```bash
git add infra/lib/builders.ts infra/lib/index.ts
git commit -m "feat(infra): add app(), setupScript(), localApp() builders"
```

---

### Task 2.2: Create K8s Generator

**Files:**
- Create: `infra/lib/k8s.ts`

**Step 1: Create K8s resource generator**

```typescript
// infra/lib/k8s.ts

import { App, Chart } from 'cdk8s'
import { KubeDeployment, KubeService, KubeConfigMap, KubePersistentVolumeClaim } from 'cdk8s-plus-27/lib/imports/k8s'
import type { AppDefinition } from './types'
import * as fs from 'fs'
import * as path from 'path'

/** Standard config enforced on all apps */
const STANDARDS = {
  healthPort: 8080,
  healthPath: '/health',
  readinessInitialDelay: 10,
  readinessPeriod: 5,
  livenessInitialDelay: 15,
  livenessPeriod: 10,
  team: 'nebula',
  // TODO(NEBULA-9lt): Add staging/production support
  environment: 'dev',
}

export function generateK8sResources(
  app: typeof App,
  definition: AppDefinition,
  manifestDir: string
): Chart {
  const { name, config } = definition
  const chart = new Chart(app, name)

  const labels = {
    app: name,
    team: STANDARDS.team,
    ...(config.labels?.reduce((acc, l) => ({ ...acc, [l]: 'true' }), {}) || {}),
  }

  // Inject standard env vars
  const env = {
    ENVIRONMENT: STANDARDS.environment,
    ...config.env,
  }

  // Create PVC if storage specified
  let volumeName: string | undefined
  if (config.storage) {
    new KubePersistentVolumeClaim(chart, `${name}-pvc`, {
      metadata: { name: `${name}-pvc`, labels },
      spec: {
        accessModes: ['ReadWriteOnce'],
        resources: { requests: { storage: config.storage.size } },
      },
    })
    volumeName = `${name}-data`
  }

  // Create ConfigMap if configFiles specified
  let configMapName: string | undefined
  if (config.configFiles) {
    const data: Record<string, string> = {}
    for (const [mountPath, localPath] of Object.entries(config.configFiles)) {
      const fullPath = path.resolve(manifestDir, localPath)
      const fileName = path.basename(localPath)
      if (fs.existsSync(fullPath)) {
        data[fileName] = fs.readFileSync(fullPath, 'utf-8')
      }
    }
    if (Object.keys(data).length > 0) {
      new KubeConfigMap(chart, `${name}-config`, {
        metadata: { name: `${name}-config`, labels },
        data,
      })
      configMapName = `${name}-config`
    }
  }

  // Determine image
  const image = 'image' in config && config.image ? config.image : name

  // Build volume mounts
  const volumeMounts: Array<{ name: string; mountPath: string; subPath?: string }> = []
  const volumes: Array<{ name: string; persistentVolumeClaim?: { claimName: string }; configMap?: { name: string } }> = []

  if (config.storage && volumeName) {
    volumeMounts.push({ name: volumeName, mountPath: config.storage.path })
    volumes.push({ name: volumeName, persistentVolumeClaim: { claimName: `${name}-pvc` } })
  }

  if (configMapName && config.configFiles) {
    const configVolName = `${name}-config-vol`
    volumes.push({ name: configVolName, configMap: { name: configMapName } })
    for (const [mountPath, localPath] of Object.entries(config.configFiles)) {
      const fileName = path.basename(localPath)
      volumeMounts.push({ name: configVolName, mountPath, subPath: fileName })
    }
  }

  // Create Deployment
  new KubeDeployment(chart, `${name}-deployment`, {
    metadata: { name, labels },
    spec: {
      replicas: 1,
      selector: { matchLabels: { app: name } },
      template: {
        metadata: { labels: { app: name } },
        spec: {
          containers: [{
            name,
            image,
            ports: [{ containerPort: STANDARDS.healthPort, name: 'health' }],
            env: Object.entries(env).map(([name, value]) => ({ name, value: String(value) })),
            readinessProbe: {
              httpGet: { path: STANDARDS.healthPath, port: STANDARDS.healthPort },
              initialDelaySeconds: STANDARDS.readinessInitialDelay,
              periodSeconds: STANDARDS.readinessPeriod,
            },
            livenessProbe: {
              httpGet: { path: STANDARDS.healthPath, port: STANDARDS.healthPort },
              initialDelaySeconds: STANDARDS.livenessInitialDelay,
              periodSeconds: STANDARDS.livenessPeriod,
            },
            ...(volumeMounts.length > 0 ? { volumeMounts } : {}),
          }],
          ...(volumes.length > 0 ? { volumes } : {}),
        },
      },
    },
  })

  // Create Service
  new KubeService(chart, `${name}-service`, {
    metadata: { name, labels },
    spec: {
      selector: { app: name },
      ports: [{ port: STANDARDS.healthPort, targetPort: STANDARDS.healthPort }],
    },
  })

  return chart
}
```

**Step 2: Commit**

```bash
git add infra/lib/k8s.ts
git commit -m "feat(infra): add K8s resource generator"
```

---

### Task 2.3: Create Tiltfile Generator

**Files:**
- Create: `infra/lib/tiltfile.ts`

**Step 1: Create Tiltfile generator**

```typescript
// infra/lib/tiltfile.ts

import type { ManifestDefinition, AppDefinition, SetupScriptDefinition, LocalAppDefinition } from './types'
import * as path from 'path'

export function generateTiltfile(
  definitions: ManifestDefinition[],
  appDirs: Map<string, string>
): string {
  const lines: string[] = [
    '# Generated by @nebula/infra - do not edit manually',
    '# Run `just synth` to regenerate',
    '',
    "allow_k8s_contexts('k3d-nebula')",
    '',
    "default_registry('nebula-registry:5000')",
    '',
  ]

  for (const def of definitions) {
    const appDir = appDirs.get(def.name)
    if (!appDir) continue

    switch (def.type) {
      case 'app':
        lines.push(...generateAppTilt(def, appDir))
        break
      case 'setupScript':
        lines.push(...generateSetupScriptTilt(def))
        break
      case 'localApp':
        lines.push(...generateLocalAppTilt(def, appDir))
        break
    }
    lines.push('')
  }

  return lines.join('\n')
}

function generateAppTilt(def: AppDefinition, appDir: string): string[] {
  const { name, config } = def
  const lines: string[] = []

  // Docker build for dockerfile apps
  if ('dockerfile' in config && config.dockerfile) {
    const dockerfilePath = path.join(appDir, 'deploy', config.dockerfile)
    const contextPath = path.dirname(path.dirname(appDir)) // project root

    let dockerBuild = `docker_build(\n  '${name}',\n  '${contextPath}',\n  dockerfile='${dockerfilePath}'`

    if (config.buildTarget) {
      dockerBuild += `,\n  target='${config.buildTarget}'`
    }

    if (config.liveUpdate && config.liveUpdate.length > 0) {
      const syncs = config.liveUpdate.map(p => {
        const fullPath = path.resolve(appDir, p)
        return `    sync('${fullPath}', '${p}')`
      }).join(',\n')
      dockerBuild += `,\n  live_update=[\n${syncs}\n  ]`
    }

    dockerBuild += '\n)'
    lines.push(dockerBuild)
  }

  // K8s YAML
  lines.push(`k8s_yaml('dist/${name}.yaml')`)

  // K8s resource config
  const resourceParts: string[] = [`  '${name}'`]

  if (config.portForwards && config.portForwards.length > 0) {
    const forwards = config.portForwards.map(p => `'${p}'`).join(', ')
    resourceParts.push(`  port_forwards=[${forwards}]`)
  }

  if (config.resourceDeps && config.resourceDeps.length > 0) {
    const deps = config.resourceDeps.map(d => `'${d}'`).join(', ')
    resourceParts.push(`  resource_deps=[${deps}]`)
  }

  if (config.labels && config.labels.length > 0) {
    const labels = config.labels.map(l => `'${l}'`).join(', ')
    resourceParts.push(`  labels=[${labels}]`)
  }

  lines.push(`k8s_resource(\n${resourceParts.join(',\n')}\n)`)

  return lines
}

function generateSetupScriptTilt(def: SetupScriptDefinition): string[] {
  const { name, config } = def
  const parts: string[] = [`  '${name}'`]

  parts.push(`  cmd='${config.cmd}'`)

  if (config.resourceDeps && config.resourceDeps.length > 0) {
    const deps = config.resourceDeps.map(d => `'${d}'`).join(', ')
    parts.push(`  resource_deps=[${deps}]`)
  }

  if (config.labels && config.labels.length > 0) {
    const labels = config.labels.map(l => `'${l}'`).join(', ')
    parts.push(`  labels=[${labels}]`)
  }

  parts.push('  allow_parallel=True')

  return [`local_resource(\n${parts.join(',\n')}\n)`]
}

function generateLocalAppTilt(def: LocalAppDefinition, appDir: string): string[] {
  const { name, config } = def
  const parts: string[] = [`  '${name}'`]

  parts.push(`  serve_cmd='${config.cmd}'`)
  parts.push(`  serve_dir='${appDir}'`)

  if (config.resourceDeps && config.resourceDeps.length > 0) {
    const deps = config.resourceDeps.map(d => `'${d}'`).join(', ')
    parts.push(`  resource_deps=[${deps}]`)
  }

  if (config.labels && config.labels.length > 0) {
    const labels = config.labels.map(l => `'${l}'`).join(', ')
    parts.push(`  labels=[${labels}]`)
  }

  return [`local_resource(\n${parts.join(',\n')}\n)`]
}
```

**Step 2: Commit**

```bash
git add infra/lib/tiltfile.ts
git commit -m "feat(infra): add Tiltfile generator"
```

---

### Task 2.4: Create Main Generator

**Files:**
- Create: `infra/lib/generate.ts`

**Step 1: Create main generator script**

```typescript
// infra/lib/generate.ts

import { App } from 'cdk8s'
import { glob } from 'glob'
import * as fs from 'fs'
import * as path from 'path'
import { generateK8sResources } from './k8s'
import { generateTiltfile } from './tiltfile'
import type { ManifestDefinition } from './types'

const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..')
const APPS_DIR = path.join(PROJECT_ROOT, 'apps')
const DIST_DIR = path.join(PROJECT_ROOT, 'infra/dist')

async function main() {
  console.log('🔍 Discovering manifests...')

  // Find all manifest.ts files
  const manifestFiles = await glob('*/deploy/manifest.ts', { cwd: APPS_DIR })
  console.log(`   Found ${manifestFiles.length} manifests`)

  // Ensure dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true })
  }

  const allDefinitions: ManifestDefinition[] = []
  const appDirs = new Map<string, string>()

  // Load and process each manifest
  for (const file of manifestFiles) {
    const appName = path.dirname(path.dirname(file))
    const appDir = path.join(APPS_DIR, appName)
    const manifestPath = path.join(APPS_DIR, file)

    console.log(`📦 Processing ${appName}...`)

    // Dynamic import of manifest
    const module = await import(manifestPath)
    const exports = module.default

    // Handle array of definitions or single definition
    const definitions: ManifestDefinition[] = Array.isArray(exports) ? exports : [exports]

    for (const def of definitions) {
      allDefinitions.push(def)
      appDirs.set(def.name, appDir)

      // Generate K8s YAML for app definitions
      if (def.type === 'app') {
        console.log(`   ⚙️  Generating K8s resources for ${def.name}`)
        const app = new App({ outdir: DIST_DIR })
        const chart = generateK8sResources(app, def, path.join(appDir, 'deploy'))
        app.synth()

        // cdk8s outputs to a folder, we want flat files
        const chartDir = path.join(DIST_DIR, def.name)
        if (fs.existsSync(chartDir)) {
          const files = fs.readdirSync(chartDir)
          for (const f of files) {
            const content = fs.readFileSync(path.join(chartDir, f), 'utf-8')
            fs.writeFileSync(path.join(DIST_DIR, `${def.name}.yaml`), content)
          }
          fs.rmSync(chartDir, { recursive: true })
        }
      }
    }
  }

  // Generate Tiltfile
  console.log('📝 Generating Tiltfile...')
  const tiltfile = generateTiltfile(allDefinitions, appDirs)
  fs.writeFileSync(path.join(DIST_DIR, 'Tiltfile.generated'), tiltfile)

  console.log('✅ Done!')
  console.log(`   Output: ${DIST_DIR}`)
}

main().catch(console.error)
```

**Step 2: Commit**

```bash
git add infra/lib/generate.ts
git commit -m "feat(infra): add main generator script"
```

---

### Task 2.5: Add Just Command

**Files:**
- Modify: `justfile`

**Step 1: Find and read justfile**

```bash
cat justfile
```

**Step 2: Add synth command to justfile**

Add after other commands:
```just
# Synthesize infrastructure (K8s YAML + Tiltfile)
synth:
    cd infra && pnpm synth
```

**Step 3: Commit**

```bash
git add justfile
git commit -m "feat(infra): add 'just synth' command"
```

---

## Wave 3: First Migration (Needs Wave 2)

### Task 3.1: Migrate nebula-worker

**Files:**
- Create: `apps/worker/deploy/manifest.ts`

**Step 1: Create manifest.ts**

```typescript
// apps/worker/deploy/manifest.ts

import { app } from '@nebula/infra'
import { temporalConfig } from '@nebula/infra/config'

export default app('nebula-worker', {
  dockerfile: './Dockerfile',
  buildTarget: 'development',
  liveUpdate: ['./src', '../../packages/shared/src'],
  env: {
    ...temporalConfig,
    TASK_QUEUE: 'default',
    HEALTH_PORT: '8080',
  },
  labels: ['nebula'],
  portForwards: ['8081:8080'],
  resourceDeps: ['temporal'],
})
```

**Step 2: Run synth and verify output**

```bash
just synth
cat infra/dist/nebula-worker.yaml
```

**Step 3: Compare with existing manifest**

```bash
diff infra/services/nebula-worker/k8s.yaml infra/dist/nebula-worker.yaml
```

Review differences - should be structurally equivalent.

**Step 4: Commit**

```bash
git add apps/worker/deploy/manifest.ts
git commit -m "feat(infra): migrate nebula-worker to cdk8s manifest"
```

---

### Task 3.2: Update Main Tiltfile

**Files:**
- Modify: `infra/Tiltfile`

**Step 1: Update Tiltfile to load generated config**

Replace contents with:

```python
# Ensure cluster exists before doing anything
local('k3d cluster list | grep -q nebula || ctlptl apply -f ctlptl.yaml')

allow_k8s_contexts('k3d-nebula')

# Load generated Tiltfile (from `just synth`)
load_dynamic('./dist/Tiltfile.generated')
```

**Step 2: Commit**

```bash
git add infra/Tiltfile
git commit -m "feat(infra): update Tiltfile to use generated config"
```

---

## Wave 4: Remaining Migrations (Needs Wave 3)

### Task 4.1: Migrate Temporal

**Files:**
- Create: `apps/temporal/deploy/manifest.ts`

**Step 1: Create manifest.ts**

```typescript
// apps/temporal/deploy/manifest.ts

import { app } from '@nebula/infra'

export default [
  app('temporal-db', {
    image: 'postgres:15',
    labels: ['temporal'],
    portForwards: ['5432'],
    storage: { path: '/var/lib/postgresql/data', size: '1Gi' },
    env: {
      POSTGRES_USER: 'temporal',
      POSTGRES_PASSWORD: 'temporal',
      POSTGRES_DB: 'temporal',
    },
  }),

  app('temporal', {
    image: 'temporalio/auto-setup:latest',
    labels: ['temporal'],
    portForwards: ['7233', '7243'],
    resourceDeps: ['temporal-db'],
    env: {
      DB: 'postgresql',
      DB_PORT: '5432',
      POSTGRES_USER: 'temporal',
      POSTGRES_PWD: 'temporal',
      POSTGRES_SEEDS: 'temporal-db',
    },
  }),

  app('temporal-ui', {
    image: 'temporalio/ui:latest',
    labels: ['temporal'],
    portForwards: ['8080'],
    resourceDeps: ['temporal'],
    env: {
      TEMPORAL_ADDRESS: 'temporal:7233',
    },
  }),
]
```

**Step 2: Commit**

```bash
mkdir -p apps/temporal/deploy
git add apps/temporal/deploy/manifest.ts
git commit -m "feat(infra): migrate temporal to cdk8s manifest"
```

---

### Task 4.2: Migrate Convex

**Files:**
- Create: `apps/convex/deploy/manifest.ts`

**Step 1: Create manifest.ts**

```typescript
// apps/convex/deploy/manifest.ts

import { app, setupScript } from '@nebula/infra'

export default [
  app('convex-backend', {
    image: 'ghcr.io/get-convex/convex-backend:latest',
    labels: ['convex'],
    portForwards: ['3210', '3211'],
    storage: { path: '/convex/data', size: '1Gi' },
    env: {
      DISABLE_BEACON: 'true',
    },
  }),

  app('convex-dashboard', {
    image: 'ghcr.io/get-convex/convex-dashboard:latest',
    labels: ['convex'],
    portForwards: ['6791'],
    resourceDeps: ['convex-backend'],
  }),

  setupScript('convex-auth-setup', {
    cmd: 'cd packages/convex && npx convex env set BETTER_AUTH_SECRET "dev-secret-do-not-use-in-production-1234567890"',
    resourceDeps: ['convex-backend'],
    labels: ['convex'],
  }),
]
```

**Step 2: Commit**

```bash
mkdir -p apps/convex/deploy
git add apps/convex/deploy/manifest.ts
git commit -m "feat(infra): migrate convex to cdk8s manifest"
```

---

### Task 4.3: Migrate Desktop (localApp)

**Files:**
- Create: `apps/desktop/deploy/manifest.ts`

**Step 1: Create manifest.ts**

```typescript
// apps/desktop/deploy/manifest.ts

import { localApp } from '@nebula/infra'

export default localApp('nebula-desktop', {
  cmd: 'pnpm tauri dev',
  labels: ['nebula'],
  resourceDeps: ['convex-backend', 'nebula-worker'],
})
```

**Step 2: Commit**

```bash
mkdir -p apps/desktop/deploy
git add apps/desktop/deploy/manifest.ts
git commit -m "feat(infra): migrate nebula-desktop to cdk8s manifest"
```

---

## Wave 5: Cleanup & Verification

### Task 5.1: Run Full Synth and Test

**Step 1: Generate all resources**

```bash
just synth
```

**Step 2: Verify generated files**

```bash
ls -la infra/dist/
cat infra/dist/Tiltfile.generated
```

**Step 3: Start the stack**

```bash
just up
```

**Step 4: Verify all services come up in Tilt UI**

Open http://localhost:10350 and verify:
- All resources show green
- Port forwards work
- Labels are applied correctly

---

### Task 5.2: Remove Old Manifests

**Files:**
- Delete: `infra/services/` directory

**Step 1: Remove old service definitions**

```bash
rm -rf infra/services/
```

**Step 2: Remove old lib Tiltfile**

```bash
rm infra/lib/Tiltfile
```

**Step 3: Commit cleanup**

```bash
git add -A
git commit -m "chore(infra): remove old YAML manifests and Tiltfiles"
```

---

### Task 5.3: Update Documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update structure section**

Update the Structure line to reflect new layout:
```
apps/<name>/deploy/manifest.ts, packages/convex, packages/shared, infra/lib
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update structure for cdk8s migration"
```

---

---

## Execution Summary

```
Wave 1 (no deps):     1.1, 1.2, 1.3 → 3 parallel agents
Wave 2 (needs wave 1): 2.1, 2.2, 2.3, 2.4, 2.5 → 2.1 first, then 2.2+2.3 parallel, then 2.4, then 2.5
Wave 3 (needs wave 2): 3.1, 3.2 → sequential (verify before continuing)
Wave 4 (needs wave 3): 4.1, 4.2, 4.3 → 3 parallel agents
Wave 5 (needs wave 4): 5.1, 5.2, 5.3 → sequential (cleanup)
```

| Wave | Tasks | Agents | Notes |
|------|-------|--------|-------|
| 1 | Types, Configs, Package | 3 | All independent |
| 2 | Builders → K8s+Tilt gen → Main gen → Just | 1-2 | Some internal deps |
| 3 | Migrate worker, Update Tiltfile | 1 | Verify working before continuing |
| 4 | Migrate temporal, convex, desktop | 3 | All independent |
| 5 | Test, Cleanup, Docs | 1 | Sequential verification |

// infra/lib/types.ts

/** Storage configuration for persistent volumes */
export interface StorageConfig {
  /** Mount path in container */
  path: string
  /** Size (e.g., '1Gi', '10Gi') */
  size: string
}

/** HTTP probe configuration */
export interface HttpProbeConfig {
  type: 'http'
  /** HTTP path to probe (e.g., '/health') */
  path: string
  /** Port to probe */
  port: number
}

/** TCP probe configuration */
export interface TcpProbeConfig {
  type: 'tcp'
  /** Port to probe */
  port: number
}

/** Probe configuration - HTTP, TCP, or disabled */
export type ProbeConfig = HttpProbeConfig | TcpProbeConfig | false

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
  /** Health probe config (defaults to HTTP /health:8080) */
  probe?: ProbeConfig
}

/** Host path mount configuration */
export interface HostPathConfig {
  /** Path on the host */
  hostPath: string
  /** Mount path in container */
  mountPath: string
  /** Mount as read-only */
  readOnly?: boolean
}

/** App using pre-built image */
export interface ImageAppConfig extends BaseConfig {
  /** Container image (e.g., 'grafana/grafana:11') */
  image: string
  dockerfile?: never
  buildTarget?: never
  liveUpdate?: never
  /** Workload kind (default: 'deployment') */
  kind?: 'deployment' | 'daemonset'
  /** Environment variables */
  env?: Record<string, string>
  /** Container command args (appended to entrypoint) */
  args?: string[]
  /** Config files to mount: { mountPath: localPath } */
  configFiles?: Record<string, string>
  /** Host paths to mount (for daemonsets) */
  hostPaths?: HostPathConfig[]
  /** Expose via ingress */
  ingress?: boolean
  /** Port forwards for dev access */
  portForwards?: string[]
  /** Persistent storage */
  storage?: StorageConfig
  /** Health probe config (defaults to HTTP /health:8080) */
  probe?: ProbeConfig
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

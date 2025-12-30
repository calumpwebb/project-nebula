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

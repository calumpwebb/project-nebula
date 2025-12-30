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

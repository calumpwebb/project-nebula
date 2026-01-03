// infra/lib/k8s.ts

import { App, Chart } from 'cdk8s'
import {
  KubeDeployment,
  KubeDaemonSet,
  KubeService,
  KubeConfigMap,
  KubePersistentVolumeClaim,
  IntOrString,
  Quantity,
} from 'cdk8s-plus-27/lib/imports/k8s'
import type { AppDefinition, ProbeConfig } from './types'
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

/** Build probe spec from config */
function buildProbe(probeConfig: ProbeConfig | undefined, initialDelay: number, period: number) {
  // Explicit false = no probe
  if (probeConfig === false) return undefined

  // Default to HTTP /health:8080
  const config = probeConfig ?? {
    type: 'http' as const,
    path: STANDARDS.healthPath,
    port: STANDARDS.healthPort,
  }

  if (config.type === 'tcp') {
    return {
      tcpSocket: { port: IntOrString.fromNumber(config.port) },
      initialDelaySeconds: initialDelay,
      periodSeconds: period,
    }
  }

  return {
    httpGet: { path: config.path, port: IntOrString.fromNumber(config.port) },
    initialDelaySeconds: initialDelay,
    periodSeconds: period,
  }
}

export function generateK8sResources(
  appInstance: App,
  definition: AppDefinition,
  manifestDir: string
): Chart {
  const { name, config } = definition
  const chart = new Chart(appInstance, name)

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
        resources: { requests: { storage: Quantity.fromString(config.storage.size) } },
      },
    })
    volumeName = `${name}-data`
  }

  // Create ConfigMap if configFiles specified
  let configMapName: string | undefined
  if (config.configFiles) {
    const data: Record<string, string> = {}
    for (const [_mountPath, localPath] of Object.entries(config.configFiles)) {
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
  const volumeMounts: Array<{
    name: string
    mountPath: string
    subPath?: string
    readOnly?: boolean
  }> = []
  const volumes: Array<{
    name: string
    persistentVolumeClaim?: { claimName: string }
    configMap?: { name: string }
    hostPath?: { path: string }
  }> = []

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

  // Add host path mounts (for daemonsets like promtail)
  if ('hostPaths' in config && config.hostPaths) {
    for (const hp of config.hostPaths) {
      const volName = hp.mountPath.replace(/\//g, '-').replace(/^-/, '')
      volumeMounts.push({ name: volName, mountPath: hp.mountPath, readOnly: hp.readOnly })
      volumes.push({ name: volName, hostPath: { path: hp.hostPath } })
    }
  }

  // Build probes from config
  const readinessProbe = buildProbe(
    config.probe,
    STANDARDS.readinessInitialDelay,
    STANDARDS.readinessPeriod
  )
  const livenessProbe = buildProbe(
    config.probe,
    STANDARDS.livenessInitialDelay,
    STANDARDS.livenessPeriod
  )

  // Determine container port from probe config or default
  const containerPort =
    config.probe === false ? STANDARDS.healthPort : (config.probe?.port ?? STANDARDS.healthPort)

  // Determine workload kind
  const isDaemonSet = 'kind' in config && config.kind === 'daemonset'

  // Pod spec (shared between Deployment and DaemonSet)
  const podSpec = {
    containers: [
      {
        name,
        image,
        imagePullPolicy: 'IfNotPresent' as const,
        ports: [{ containerPort, name: 'app' }],
        env: Object.entries(env).map(([n, value]) => ({ name: n, value: String(value) })),
        ...('args' in config && config.args ? { args: config.args } : {}),
        ...(readinessProbe ? { readinessProbe } : {}),
        ...(livenessProbe ? { livenessProbe } : {}),
        ...(volumeMounts.length > 0 ? { volumeMounts } : {}),
      },
    ],
    ...(volumes.length > 0 ? { volumes } : {}),
  }

  if (isDaemonSet) {
    // Create DaemonSet
    new KubeDaemonSet(chart, `${name}-daemonset`, {
      metadata: { name, labels },
      spec: {
        selector: { matchLabels: { app: name } },
        template: {
          metadata: { labels: { app: name } },
          spec: podSpec,
        },
      },
    })
    // DaemonSets typically don't need a Service (they push to other services)
  } else {
    // Create Deployment
    new KubeDeployment(chart, `${name}-deployment`, {
      metadata: { name, labels },
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: name } },
        template: {
          metadata: { labels: { app: name } },
          spec: podSpec,
        },
      },
    })

    // Create Service
    new KubeService(chart, `${name}-service`, {
      metadata: { name, labels },
      spec: {
        selector: { app: name },
        ports: [{ port: containerPort, targetPort: IntOrString.fromNumber(containerPort) }],
      },
    })
  }

  return chart
}

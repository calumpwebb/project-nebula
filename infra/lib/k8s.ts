// infra/lib/k8s.ts

import { App, Chart } from 'cdk8s'
import { KubeDeployment, KubeService, KubeConfigMap, KubePersistentVolumeClaim, IntOrString, Quantity } from 'cdk8s-plus-27/lib/imports/k8s'
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
            imagePullPolicy: 'IfNotPresent',
            ports: [{ containerPort: STANDARDS.healthPort, name: 'health' }],
            env: Object.entries(env).map(([n, value]) => ({ name: n, value: String(value) })),
            readinessProbe: {
              httpGet: { path: STANDARDS.healthPath, port: IntOrString.fromNumber(STANDARDS.healthPort) },
              initialDelaySeconds: STANDARDS.readinessInitialDelay,
              periodSeconds: STANDARDS.readinessPeriod,
            },
            livenessProbe: {
              httpGet: { path: STANDARDS.healthPath, port: IntOrString.fromNumber(STANDARDS.healthPort) },
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
      ports: [{ port: STANDARDS.healthPort, targetPort: IntOrString.fromNumber(STANDARDS.healthPort) }],
    },
  })

  return chart
}

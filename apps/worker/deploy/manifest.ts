// apps/worker/deploy/manifest.ts

import { app } from '../../../infra/lib'
import { temporalConfig } from '../../../infra/config'

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

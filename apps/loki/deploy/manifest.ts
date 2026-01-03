// apps/loki/deploy/manifest.ts

import { app } from '../../../infra/lib'

export default app('loki', {
  image: 'grafana/loki:2.9.4',
  labels: ['observability'],
  portForwards: ['3100'],
  storage: { path: '/loki', size: '20Gi' },
  probe: { type: 'http', path: '/ready', port: 3100 },
  configFiles: {
    '/etc/loki/local-config.yaml': './loki-config.yaml',
  },
  env: {},
})

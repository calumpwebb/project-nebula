// apps/prometheus/deploy/manifest.ts

import { app } from '../../../infra/lib'

export default app('prometheus', {
  image: 'prom/prometheus:v2.50.1',
  labels: ['observability'],
  portForwards: ['9090'],
  storage: { path: '/prometheus', size: '10Gi' },
  probe: { type: 'http', path: '/-/healthy', port: 9090 },
  args: [
    '--config.file=/etc/prometheus/prometheus.yml',
    '--storage.tsdb.path=/prometheus',
    '--storage.tsdb.retention.time=90d',
    '--web.enable-lifecycle',
  ],
  configFiles: {
    '/etc/prometheus/prometheus.yml': './prometheus.yml',
  },
})

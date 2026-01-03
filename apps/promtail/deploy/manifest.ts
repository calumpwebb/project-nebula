// apps/promtail/deploy/manifest.ts

import { app } from '../../../infra/lib'

export default app('promtail', {
  image: 'grafana/promtail:2.9.4',
  kind: 'daemonset',
  labels: ['observability'],
  resourceDeps: ['loki'],
  probe: { type: 'http', path: '/ready', port: 3101 },
  args: ['-config.file=/etc/promtail/promtail.yaml'],
  configFiles: {
    '/etc/promtail/promtail.yaml': './promtail.yaml',
  },
  hostPaths: [
    { hostPath: '/var/log/pods', mountPath: '/var/log/pods', readOnly: true },
    {
      hostPath: '/var/lib/docker/containers',
      mountPath: '/var/lib/docker/containers',
      readOnly: true,
    },
  ],
})

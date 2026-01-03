// apps/grafana/deploy/manifest.ts

import { app } from '../../../infra/lib'

export default app('grafana', {
  image: 'grafana/grafana:10.3.1',
  labels: ['observability'],
  portForwards: ['3000'],
  probe: { type: 'http', path: '/api/health', port: 3000 },
  resourceDeps: ['prometheus', 'loki'],
  env: {
    GF_AUTH_ANONYMOUS_ENABLED: 'true',
    GF_AUTH_ANONYMOUS_ORG_ROLE: 'Admin',
    GF_AUTH_DISABLE_LOGIN_FORM: 'true',
  },
  configFiles: {
    '/etc/grafana/provisioning/datasources/datasources.yaml':
      './provisioning/datasources/datasources.yaml',
    '/etc/grafana/provisioning/dashboards/dashboards.yaml':
      './provisioning/dashboards/dashboards.yaml',
    '/etc/grafana/provisioning/dashboards/storage.json': './provisioning/dashboards/storage.json',
  },
})

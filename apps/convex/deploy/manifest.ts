// apps/convex/deploy/manifest.ts

import { app, setupScript } from '../../../infra/lib'

export default [
  app('convex-backend', {
    image: 'ghcr.io/get-convex/convex-backend:523c6812d3020300314f386b89a9c29560f21027',
    labels: ['convex'],
    portForwards: ['3210:3210', '3211:3211'],
    storage: { path: '/convex/data', size: '1Gi' },
    probe: { type: 'tcp', port: 3210 },
    env: {
      DISABLE_BEACON: 'true',
      CONVEX_SITE_URL: 'http://127.0.0.1:3211',
    },
  }),

  app('convex-dashboard', {
    image: 'ghcr.io/get-convex/convex-dashboard:523c6812d3020300314f386b89a9c29560f21027',
    labels: ['convex'],
    portForwards: ['6791:6791'],
    resourceDeps: ['convex-backend'],
    probe: { type: 'http', path: '/', port: 6791 },
  }),

  setupScript('convex-auth-setup', {
    cmd: 'npx convex env set BETTER_AUTH_SECRET "dev-secret-do-not-use-in-production-1234567890"',
    cwd: 'packages/convex',
    resourceDeps: ['convex-backend'],
    labels: ['convex'],
  }),
]

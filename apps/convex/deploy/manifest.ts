// apps/convex/deploy/manifest.ts

import { app, setupScript } from '../../../infra/lib'

export default [
  app('convex-backend', {
    image: 'ghcr.io/get-convex/convex-backend:523c6812d3020300314f386b89a9c29560f21027',
    labels: ['convex'],
    portForwards: ['3210', '3211'],
    storage: { path: '/convex/data', size: '1Gi' },
    env: {
      DISABLE_BEACON: 'true',
    },
  }),

  app('convex-dashboard', {
    image: 'ghcr.io/get-convex/convex-dashboard:523c6812d3020300314f386b89a9c29560f21027',
    labels: ['convex'],
    portForwards: ['6791'],
    resourceDeps: ['convex-backend'],
  }),

  setupScript('convex-auth-setup', {
    cmd: 'cd packages/convex && npx convex env set BETTER_AUTH_SECRET "dev-secret-do-not-use-in-production-1234567890"',
    resourceDeps: ['convex-backend'],
    labels: ['convex'],
  }),
]

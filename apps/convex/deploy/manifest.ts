// apps/convex/deploy/manifest.ts

import { app, setupScript } from '../../../infra/lib'

export default [
  app('convex-backend', {
    image: 'ghcr.io/get-convex/convex-backend:latest',
    labels: ['convex'],
    portForwards: ['3210', '3211'],
    storage: { path: '/convex/data', size: '1Gi' },
    env: {
      DISABLE_BEACON: 'true',
    },
  }),

  app('convex-dashboard', {
    image: 'ghcr.io/get-convex/convex-dashboard:latest',
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

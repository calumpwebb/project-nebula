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
    env: {
      NEXT_PUBLIC_DEPLOYMENT_URL: 'http://127.0.0.1:3210',
    },
  }),

  setupScript('convex-auth-setup', {
    cmd: 'source .env.local && npx convex env get BETTER_AUTH_SECRET >/dev/null 2>&1 || npx convex env set BETTER_AUTH_SECRET "$BETTER_AUTH_SECRET"',
    cwd: 'packages/convex',
    resourceDeps: ['convex-backend'],
    labels: ['convex'],
  }),
]

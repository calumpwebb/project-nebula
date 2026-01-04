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
      CONVEX_CLOUD_ORIGIN: 'http://127.0.0.1:3210',
      CONVEX_SITE_ORIGIN: 'http://127.0.0.1:3211',
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

  setupScript('convex-sync-admin-key', {
    cmd: 'kubectl wait --for=condition=Ready pod -l app=convex-backend -n default --timeout=120s && POD_NAME=$(kubectl get pod -n default -l app=convex-backend -o jsonpath=\'{.items[0].metadata.name}\') && ADMIN_KEY=$(kubectl exec -n default "$POD_NAME" -- ./generate_admin_key.sh 2>&1 | tail -1) && echo "CONVEX_SELF_HOSTED_ADMIN_KEY=$ADMIN_KEY" > .env.local.admin && grep -v CONVEX_SELF_HOSTED_ADMIN_KEY .env.local > .env.local.tmp 2>/dev/null || cp .env.local .env.local.tmp && cat .env.local.admin >> .env.local.tmp && mv .env.local.tmp .env.local && rm .env.local.admin && grep -v CONVEX_SELF_HOSTED_ADMIN_KEY ../../.env.local > ../../.env.local.tmp 2>/dev/null || cp ../../.env.local ../../.env.local.tmp && echo "CONVEX_SELF_HOSTED_ADMIN_KEY=$ADMIN_KEY" >> ../../.env.local.tmp && mv ../../.env.local.tmp ../../.env.local && echo "✓ Synced admin key to .env.local files"',
    cwd: 'packages/convex',
    resourceDeps: ['convex-backend'],
    labels: ['convex'],
  }),

  setupScript('convex-deploy', {
    cmd: 'npx convex dev --once',
    cwd: 'packages/convex',
    resourceDeps: ['convex-sync-admin-key'],
    labels: ['convex'],
  }),

  setupScript('convex-auth-setup', {
    cmd: 'npx convex env get BETTER_AUTH_SECRET >/dev/null 2>&1 || npx convex env set BETTER_AUTH_SECRET "dev-secret-do-not-use-in-production-1234567890"',
    cwd: 'packages/convex',
    resourceDeps: ['convex-deploy'],
    labels: ['convex'],
  }),
]

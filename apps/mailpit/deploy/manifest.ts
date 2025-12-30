// apps/mailpit/deploy/manifest.ts

import { app } from '../../../infra/lib'

export default app('mailpit', {
  image: 'axllent/mailpit:latest',
  labels: ['nebula'],
  portForwards: ['8025:8025'],
  probe: { type: 'http', path: '/livez', port: 8025 },
  env: {
    MP_SMTP_AUTH_ACCEPT_ANY: '1',
    MP_SMTP_AUTH_ALLOW_INSECURE: '1',
  },
})

// apps/temporal/deploy/manifest.ts

import { app } from '../../../infra/lib'

export default [
  app('temporal-db', {
    image: 'postgres:15',
    labels: ['temporal'],
    portForwards: ['5432'],
    storage: { path: '/var/lib/postgresql/data', size: '1Gi' },
    probe: { type: 'tcp', port: 5432 },
    env: {
      POSTGRES_USER: 'temporal',
      POSTGRES_PASSWORD: 'temporal',
      POSTGRES_DB: 'temporal',
    },
  }),

  app('temporal-server', {
    image: 'temporalio/auto-setup:1.29.1',
    labels: ['temporal'],
    portForwards: ['7233:7233', '7243:7243'],
    resourceDeps: ['temporal-db'],
    probe: { type: 'tcp', port: 7233 },
    env: {
      DB: 'postgres12',
      DB_PORT: '5432',
      POSTGRES_USER: 'temporal',
      POSTGRES_PWD: 'temporal',
      POSTGRES_SEEDS: 'temporal-db',
    },
  }),

  app('temporal-ui', {
    image: 'temporalio/ui:2.44.0',
    labels: ['temporal'],
    portForwards: ['8080'],
    resourceDeps: ['temporal-server'],
    probe: { type: 'http', path: '/', port: 8080 },
    env: {
      TEMPORAL_ADDRESS: 'temporal-server:7233',
    },
  }),
]

import { RateLimiter } from '@convex-dev/rate-limiter'
import { components } from '../../_generated/api'
import { getEnvironment } from '@nebula/shared'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

const env = getEnvironment()
const isLocal = env === 'local'

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Per-email signup attempts: 3/hour (relaxed in dev)
  signupPerEmail: {
    kind: 'token bucket',
    rate: isLocal ? 100 : 3,
    period: HOUR,
    capacity: isLocal ? 100 : 3,
  },

  // Per-email verification attempts: 5 then must resend
  verificationAttempts: {
    kind: 'token bucket',
    rate: 5,
    period: HOUR,
    capacity: 5,
  },

  // Global signup limit: 1000/hour
  signupGlobal: {
    kind: 'token bucket',
    rate: isLocal ? 10000 : 1000,
    period: HOUR,
    capacity: isLocal ? 10000 : 1000,
  },

  // Global email sending: 100/hour (bill protection)
  emailSendGlobal: {
    kind: 'token bucket',
    rate: isLocal ? 1000 : 100,
    period: HOUR,
    capacity: isLocal ? 1000 : 100,
  },

  // Per-email email sending: 5/hour
  emailSendPerAddress: {
    kind: 'token bucket',
    rate: isLocal ? 50 : 5,
    period: HOUR,
    capacity: isLocal ? 50 : 5,
  },
})

import { internalMutation } from '../../_generated/server'
import { v } from 'convex/values'
import { rateLimiter } from '../../lib/middleware/rateLimiter'

export const checkOtpRateLimit = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const { ok, retryAfter } = await rateLimiter.limit(ctx, 'otpSend', {
      key: email,
      throws: false,
    })
    return { ok, retryAfter }
  },
})

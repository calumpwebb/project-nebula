import type { MiddlewareConfig } from '../types'
import { authComponent } from '../../auth'

export const auth: MiddlewareConfig<
  Record<string, never>,
  boolean | undefined,
  { user: Awaited<ReturnType<typeof authComponent.getAuthUser>> | null },
  'skipAuth'
> = {
  name: 'auth',
  client: null,
  server: {
    extract: (args) => args.skipAuth as boolean | undefined,
    handle: async (skipAuth, { ctx, functionName }) => {
      if (skipAuth) {
        console.info(`[AUTH SKIPPED] ${functionName}`)
        return { ctx: { ...ctx, user: null } }
      }
      const user = await authComponent.getAuthUser(ctx)
      if (!user) throw new Error('Unauthorized')
      return { ctx: { ...ctx, user } }
    },
    stripFromArgs: ['skipAuth'],
  },
}

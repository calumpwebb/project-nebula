import { query } from '../../functions'
import { authComponent } from './index'

// Public query - anyone can check if they're logged in
export const getCurrentUser = query({
  skipAuth: true,
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx)
  },
}) as unknown

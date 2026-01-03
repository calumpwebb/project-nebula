import { customQuery, customMutation, customAction } from 'convex-helpers/server/customFunctions'
import {
  query as baseQuery,
  mutation as baseMutation,
  action as baseAction,
} from '../../_generated/server'

function logAppVersion(args: Record<string, unknown>): void {
  const appVersion = args?._appVersion ?? 'unknown'
  console.log(`client app version: ${appVersion}`)
}

export const query = customQuery(baseQuery, {
  args: {},
  input: async (_ctx, args) => {
    logAppVersion(args)
    return { ctx: {}, args }
  },
})

export const mutation = customMutation(baseMutation, {
  args: {},
  input: async (_ctx, args) => {
    logAppVersion(args)
    return { ctx: {}, args }
  },
})

export const action = customAction(baseAction, {
  args: {},
  input: async (_ctx, args) => {
    logAppVersion(args)
    return { ctx: {}, args }
  },
})

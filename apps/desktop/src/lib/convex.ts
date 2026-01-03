import { useQuery as useConvexQuery, useMutation as useConvexMutation } from 'convex/react'
import type { FunctionReference, FunctionArgs, FunctionReturnType } from 'convex/server'

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

/**
 * Wrapper around useQuery that injects _appVersion into args.
 */
export function useQuery<Query extends FunctionReference<'query'>>(
  query: Query,
  args: Omit<FunctionArgs<Query>, '_appVersion'>
): FunctionReturnType<Query> | undefined {
  return useConvexQuery(query, {
    ...args,
    _appVersion: APP_VERSION,
  } as FunctionArgs<Query>)
}

/**
 * Wrapper around useMutation that injects _appVersion into args.
 */
export function useMutation<Mutation extends FunctionReference<'mutation'>>(
  mutation: Mutation
): (args: Omit<FunctionArgs<Mutation>, '_appVersion'>) => Promise<FunctionReturnType<Mutation>> {
  const mutate = useConvexMutation(mutation)
  return (args) => mutate({ ...args, _appVersion: APP_VERSION } as FunctionArgs<Mutation>)
}

/**
 * Get the current app version.
 */
export function getAppVersion(): string {
  return APP_VERSION
}

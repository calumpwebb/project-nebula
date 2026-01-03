// ⚠️  CLIENT ONLY - Do not import Convex server internals here

import { buildMiddleware } from '../convex/middleware/factory'
import { appVersion } from '../convex/middleware/configs/appVersion'
import {
  useQuery as baseUseQuery,
  useMutation as baseUseMutation,
  type FunctionReference,
  type FunctionArgs,
  type FunctionReturnType,
} from 'convex/react'

// Build client middleware
const configs = [appVersion] as const
const middleware = configs
  .map((c) => buildMiddleware(c).client)
  .filter((mw): mw is NonNullable<typeof mw> => mw !== null)

/**
 * Wrapper around useQuery that injects middleware args.
 */
export function useQuery<Query extends FunctionReference<'query'>>(
  query: Query,
  ...args: FunctionArgs<Query> extends Record<string, never>
    ? [args?: Record<string, never>]
    : [args: FunctionArgs<Query>]
): FunctionReturnType<Query> | undefined {
  const baseArgs = (args[0] ?? {}) as FunctionArgs<Query>

  // Inject middleware args
  const injectedArgs = middleware.reduce(
    (acc, mw) => ({ ...acc, ...mw.inject() }),
    baseArgs
  ) as FunctionArgs<Query>

  return baseUseQuery(query, injectedArgs)
}

/**
 * Wrapper around useMutation that injects middleware args.
 */
export function useMutation<Mutation extends FunctionReference<'mutation'>>(
  mutation: Mutation
): (
  ...args: FunctionArgs<Mutation> extends Record<string, never>
    ? [args?: Record<string, never>]
    : [args: FunctionArgs<Mutation>]
) => Promise<FunctionReturnType<Mutation>> {
  const baseMutate = baseUseMutation(mutation)

  return (...args: unknown[]) => {
    const baseArgs = (args[0] ?? {}) as FunctionArgs<Mutation>

    // Inject middleware args
    const injectedArgs = middleware.reduce(
      (acc, mw) => ({ ...acc, ...mw.inject() }),
      baseArgs
    ) as FunctionArgs<Mutation>

    return baseMutate(injectedArgs)
  }
}

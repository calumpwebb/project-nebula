/**
 * Middleware Factory
 *
 * Builds server and client middleware from a unified MiddlewareConfig.
 * Uses convex-helpers customQuery/customMutation/customAction for server side.
 *
 * Usage:
 * ```ts
 * // Define a middleware config
 * const appVersionConfig: MiddlewareConfig<...> = { ... }
 *
 * // Build middleware
 * const mw = buildMiddleware(appVersionConfig)
 *
 * // Use on server with customQuery
 * export const query = customQuery(baseQuery, mw.server!.query)
 *
 * // Use on client to inject args
 * const args = { ...userArgs, ...mw.client!.inject() }
 * ```
 */

import { customQuery, customMutation, customAction } from 'convex-helpers/server/customFunctions'
import type { MiddlewareConfig } from './types'

/**
 * Client middleware - exposes inject function for wrapping hooks.
 */
export type ClientMiddleware<TInject extends object> = {
  /** Returns arguments to inject into every request */
  inject: () => TInject
  /** Optional callback after response is received */
  afterResponse?: (args: TInject, durationMs: number) => void
}

/**
 * Server middleware customizations for use with convex-helpers.
 * Each property is a Customization object that can be passed to
 * customQuery, customMutation, or customAction.
 *
 * Note: Uses `any` and `{}` types intentionally for convex-helpers API compatibility.
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
export type ServerMiddleware = {
  /** Customization for queries - pass to customQuery(base, this) */
  query: {
    args: {}
    input: (
      ctx: any,
      args: {},
      extra: object
    ) => Promise<{
      ctx: any
      args: any
      onSuccess?: (obj: {
        ctx: any
        args: Record<string, unknown>
        result: unknown
      }) => void | Promise<void>
    }>
  }
  /** Customization for mutations - pass to customMutation(base, this) */
  mutation: {
    args: {}
    input: (
      ctx: any,
      args: {},
      extra: object
    ) => Promise<{
      ctx: any
      args: any
      onSuccess?: (obj: {
        ctx: any
        args: Record<string, unknown>
        result: unknown
      }) => void | Promise<void>
    }>
  }
  /** Customization for actions - pass to customAction(base, this) */
  action: {
    args: {}
    input: (
      ctx: any,
      args: {},
      extra: object
    ) => Promise<{
      ctx: any
      args: any
      onSuccess?: (obj: {
        ctx: any
        args: Record<string, unknown>
        result: unknown
      }) => void | Promise<void>
    }>
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */

/**
 * Result of building middleware from a config.
 */
export type BuiltMiddleware<TInject extends object = object> = {
  server: ServerMiddleware | null
  client: ClientMiddleware<TInject> | null
}

/**
 * Strips specified keys from an object.
 * Currently unused but reserved for future implementation when arg validators are added.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function stripKeys<T extends Record<string, unknown>, K extends string>(
  obj: T,
  keys: readonly K[]
): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result as Omit<T, K>
}

/**
 * Builds server middleware from a config.
 * Creates customizations for query/mutation/action that:
 * - Extract values from args
 * - Call the handle function to modify context
 * - Strip middleware-specific args before passing to handler
 */

function buildServerMiddleware<
  TInject extends object = object,
  TExtract = unknown,
  TCtxAdditions extends object = Record<string, never>,
  TStrip extends string = never,
>(config: MiddlewareConfig<TInject, TExtract, TCtxAdditions, TStrip>): ServerMiddleware {
  const serverConfig = config.server!

  // Create a reusable input function
  //
  // Important: convex-helpers automatically handles arg stripping!
  // - Middleware args (declared in customization.args) are picked from allArgs
  // - Then those same args are omitted from the user args
  // - Finally, middleware-returned args are merged with user args
  //
  // So we just need to:
  // 1. Receive our middleware args in the `args` parameter
  // 2. Process them and modify context
  // 3. Return empty args ({}) to not add anything to the final args
  //
  // Note: Uses `any` and `{}` types for convex-helpers API compatibility
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
  const inputFn = async (ctx: any, args: {}, _extra: object) => {
    const startTime = Date.now()
    // Note: We can't access the actual function name via convex-helpers API
    // Using config name as identifier instead
    const functionName = config.name

    // TODO(NEBULA-xxx): Middleware args need to be declared with validators
    // Currently we declare args: {} which means the `args` parameter is empty.
    // To properly extract and strip middleware args, we need to:
    // 1. Add validators to MiddlewareConfig
    // 2. Build args: { _appVersion: v.string(), ... } from those validators
    // 3. Then convex-helpers will pass those args here and auto-strip them
    //
    // For now, extract from empty args (won't work at runtime)
    const extractedValue = serverConfig.extract(args as any)

    // Call handler to get modified context
    const result = await serverConfig.handle(extractedValue, {
      ctx,
      functionName,
    })

    // Call afterHandler if defined
    const afterHandler = serverConfig.afterHandler
    const onSuccess = afterHandler
      ? (_obj: { ctx: any; args: Record<string, unknown>; result: unknown }) => {
          const durationMs = Date.now() - startTime
          afterHandler(extractedValue, durationMs)
        }
      : undefined

    return {
      ctx: result.ctx,
      args: {}, // Don't add any args to the final args
      onSuccess,
    }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */

  return {
    query: { args: {}, input: inputFn },
    mutation: { args: {}, input: inputFn },
    action: { args: {}, input: inputFn },
  }
}

/**
 * Builds client middleware from a config.
 * Returns the inject function and optional afterResponse callback.
 */

function buildClientMiddleware<
  TInject extends object = object,
  TExtract = unknown,
  TCtxAdditions extends object = Record<string, never>,
  TStrip extends string = never,
>(config: MiddlewareConfig<TInject, TExtract, TCtxAdditions, TStrip>): ClientMiddleware<TInject> {
  const clientConfig = config.client!

  return {
    inject: clientConfig.inject,
    afterResponse: clientConfig.afterResponse,
  }
}

/**
 * Builds both server and client middleware from a unified config.
 *
 * @example
 * ```ts
 * import { buildMiddleware, customQuery } from './factory'
 * import { appVersionConfig } from './configs/appVersion'
 * import { query as baseQuery } from '../_generated/server'
 *
 * const mw = buildMiddleware(appVersionConfig)
 *
 * // Use server customization with customQuery
 * export const query = customQuery(baseQuery, mw.server!.query)
 *
 * // Use client middleware to inject args
 * const injectedArgs = mw.client?.inject()
 * ```
 */

export function buildMiddleware<
  TInject extends object = object,
  TExtract = unknown,
  TCtxAdditions extends object = Record<string, never>,
  TStrip extends string = never,
>(config: MiddlewareConfig<TInject, TExtract, TCtxAdditions, TStrip>): BuiltMiddleware<TInject> {
  return {
    server: config.server ? buildServerMiddleware(config) : null,
    client: config.client ? buildClientMiddleware(config) : null,
  }
}

// Re-export custom function builders for convenience
export { customQuery, customMutation, customAction }

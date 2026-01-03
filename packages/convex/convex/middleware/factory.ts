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
import type { MiddlewareConfig, ClientConfig, ServerConfig } from './types'

/**
 * Client middleware - exposes inject function for wrapping hooks.
 */
export type ClientMiddleware<TInject extends Record<string, unknown>> = {
  /** Returns arguments to inject into every request */
  inject: () => TInject
  /** Optional callback after response is received */
  afterResponse?: (args: TInject, durationMs: number) => void
}

/**
 * Server middleware customizations for use with convex-helpers.
 * Each property is a Customization object that can be passed to
 * customQuery, customMutation, or customAction.
 */
export type ServerMiddleware = {
  /** Customization for queries - pass to customQuery(base, this) */
  query: {
    args: Record<string, never>
    input: (
      ctx: unknown,
      args: Record<string, never>,
      extra: { args?: Record<string, unknown>; functionName?: string }
    ) => Promise<{
      ctx: Record<string, unknown>
      args: Record<string, unknown>
      onSuccess?: () => void
    }>
  }
  /** Customization for mutations - pass to customMutation(base, this) */
  mutation: {
    args: Record<string, never>
    input: (
      ctx: unknown,
      args: Record<string, never>,
      extra: { args?: Record<string, unknown>; functionName?: string }
    ) => Promise<{
      ctx: Record<string, unknown>
      args: Record<string, unknown>
      onSuccess?: () => void
    }>
  }
  /** Customization for actions - pass to customAction(base, this) */
  action: {
    args: Record<string, never>
    input: (
      ctx: unknown,
      args: Record<string, never>,
      extra: { args?: Record<string, unknown>; functionName?: string }
    ) => Promise<{
      ctx: Record<string, unknown>
      args: Record<string, unknown>
      onSuccess?: () => void
    }>
  }
}

/**
 * Result of building middleware from a config.
 */
export type BuiltMiddleware<TConfig extends MiddlewareConfig> = {
  server: TConfig['server'] extends ServerConfig<unknown, Record<string, unknown>, string>
    ? ServerMiddleware
    : null
  client: TConfig['client'] extends ClientConfig<infer TInject> ? ClientMiddleware<TInject> : null
}

/**
 * Strips specified keys from an object.
 */
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
  TExtract,
  TCtxAdditions extends Record<string, unknown>,
  TStrip extends string,
>(
  config: MiddlewareConfig<Record<string, unknown>, TExtract, TCtxAdditions, TStrip>
): ServerMiddleware {
  const serverConfig = config.server!

  // Create a reusable input function
  const inputFn = async (
    ctx: unknown,
    _args: Record<string, never>,
    extra: { args?: Record<string, unknown>; functionName?: string }
  ) => {
    const startTime = Date.now()
    const allArgs = extra.args ?? {}
    const functionName = extra.functionName ?? 'unknown'

    // Extract value from args
    const extractedValue = serverConfig.extract(allArgs)

    // Call handler to get modified context
    const result = await serverConfig.handle(extractedValue, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ctx: ctx as any,
      functionName,
    })

    // Strip middleware-specific args
    const strippedArgs = stripKeys(allArgs, serverConfig.stripFromArgs)

    // Call afterHandler if defined
    const afterHandler = serverConfig.afterHandler
    const onSuccess = afterHandler
      ? () => {
          const durationMs = Date.now() - startTime
          afterHandler(extractedValue, durationMs)
        }
      : undefined

    return {
      ctx: result.ctx,
      args: strippedArgs,
      onSuccess,
    }
  }

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
function buildClientMiddleware<TInject extends Record<string, unknown>>(
  config: MiddlewareConfig<TInject>
): ClientMiddleware<TInject> {
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
export function buildMiddleware<TConfig extends MiddlewareConfig>(
  config: TConfig
): BuiltMiddleware<TConfig> {
  return {
    server: config.server ? buildServerMiddleware(config) : null,
    client: config.client ? buildClientMiddleware(config) : null,
  } as BuiltMiddleware<TConfig>
}

// Re-export custom function builders for convenience
export { customQuery, customMutation, customAction }

/**
 * Middleware System
 *
 * Provides a unified configuration pattern for client and server middleware.
 * Middleware can inject arguments on the client, extract/strip them on the server,
 * and modify the context passed to handlers.
 *
 * @example
 * ```ts
 * // Define a middleware config (in configs/appVersion.ts)
 * import type { MiddlewareConfig } from '../types'
 *
 * export const appVersionConfig: MiddlewareConfig<
 *   { _appVersion: string },  // TInject
 *   string | undefined,       // TExtract
 *   Record<string, never>,    // TCtxAdditions
 *   '_appVersion'             // TStrip
 * > = {
 *   name: 'appVersion',
 *   client: {
 *     inject: () => ({ _appVersion: '1.0.0' }),
 *   },
 *   server: {
 *     extract: (args) => args._appVersion as string | undefined,
 *     handle: (value, { ctx, functionName }) => {
 *       console.log(`[${functionName}] version: ${value}`)
 *       return { ctx }
 *     },
 *     stripFromArgs: ['_appVersion'],
 *   },
 * }
 *
 * // Build and use (in server.ts)
 * import { buildMiddleware, customQuery } from './factory'
 * import { query as baseQuery } from '../_generated/server'
 *
 * const mw = buildMiddleware(appVersionConfig)
 * export const query = customQuery(baseQuery, mw.server!.query)
 * ```
 */

// Types
export type { MiddlewareConfig, ClientConfig, ServerConfig, HttpMiddlewareConfig } from './types'

// Factory
export { buildMiddleware, customQuery, customMutation, customAction } from './factory'

export type { ClientMiddleware, ServerMiddleware, BuiltMiddleware } from './factory'

/**
 * Middleware Type Definitions
 *
 * Defines the configuration shapes for both client and server middleware.
 * These types enable type-safe middleware that can:
 * - Inject arguments on the client side
 * - Extract and strip arguments on the server side
 * - Modify context (add user, etc.)
 * - Handle HTTP requests for httpActions
 */

import type { GenericQueryCtx } from 'convex/server'
import type { DataModel } from '../_generated/dataModel'

/**
 * Client-side middleware configuration.
 * Handles argument injection before requests are sent.
 */
export type ClientConfig<TInject extends Record<string, unknown>> = {
  /** Returns arguments to inject into every request */
  inject: () => TInject
  /** Optional callback after response is received */
  afterResponse?: (args: TInject, durationMs: number) => void
}

/**
 * Server-side middleware configuration.
 * Handles argument extraction, context modification, and arg stripping.
 */
export type ServerConfig<
  TExtract,
  TCtxAdditions extends Record<string, unknown> = Record<string, never>,
  TStrip extends string = never,
> = {
  /** Extracts a value from the incoming arguments */
  extract: (args: Record<string, unknown>) => TExtract
  /**
   * Handles the extracted value and optionally modifies context.
   * Can be sync or async.
   */
  handle: (
    value: TExtract,
    context: { ctx: GenericQueryCtx<DataModel>; functionName: string }
  ) =>
    | Promise<{ ctx: GenericQueryCtx<DataModel> & TCtxAdditions }>
    | { ctx: GenericQueryCtx<DataModel> & TCtxAdditions }
  /** Optional callback after handler completes */
  afterHandler?: (value: TExtract, durationMs: number) => void
  /** Argument keys to strip before passing to the handler */
  stripFromArgs: TStrip[]
}

/**
 * Combined middleware configuration for query/mutation/action.
 *
 * @typeParam TInject - Shape of arguments injected by client
 * @typeParam TExtract - Type extracted from args on server
 * @typeParam TCtxAdditions - Properties added to context
 * @typeParam TStrip - Argument keys to strip from args
 */
export type MiddlewareConfig<
  TInject extends Record<string, unknown> = Record<string, unknown>,
  TExtract = unknown,
  TCtxAdditions extends Record<string, unknown> = Record<string, never>,
  TStrip extends string = never,
> = {
  /** Unique name for this middleware (used in logging) */
  name: string
  /** Client-side configuration, or null if server-only */
  client: ClientConfig<TInject> | null
  /** Server-side configuration, or null if client-only */
  server: ServerConfig<TExtract, TCtxAdditions, TStrip> | null
}

/**
 * HTTP Request type for httpAction middleware.
 * This is the standard Fetch API Request available in Convex runtime.
 * Using a type alias to avoid DOM lib dependency in tsconfig.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HttpRequest = any

/**
 * HTTP middleware configuration (for httpAction only).
 * Handles raw Request objects rather than structured args.
 */
export type HttpMiddlewareConfig = {
  /** Unique name for this middleware (used in logging) */
  name: string
  server: {
    /**
     * Handles the incoming HTTP request.
     * Can modify the request and optionally add context.
     */
    handle: (
      request: HttpRequest,
      context: { functionName: string }
    ) => Promise<{ request: HttpRequest; ctx?: Record<string, unknown> }>
  }
}

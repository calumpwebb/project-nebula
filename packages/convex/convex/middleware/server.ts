/**
 * Middleware-wrapped Convex builders
 *
 * Use these instead of importing from _generated/server directly.
 * ESLint will enforce this.
 *
 * Usage:
 *   query({ args: {}, handler: (ctx) => ctx.user })           // ctx.user: User
 *   query({ skipAuth: true, args: {}, handler: (ctx) => {} }) // ctx.user: null
 */

/* eslint-disable no-restricted-imports */
import { customQuery, customMutation, customAction } from 'convex-helpers/server/customFunctions'
import type { PropertyValidators, ObjectType } from 'convex/values'
import type { GenericQueryCtx, GenericMutationCtx, GenericActionCtx } from 'convex/server'
import {
  query as baseQuery,
  mutation as baseMutation,
  action as baseAction,
  internalQuery as baseInternalQuery,
  internalMutation as baseInternalMutation,
  internalAction as baseInternalAction,
} from '../_generated/server'
/* eslint-enable no-restricted-imports */
import type { DataModel } from '../_generated/dataModel'
import { authComponent } from '../features/auth'

// ---- Types ----

export type User = NonNullable<Awaited<ReturnType<typeof authComponent.getAuthUser>>>

type BaseQueryCtx = GenericQueryCtx<DataModel>
type BaseMutationCtx = GenericMutationCtx<DataModel>
type BaseActionCtx = GenericActionCtx<DataModel>

type AuthQueryCtx = BaseQueryCtx & { user: User }
type AuthMutationCtx = BaseMutationCtx & { user: User }
type AuthActionCtx = BaseActionCtx & { user: User }

type PublicQueryCtx = BaseQueryCtx & { user: null }
type PublicMutationCtx = BaseMutationCtx & { user: null }
type PublicActionCtx = BaseActionCtx & { user: null }

// ---- Authenticated builders ----

const authenticatedQuery = customQuery(baseQuery, {
  args: {},
  input: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error('Unauthorized')
    return { ctx: { user }, args: {} }
  },
})

const authenticatedMutation = customMutation(baseMutation, {
  args: {},
  input: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error('Unauthorized')
    return { ctx: { user }, args: {} }
  },
})

const authenticatedAction = customAction(baseAction, {
  args: {},
  input: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new Error('Unauthorized')
    return { ctx: { user }, args: {} }
  },
})

// ---- Public builders ----

const publicQueryBuilder = customQuery(baseQuery, {
  args: {},
  input: () => ({ ctx: { user: null as null }, args: {} }),
})

const publicMutationBuilder = customMutation(baseMutation, {
  args: {},
  input: () => ({ ctx: { user: null as null }, args: {} }),
})

const publicActionBuilder = customAction(baseAction, {
  args: {},
  input: () => ({ ctx: { user: null as null }, args: {} }),
})

// ---- Query with skipAuth overloads ----

type QueryConfig<TArgs extends PropertyValidators, TReturns, TCtx> = {
  args: TArgs
  handler: (ctx: TCtx, args: ObjectType<TArgs>) => TReturns
}

type QueryConfigWithSkipAuth<TArgs extends PropertyValidators, TReturns> = QueryConfig<
  TArgs,
  TReturns,
  PublicQueryCtx
> & { skipAuth: true }

type QueryConfigWithAuth<TArgs extends PropertyValidators, TReturns> = QueryConfig<
  TArgs,
  TReturns,
  AuthQueryCtx
> & { skipAuth?: false }

export function query<TArgs extends PropertyValidators, TReturns>(
  config: QueryConfigWithSkipAuth<TArgs, TReturns>
): ReturnType<typeof publicQueryBuilder>
export function query<TArgs extends PropertyValidators, TReturns>(
  config: QueryConfigWithAuth<TArgs, TReturns>
): ReturnType<typeof authenticatedQuery>
export function query(
  config:
    | QueryConfigWithSkipAuth<PropertyValidators, unknown>
    | QueryConfigWithAuth<PropertyValidators, unknown>
) {
  if ('skipAuth' in config && config.skipAuth) {
    const { skipAuth: _, ...rest } = config
    return publicQueryBuilder(rest)
  }
  return authenticatedQuery(config)
}

// ---- Mutation with skipAuth overloads ----

type MutationConfig<TArgs extends PropertyValidators, TReturns, TCtx> = {
  args: TArgs
  handler: (ctx: TCtx, args: ObjectType<TArgs>) => TReturns
}

type MutationConfigWithSkipAuth<TArgs extends PropertyValidators, TReturns> = MutationConfig<
  TArgs,
  TReturns,
  PublicMutationCtx
> & { skipAuth: true }

type MutationConfigWithAuth<TArgs extends PropertyValidators, TReturns> = MutationConfig<
  TArgs,
  TReturns,
  AuthMutationCtx
> & { skipAuth?: false }

export function mutation<TArgs extends PropertyValidators, TReturns>(
  config: MutationConfigWithSkipAuth<TArgs, TReturns>
): ReturnType<typeof publicMutationBuilder>
export function mutation<TArgs extends PropertyValidators, TReturns>(
  config: MutationConfigWithAuth<TArgs, TReturns>
): ReturnType<typeof authenticatedMutation>
export function mutation(
  config:
    | MutationConfigWithSkipAuth<PropertyValidators, unknown>
    | MutationConfigWithAuth<PropertyValidators, unknown>
) {
  if ('skipAuth' in config && config.skipAuth) {
    const { skipAuth: _, ...rest } = config
    return publicMutationBuilder(rest)
  }
  return authenticatedMutation(config)
}

// ---- Action with skipAuth overloads ----

type ActionConfig<TArgs extends PropertyValidators, TReturns, TCtx> = {
  args: TArgs
  handler: (ctx: TCtx, args: ObjectType<TArgs>) => TReturns
}

type ActionConfigWithSkipAuth<TArgs extends PropertyValidators, TReturns> = ActionConfig<
  TArgs,
  TReturns,
  PublicActionCtx
> & { skipAuth: true }

type ActionConfigWithAuth<TArgs extends PropertyValidators, TReturns> = ActionConfig<
  TArgs,
  TReturns,
  AuthActionCtx
> & { skipAuth?: false }

export function action<TArgs extends PropertyValidators, TReturns>(
  config: ActionConfigWithSkipAuth<TArgs, TReturns>
): ReturnType<typeof publicActionBuilder>
export function action<TArgs extends PropertyValidators, TReturns>(
  config: ActionConfigWithAuth<TArgs, TReturns>
): ReturnType<typeof authenticatedAction>
export function action(
  config:
    | ActionConfigWithSkipAuth<PropertyValidators, unknown>
    | ActionConfigWithAuth<PropertyValidators, unknown>
) {
  if ('skipAuth' in config && config.skipAuth) {
    const { skipAuth: _, ...rest } = config
    return publicActionBuilder(rest)
  }
  return authenticatedAction(config)
}

// ---- Internal (no auth wrapper) ----

export const internalQuery = baseInternalQuery
export const internalMutation = baseInternalMutation
export const internalAction = baseInternalAction

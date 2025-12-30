import {
  query as baseQuery,
  mutation as baseMutation,
  action as baseAction,
} from "../_generated/server";
import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { authComponent } from "../auth";

// Types for authenticated context
type AuthUser = NonNullable<
  Awaited<ReturnType<typeof authComponent.getAuthUser>>
>;

type AuthenticatedQueryCtx = QueryCtx & { user: AuthUser };
type AuthenticatedMutationCtx = MutationCtx & { user: AuthUser };
type AuthenticatedActionCtx = ActionCtx & { user: AuthUser };

// Authenticated by default - this is what you import
export function query<Args extends Record<string, unknown>, Output>(
  args: Args,
  handler: (ctx: AuthenticatedQueryCtx, args: Args) => Promise<Output> | Output
) {
  return baseQuery({
    args,
    handler: async (ctx, fnArgs) => {
      const user = await authComponent.getAuthUser(ctx);
      if (!user) {
        throw new Error("Unauthorized");
      }
      return handler({ ...ctx, user } as AuthenticatedQueryCtx, fnArgs as Args);
    },
  });
}

export function mutation<Args extends Record<string, unknown>, Output>(
  args: Args,
  handler: (
    ctx: AuthenticatedMutationCtx,
    args: Args
  ) => Promise<Output> | Output
) {
  return baseMutation({
    args,
    handler: async (ctx, fnArgs) => {
      const user = await authComponent.getAuthUser(ctx);
      if (!user) {
        throw new Error("Unauthorized");
      }
      return handler(
        { ...ctx, user } as AuthenticatedMutationCtx,
        fnArgs as Args
      );
    },
  });
}

export function action<Args extends Record<string, unknown>, Output>(
  args: Args,
  handler: (
    ctx: AuthenticatedActionCtx,
    args: Args
  ) => Promise<Output> | Output
) {
  return baseAction({
    args,
    handler: async (ctx, fnArgs) => {
      const user = await authComponent.getAuthUser(ctx);
      if (!user) {
        throw new Error("Unauthorized");
      }
      return handler(
        { ...ctx, user } as AuthenticatedActionCtx,
        fnArgs as Args
      );
    },
  });
}

// Explicit public functions - must consciously choose these
export const publicQuery = baseQuery;
export const publicMutation = baseMutation;
export const publicAction = baseAction;

import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth/minimal";
import authConfig from "./auth.config";

// TODO(NEBULA-uy7): Set SITE_URL env var in production
const siteUrl = process.env.SITE_URL ?? "http://localhost:1420";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      // TODO(NEBULA-c36): Integrate Resend for real email delivery
      sendVerificationEmail: async ({ user, token }) => {
        console.log(`[DEV] Verification email for ${user.email}: ${token}`);
      },
      sendResetPasswordEmail: async ({ user, token }) => {
        console.log(`[DEV] Password reset for ${user.email}: ${token}`);
      },
    },
    plugins: [crossDomain({ siteUrl }), convex({ authConfig })],
  });
};

// Public query - anyone can check if they're logged in
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});

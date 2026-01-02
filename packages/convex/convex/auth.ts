import { createClient, type GenericCtx } from '@convex-dev/better-auth'
import { convex, crossDomain } from '@convex-dev/better-auth/plugins'
import { components, internal } from './_generated/api'
import { DataModel } from './_generated/dataModel'
import { query } from './_generated/server'
import { betterAuth } from 'better-auth/minimal'
import authConfig from './auth.config'

// TODO(NEBULA-uy7): Set SITE_URL env var in production
const siteUrl = process.env.SITE_URL ?? 'http://localhost:1420'

export const authComponent = createClient<DataModel>(components.betterAuth)

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
      sendVerificationEmail: async ({ user, url }) => {
        await ctx.scheduler.runAfter(0, internal.emails.send, {
          to: user.email,
          subject: 'Verify your Nebula account',
          html: `
          <h1>Welcome to Nebula!</h1>
          <p>Click the link below to verify your email address:</p>
          <p><a href="${url}">Verify Email</a></p>
          <p>This link expires in 15 minutes.</p>
          `,
        })
      },
      sendResetPasswordEmail: async ({ user, url }) => {
        await ctx.scheduler.runAfter(0, internal.emails.send, {
          to: user.email,
          subject: 'Reset your Nebula password',
          html: `
          <h1>Password Reset</h1>
          <p>Click the link below to reset your password:</p>
          <p><a href="${url}">Reset Password</a></p>
          <p>If you didn't request this, ignore this email.</p>
          `,
        })
      },
    },
    plugins: [crossDomain({ siteUrl }), convex({ authConfig })],
  })
}

// Public query - anyone can check if they're logged in
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx)
  },
})

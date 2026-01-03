import { createClient, type GenericCtx } from '@convex-dev/better-auth'
import { requireActionCtx } from '@convex-dev/better-auth/utils'
import { convex, crossDomain } from '@convex-dev/better-auth/plugins'
import { components, internal } from '../../_generated/api'
import type { DataModel } from '../../_generated/dataModel'
import { betterAuth } from 'better-auth/minimal'
import { emailOTP } from 'better-auth/plugins'
import authConfig from '../../auth.config'
import { sendEmail } from '../../lib/emails'

// TODO(NEBULA-uy7): Set SITE_URL env var in production
const siteUrl = process.env.SITE_URL ?? 'http://localhost:1420'

export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (ctx: GenericCtx<DataModel>): ReturnType<typeof betterAuth> => {
  return betterAuth({
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      // TODO(NEBULA-c36): Integrate Resend for real email delivery
      sendResetPasswordEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
        await sendEmail(
          user.email,
          'Reset your Nebula password',
          `
          <h1>Password Reset</h1>
          <p>Click the link below to reset your password:</p>
          <p><a href="${url}">Reset Password</a></p>
          <p>If you didn't request this, ignore this email.</p>
          `
        )
      },
    },
    plugins: [
      crossDomain({ siteUrl }),
      convex({ authConfig }),
      emailOTP({
        expiresIn: 600, // 10 minutes
        sendVerificationOnSignUp: true,
        async sendVerificationOTP({ email, otp, type }) {
          // Enforce 30s cooldown between OTP sends
          const actionCtx = requireActionCtx(ctx)
          const { ok, retryAfter } = await actionCtx.runMutation(
            internal.features.auth.mutations.checkOtpRateLimit,
            { email }
          )

          if (!ok) {
            throw new Error(
              `Please wait ${Math.ceil((retryAfter ?? 30000) / 1000)} seconds before requesting another code`
            )
          }

          const subject =
            type === 'sign-in'
              ? 'Your Nebula sign-in code'
              : type === 'forget-password'
                ? 'Your Nebula password reset code'
                : 'Verify your Nebula account'

          await sendEmail(
            email,
            subject,
            `
            <h1 style="font-family: sans-serif; color: #333;">Your verification code</h1>
            <p style="font-family: sans-serif; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #2563eb; margin: 24px 0;">
              ${otp}
            </p>
            <p style="font-family: sans-serif; color: #666;">
              This code expires in 10 minutes.
            </p>
            <p style="font-family: sans-serif; color: #999; font-size: 12px;">
              If you didn't request this code, you can safely ignore this email.
            </p>
            `
          )
        },
      }),
    ],
  })
}

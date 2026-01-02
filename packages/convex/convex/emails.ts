'use node'

import { internalAction } from './_generated/server'
import { v } from 'convex/values'
import nodemailer from 'nodemailer'
import { getEnvironment, Environment } from '@nebula/shared'

const env = getEnvironment()

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'mailpit',
  port: parseInt(process.env.SMTP_PORT ?? '1025'),
  secure: false, // No TLS for local dev (Mailpit)
})

export const send = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (ctx, { to, subject, html }) => {
    if (env === Environment.Production) {
      // TODO(NEBULA-c36): Use Resend SDK
      throw new Error('Production email not configured')
    }

    await transporter.sendMail({
      from: 'Nebula <noreply@nebula.local>',
      to,
      subject,
      html,
    })
  },
})

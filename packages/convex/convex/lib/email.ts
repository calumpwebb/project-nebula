// packages/convex/convex/lib/email.ts

import nodemailer from 'nodemailer'

// Dev environment check - Convex local backend uses localhost URL
const isDev = process.env.CONVEX_CLOUD_URL?.includes('localhost') ?? true

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'mailpit',
  port: parseInt(process.env.SMTP_PORT ?? '1025'),
  secure: false, // Mailpit doesn't need TLS
})

/**
 * Send an email via SMTP.
 * In dev: sends to Mailpit (localhost:8025 to view)
 * In prod: throws until Resend is configured
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  if (!isDev) {
    // TODO(NEBULA-c36): Integrate Resend for production
    throw new Error('Production email not configured - use Resend SDK')
  }

  await transporter.sendMail({
    from: 'Nebula <noreply@nebula.local>',
    to,
    subject,
    html,
  })
}

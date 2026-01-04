import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { authClient } from '../../lib/auth-client'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'

export const Route = createFileRoute('/_public/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string>('')

  const form = useForm({
    defaultValues: {
      email: '',
    },
    onSubmit: async ({ value }) => {
      setFormError('')

      try {
        await authClient.emailOtp.sendVerificationOtp({
          email: value.email,
          type: 'forget-password',
        })
        // @ts-expect-error - TanStack Router state typing doesn't support custom properties yet
        navigate({ to: '/reset-password', state: { email: value.email } })
      } catch {
        // Don't show error for security - proceed anyway
        // @ts-expect-error - TanStack Router state typing doesn't support custom properties yet
        navigate({ to: '/reset-password', state: { email: value.email } })
      }
    },
  })

  return (
    <div className="w-full max-w-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        noValidate
        autoComplete="on"
        className="bg-white rounded-lg border border-border shadow-[var(--card-shadow)] p-8"
      >
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-foreground">Reset password</h2>
        </div>

        <form.Field name="email">
          {(field) => (
            <Input
              label="Email"
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              {...(field.state.meta.errors[0] ? { error: field.state.meta.errors[0] } : {})}
              autoFocus
              autoComplete="username"
              name="email"
              id="email"
              placeholder="you@example.com"
            />
          )}
        </form.Field>

        {formError && <p className="mt-4 text-sm text-destructive">{formError}</p>}

        <div className="mt-6 space-y-3">
          <Button type="submit" variant="primary" className="w-full">
            Send reset code
          </Button>

          <div className="text-center">
            <button
              onClick={() => navigate({ to: '/login' })}
              className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
              type="button"
            >
              ← Back to sign in
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

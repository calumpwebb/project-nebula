import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { authClient } from '../../lib/auth-client'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'

export const Route = createFileRoute('/_public/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const [formError, setFormError] = useState<string>('')

  useEffect(() => {
    if (session?.user) {
      navigate({ to: '/' })
    }
  }, [session, navigate])

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setFormError('')

      const result = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      })

      if (result.error) {
        if (result.error.status === 403) {
          // @ts-expect-error - TanStack Router state typing doesn't support custom properties yet
          navigate({ to: '/verify-email', state: { email: value.email } })
        } else if (result.error.status === 401 || result.error.status === 400) {
          setFormError('Incorrect email or password')
        } else {
          setFormError(result.error.message || 'Sign in failed')
        }
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
          <h2 className="text-xl font-semibold text-foreground">Sign in</h2>
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

        <form.Field name="password">
          {(field) => (
            <Input
              label="Password"
              type="password"
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              {...(field.state.meta.errors[0] ? { error: field.state.meta.errors[0] } : {})}
              autoComplete="current-password"
              name="password"
              id="password"
              placeholder="••••••••"
              hint="Forgot password?"
              onHintClick={() => navigate({ to: '/forgot-password' })}
            />
          )}
        </form.Field>

        {formError && <p className="mt-4 text-sm text-destructive">{formError}</p>}

        <div className="mt-4 space-y-3">
          <Button type="submit" variant="primary" className="w-full">
            Sign in
          </Button>

          <div className="text-center">
            <span className="text-sm text-foreground-secondary">Don't have an account? </span>
            <button
              onClick={() => navigate({ to: '/signup' })}
              className="text-sm text-foreground-secondary hover:text-foreground transition-colors font-medium"
              type="button"
            >
              Sign up
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

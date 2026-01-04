import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { authClient } from '../../lib/auth-client'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'

export const Route = createFileRoute('/_public/signup')({
  component: SignupPage,
})

function SignupPage() {
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
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validators: {
      onChange: ({ value }) => {
        if (value.password !== value.confirmPassword) {
          return {
            fields: {
              confirmPassword: 'Passwords do not match',
            },
          }
        }
        return undefined
      },
    },
    onSubmit: async ({ value }) => {
      setFormError('')

      const result = await authClient.signUp.email({
        email: value.email,
        password: value.password,
        name: value.name,
      })

      if (result.error) {
        setFormError(result.error.message || 'Sign up failed')
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigate({ to: '/verify-email', state: { email: value.email } as any })
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
          <h2 className="text-xl font-semibold text-foreground">Create account</h2>
        </div>

        <form.Field name="name">
          {(field) => {
            const error = field.state.meta.errors[0]
            return (
              <Input
                label="Name"
                value={field.state.value}
                onChange={(val) => field.handleChange(val)}
                {...(error ? { error } : {})}
                autoComplete="name"
                name="name"
                id="name"
                placeholder="Your name"
              />
            )
          }}
        </form.Field>

        <form.Field name="email">
          {(field) => {
            const error = field.state.meta.errors[0]
            return (
              <Input
                label="Email"
                value={field.state.value}
                onChange={(val) => field.handleChange(val)}
                {...(error ? { error } : {})}
                autoFocus
                autoComplete="username"
                name="email"
                id="email"
                placeholder="you@example.com"
              />
            )
          }}
        </form.Field>

        <form.Field name="password">
          {(field) => {
            const error = field.state.meta.errors[0]
            return (
              <Input
                label="Password"
                type="password"
                value={field.state.value}
                onChange={(val) => field.handleChange(val)}
                {...(error ? { error } : {})}
                autoComplete="new-password"
                name="password"
                id="password"
                placeholder="••••••••"
              />
            )
          }}
        </form.Field>

        <form.Field name="confirmPassword">
          {(field) => {
            const error = field.state.meta.errors[0]
            return (
              <Input
                label="Confirm password"
                type="password"
                value={field.state.value}
                onChange={(val) => field.handleChange(val)}
                {...(error ? { error } : {})}
                autoComplete="new-password"
                name="confirmPassword"
                id="confirmPassword"
                placeholder="••••••••"
              />
            )
          }}
        </form.Field>

        {formError && <p className="mt-4 text-sm text-destructive">{formError}</p>}

        <div className="mt-4 space-y-3">
          <Button type="submit" variant="primary" className="w-full">
            Create account
          </Button>

          <div className="text-center">
            <span className="text-sm text-foreground-secondary">Already have an account? </span>
            <button
              onClick={() => navigate({ to: '/login' })}
              className="text-sm text-foreground-secondary hover:text-foreground transition-colors font-medium"
              type="button"
            >
              Sign in
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

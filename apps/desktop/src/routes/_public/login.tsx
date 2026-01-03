import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { authClient } from '../../lib/auth-client'

export const Route = createFileRoute('/_public/login')({
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [otp, setOtp] = useState('')
  const [countdown, setCountdown] = useState(30)
  const [isVerifying, setIsVerifying] = useState(false)

  // Countdown timer for resend button
  useEffect(() => {
    if (!pendingVerification || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [pendingVerification, countdown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (isSignUp) {
        const result = await authClient.signUp.email({
          email,
          password,
          name,
        })
        if (result.error) {
          setError(result.error.message || 'Sign up failed')
        } else {
          setPendingVerification(true)
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        })
        if (result.error) {
          if (result.error.status === 403) {
            setError('Please verify your email before signing in')
            setPendingVerification(true)
          } else {
            setError(result.error.message || 'Sign in failed')
          }
        } else {
          // Session updated - invalidate router to trigger beforeLoad redirect
          await router.invalidate()
        }
      }
    } catch {
      setError('An unexpected error occurred')
    }
  }

  const handleResendVerification = async () => {
    if (countdown > 0) return

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'email-verification',
      })
      if (result.error) {
        setError(result.error.message || 'Failed to send verification code')
      } else {
        setError('')
        setCountdown(30)
      }
    } catch {
      setError('Failed to send verification code')
    }
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      const result = await authClient.emailOtp.verifyEmail({
        email,
        otp,
      })
      if (result.error) {
        setError(result.error.message || 'Invalid verification code')
      } else {
        // Session updated - invalidate router to trigger beforeLoad redirect
        await router.invalidate()
      }
    } catch {
      setError('Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  if (pendingVerification) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-80 text-white">
          <h1 className="text-2xl mb-4 text-center">Enter Verification Code</h1>
          <p className="text-gray-400 mb-4 text-center">We sent a 6-digit code to {email}</p>

          {error && (
            <div className="mb-4 p-2 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
              {error}
            </div>
          )}

          <input
            type="text"
            placeholder="000000"
            value={otp}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6)
              setOtp(value)
            }}
            className="w-full mb-4 px-3 py-3 bg-gray-800 border border-gray-700 rounded text-white text-center text-2xl tracking-widest"
            maxLength={6}
            autoFocus
          />

          <button
            onClick={handleVerifyOtp}
            disabled={otp.length !== 6 || isVerifying}
            className="w-full py-2 bg-blue-600 rounded hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? 'Verifying...' : 'Verify'}
          </button>

          <button
            onClick={handleResendVerification}
            disabled={countdown > 0}
            className="w-full py-2 mt-3 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
          </button>

          <button
            onClick={() => {
              setPendingVerification(false)
              setOtp('')
              setCountdown(30)
              setError('')
            }}
            className="w-full py-2 mt-2 text-gray-400 hover:text-white"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-80">
        <h1 className="text-2xl text-white mb-6 text-center">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h1>

        {error && (
          <div className="mb-4 p-2 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        {isSignUp && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mb-3 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            required
          />
        )}

        {/* TODO(NEBULA-52o): Restore type="email" for validation */}
        <input
          type="text"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
          required
        />

        {/* TODO(NEBULA-52o): Restore minLength={8} for validation */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
          required
        />

        <button
          type="submit"
          className="w-full py-2 bg-blue-600 rounded hover:bg-blue-700 text-white"
        >
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </button>

        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full py-2 mt-3 text-gray-400 hover:text-white"
        >
          {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
        </button>
      </form>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { TerminalButton } from './TerminalButton'
import { NebulaLogo } from './NebulaLogo'

type OtpVerificationScreenProps = {
  email: string
  description: string
  onVerify: (otp: string) => Promise<void>
  onResend: () => Promise<void>
  onBack: () => void
  isVerifying: boolean
  verifyButtonText?: string
  verifyingButtonText?: string
}

export function OtpVerificationScreen({
  email,
  description,
  onVerify,
  onResend,
  onBack,
  isVerifying,
  verifyButtonText = '[ verify ]',
  verifyingButtonText = '[ verifying... ]',
}: OtpVerificationScreenProps) {
  const [otp, setOtp] = useState('')
  const [countdown, setCountdown] = useState(30)

  useEffect(() => {
    if (countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  const handleResend = async () => {
    if (countdown > 0) return
    await onResend()
    setCountdown(30)
  }

  return (
    <div className="text-sm w-[380px]">
      <div className="p-6">
        <div className="flex justify-center mb-6">
          <NebulaLogo />
        </div>

        <div className="text-white mb-4">
          <span className="text-gray-400">// </span>
          {description} {email}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-white font-bold">code:</span>
          <input
            type="text"
            value={otp}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6)
              setOtp(value)
            }}
            placeholder="______"
            maxLength={6}
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-gray-200 tracking-widest placeholder:text-gray-700"
          />
        </div>

        <div className="space-y-2">
          <TerminalButton
            onClick={() => onVerify(otp)}
            disabled={otp.length !== 6 || isVerifying}
            variant="primary"
          >
            {isVerifying ? verifyingButtonText : verifyButtonText}
          </TerminalButton>

          <TerminalButton onClick={handleResend} disabled={countdown > 0} variant="secondary">
            {countdown > 0 ? `[ resend in ${countdown}s ]` : '[ resend code ]'}
          </TerminalButton>

          <TerminalButton onClick={onBack} variant="link">
            {'<'} back
          </TerminalButton>
        </div>
      </div>
    </div>
  )
}

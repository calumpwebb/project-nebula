import { useEffect, useState } from 'react'

export type ToastType = 'error' | 'warning' | 'success' | 'info'

export interface ToastData {
  id: string
  type: ToastType
  message: string
  duration: number
}

interface ToastProps {
  toast: ToastData
  onDismiss: (id: string) => void
}

const typeStyles: Record<ToastType, { border: string; text: string; label: string }> = {
  error: {
    border: 'border-red-500',
    text: 'text-red-400',
    label: 'error',
  },
  warning: {
    border: 'border-yellow-500',
    text: 'text-yellow-400',
    label: 'warning',
  },
  success: {
    border: 'border-green-500',
    text: 'text-green-400',
    label: 'success',
  },
  info: {
    border: 'border-gray-500',
    text: 'text-gray-300',
    label: 'info',
  },
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)
  const styles = typeStyles[toast.type]

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
    }, toast.duration - 200)

    const dismissTimer = setTimeout(() => {
      onDismiss(toast.id)
    }, toast.duration)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(dismissTimer)
    }
  }, [toast.id, toast.duration, onDismiss])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => onDismiss(toast.id), 200)
  }

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-2 border bg-black
        font-mono text-sm select-none
        transition-all duration-200 ease-out
        ${styles.border}
        ${isExiting ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'}
      `}
    >
      <div className="flex-1">
        <span className={`${styles.text} font-bold`}>{styles.label}: </span>
        <span className="text-gray-200">{toast.message}</span>
      </div>
      <button
        onClick={handleDismiss}
        className="text-gray-500 hover:text-gray-300 transition-colors"
      >
        [x]
      </button>
    </div>
  )
}

import { createContext, useCallback, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Toast, type ToastData, type ToastType } from './Toast'

const MAX_VISIBLE_TOASTS = 3

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  error: 7000,
  warning: 5000,
  success: 4000,
  info: 5000,
}

interface ToastOptions {
  duration?: number
}

interface ToastContextValue {
  toast: {
    error: (message: string, options?: ToastOptions) => void
    warning: (message: string, options?: ToastOptions) => void
    success: (message: string, options?: ToastOptions) => void
    info: (message: string, options?: ToastOptions) => void
  }
}

export const ToastContext = createContext<ToastContextValue | null>(null)

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = useCallback((type: ToastType, message: string, options?: ToastOptions) => {
    const id = `toast-${++toastId}`
    const duration = options?.duration ?? DEFAULT_DURATIONS[type]

    setToasts((prev) => [{ id, type, message, duration }, ...prev])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const visibleToasts = toasts.slice(0, MAX_VISIBLE_TOASTS)
  const queuedCount = Math.max(0, toasts.length - MAX_VISIBLE_TOASTS)

  const toast = {
    error: (message: string, options?: ToastOptions) => addToast('error', message, options),
    warning: (message: string, options?: ToastOptions) => addToast('warning', message, options),
    success: (message: string, options?: ToastOptions) => addToast('success', message, options),
    info: (message: string, options?: ToastOptions) => addToast('info', message, options),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-auto">
          {visibleToasts.map((t) => (
            <Toast key={t.id} toast={t} onDismiss={dismissToast} />
          ))}
          {queuedCount > 0 && (
            <div className="text-center text-gray-500 font-mono text-xs">+{queuedCount} more</div>
          )}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

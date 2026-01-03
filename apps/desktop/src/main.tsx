import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConvexReactClient } from 'convex/react'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { RouterProvider } from '@tanstack/react-router'
import { attachConsole } from '@tauri-apps/plugin-log'
import { authClient } from './lib/auth-client'
import { router } from './router'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/globals.css'

declare const __APP_VERSION__: string

// Forward console.log/error/etc to Rust logger
attachConsole()
  .then(() => {
    console.info(`[frontend] Nebula v${__APP_VERSION__} starting...`)
    console.info(`[frontend] VITE_CONVEX_URL: ${import.meta.env.VITE_CONVEX_URL}`)
    console.info(`[frontend] VITE_CONVEX_SITE_URL: ${import.meta.env.VITE_CONVEX_SITE_URL}`)
    console.info(`[frontend] VITE_ENVIRONMENT: ${import.meta.env.VITE_ENVIRONMENT}`)
  })
  .catch((err) => {
    // Fallback if attachConsole fails (e.g., not in Tauri context)
    console.error('[frontend] Failed to attach console:', err)
  })

// Wrap initialization in try-catch to surface errors that happen before React renders
let convex: ConvexReactClient
try {
  convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string, {
    expectAuth: true,
  })
} catch (err) {
  console.error('[frontend] Failed to create Convex client:', err)
  // Show error in DOM since React hasn't mounted yet
  document.getElementById('root')!.innerHTML = `
    <div style="padding: 2rem; font-family: monospace; color: white; background: black; height: 100vh;">
      <h1 style="color: #ef4444;">Failed to initialize</h1>
      <pre style="color: #9ca3af;">${err}</pre>
    </div>
  `
  throw err
}

function App() {
  const { data: session, isPending } = authClient.useSession()

  return (
    <RouterProvider
      router={router}
      context={{
        auth: {
          isAuthenticated: !!session?.user,
          isLoading: isPending,
        },
      }}
    />
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <App />
      </ConvexBetterAuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
)

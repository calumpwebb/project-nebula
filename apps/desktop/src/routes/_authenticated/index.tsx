import { createFileRoute, useRouter } from '@tanstack/react-router'
import { authClient } from '../../lib/auth-client'

export const Route = createFileRoute('/_authenticated/')({
  component: Dashboard,
})

function Dashboard() {
  const { data: session } = authClient.useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await authClient.signOut()
      router.invalidate()
      router.navigate({ to: '/login' })
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-white text-center">
        <h1 className="text-2xl mb-4">Welcome to Nebula</h1>
        <p className="text-gray-400 mb-4">{session?.user?.email}</p>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}

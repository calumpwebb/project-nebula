import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_public')({
  beforeLoad: async ({ context }) => {
    // Only redirect to dashboard if definitely authenticated (not loading)
    if (!context.auth.isLoading && context.auth.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: () => <Outlet />,
})

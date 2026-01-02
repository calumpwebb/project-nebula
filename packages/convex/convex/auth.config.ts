import type { AuthConfig } from 'convex/server'

// Custom auth config for self-hosted Convex
// getAuthConfigProvider() uses process.env.CONVEX_SITE_URL which isn't available at bundle time
const CONVEX_SITE_URL = 'http://127.0.0.1:3211'

export default {
  providers: [
    {
      type: 'customJwt' as const,
      issuer: CONVEX_SITE_URL,
      applicationID: 'convex',
      algorithm: 'RS256' as const,
      jwks: `${CONVEX_SITE_URL}/api/auth/convex/jwks`,
    },
  ],
} satisfies AuthConfig

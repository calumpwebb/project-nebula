# Better Auth + Email Verification Implementation Plan

> **For Claude:** Execute this plan wave-by-wave using parallel subagents. Dispatch all agents in a wave simultaneously, wait for completion, then proceed to next wave.

**Goal:** Set up Better Auth with Convex for email/password authentication with mandatory email verification, rate limiting, and TanStack Router integration.

**Architecture:** Better Auth runs as a Convex component, handling all auth state server-side. The frontend uses `authClient` for sign up/in/out operations. Protected routes use TanStack Router's `beforeLoad` guards. All Convex functions are authenticated by default via custom function builders.

**Tech Stack:** Better Auth, Convex, TanStack Router, Resend (email), @convex-dev/rate-limiter

---

## Auth Flow Decisions

| Decision | Choice |
|----------|--------|
| Unverified login attempt | Block + offer resend |
| Code expiry | 15 minutes |
| Wrong code attempts | 5 then invalidate, force resend |
| Duplicate unverified signup | Update password + resend code |
| Signup rate limit | 3/hour per email (token bucket) |
| Email rate limit | 100/hour global (bill protection) |
| Global signup limit | 1000/hour |
| Function auth default | Authenticated (explicit opt-out for public) |

---

## Wave 0: Install Dependencies (sequential, required first)

**Single task - must complete before any waves**

### Task 0.1: Install all packages

```bash
# Backend packages
pnpm add convex@latest @convex-dev/better-auth @convex-dev/rate-limiter --filter=@nebula/convex
pnpm add better-auth@1.4.9 --save-exact --filter=@nebula/convex

# Frontend packages
pnpm add convex@latest @convex-dev/better-auth better-auth@1.4.9 @tanstack/react-router --filter=@nebula/desktop
pnpm add -D @tanstack/router-plugin --filter=@nebula/desktop
```

---

## Wave 1: Foundation Files (6 parallel agents)

No dependencies between these - all can run simultaneously.

### Agent 1.1: convex.config.ts

**File:** `packages/convex/convex/convex.config.ts` (create)

```typescript
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import ratelimiter from "@convex-dev/rate-limiter/convex.config";

const app = defineApp();
app.use(betterAuth);
app.use(ratelimiter);

export default app;
```

---

### Agent 1.2: auth.config.ts

**File:** `packages/convex/convex/auth.config.ts` (create)

```typescript
import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;
```

---

### Agent 1.3: schema.ts

**File:** `packages/convex/convex/schema.ts` (modify)

```typescript
import { defineSchema } from "convex/server";

// Better Auth component manages its own tables (user, session, account, verification)
// Add your application tables here

export default defineSchema({
  // Your app tables go here
});
```

---

### Agent 1.4: auth-client.ts

**File:** `apps/desktop/src/lib/auth-client.ts` (create)

```typescript
import { createAuthClient } from "better-auth/react";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_CONVEX_SITE_URL,
  plugins: [convexClient(), crossDomainClient()],
});

// Export typed hooks for convenience
export const { signIn, signUp, signOut, useSession } = authClient;
```

---

### Agent 1.5: router.tsx + vite.config.ts

**File 1:** `apps/desktop/src/router.tsx` (create)

```typescript
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export interface RouterContext {
  auth: {
    isAuthenticated: boolean;
    isLoading: boolean;
  };
}

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
```

**File 2:** `apps/desktop/vite.config.ts` (modify - add TanStack plugin)

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [TanStackRouterVite(), react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
```

---

### Agent 1.6: .eslintrc.js

**File:** `packages/convex/.eslintrc.js` (create)

```javascript
module.exports = {
  root: true,
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "./_generated/server",
            importNames: ["query", "mutation", "action"],
            message:
              "Import from './lib/functions' instead. Use publicQuery/publicMutation/publicAction for unauthenticated endpoints.",
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ["*.ts"],
      parser: "@typescript-eslint/parser",
    },
  ],
};
```

---

## Wave 2: Core Auth + Routes (5 parallel agents)

Depends on Wave 1 completion.

### Agent 2.1: lib/rateLimiter.ts

**Depends on:** 1.1 (convex.config.ts for components.ratelimiter)

**File:** `packages/convex/convex/lib/rateLimiter.ts` (create)

```typescript
import { RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// Check for dev environment
const isDev = process.env.CONVEX_CLOUD_URL?.includes("localhost") ?? true;

export const rateLimiter = new RateLimiter(components.ratelimiter, {
  // Per-email signup attempts: 3/hour (relaxed in dev)
  signupPerEmail: {
    kind: "token bucket",
    rate: isDev ? 100 : 3,
    period: HOUR,
    capacity: isDev ? 100 : 3,
  },

  // Per-email verification attempts: 5 then must resend
  verificationAttempts: {
    kind: "token bucket",
    rate: 5,
    period: HOUR,
    capacity: 5,
  },

  // Global signup limit: 1000/hour
  signupGlobal: {
    kind: "token bucket",
    rate: isDev ? 10000 : 1000,
    period: HOUR,
    capacity: isDev ? 10000 : 1000,
  },

  // Global email sending: 100/hour (bill protection)
  emailSendGlobal: {
    kind: "token bucket",
    rate: isDev ? 1000 : 100,
    period: HOUR,
    capacity: isDev ? 1000 : 100,
  },

  // Per-email email sending: 5/hour
  emailSendPerAddress: {
    kind: "token bucket",
    rate: isDev ? 50 : 5,
    period: HOUR,
    capacity: isDev ? 50 : 5,
  },
});
```

---

### Agent 2.2: auth.ts

**Depends on:** 1.1 (convex.config.ts), 1.2 (auth.config.ts)

**File:** `packages/convex/convex/auth.ts` (create)

```typescript
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth/minimal";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      sendVerificationEmail: async ({ user, token }) => {
        // TODO: Integrate with Resend later
        console.log(`[DEV] Verification email for ${user.email}: ${token}`);
      },
      sendResetPasswordEmail: async ({ user, token }) => {
        // TODO: Integrate with Resend later
        console.log(`[DEV] Password reset for ${user.email}: ${token}`);
      },
    },
    plugins: [crossDomain({ siteUrl }), convex({ authConfig })],
  });
};

// Public query - anyone can check if they're logged in
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});
```

---

### Agent 2.3: __root.tsx

**Depends on:** 1.5 (router.tsx)

**File:** `apps/desktop/src/routes/__root.tsx` (create)

```typescript
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { RouterContext } from "../router";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  const startDrag = () => {
    getCurrentWindow().startDragging();
  };

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Draggable Title Bar */}
      <div
        onMouseDown={startDrag}
        className="h-9 flex-shrink-0 select-none cursor-default"
      >
        <div className="w-[70px] h-full pointer-events-none" />
      </div>

      {/* Route Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
```

---

### Agent 2.4: _authenticated routes

**Depends on:** 1.5 (router.tsx)

**File 1:** `apps/desktop/src/routes/_authenticated.tsx` (create)

```typescript
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    if (context.auth.isLoading) {
      return;
    }
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: () => <Outlet />,
});
```

**File 2:** `apps/desktop/src/routes/_authenticated/index.tsx` (create)

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "../../lib/auth-client";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: session } = authClient.useSession();

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-white text-center">
        <h1 className="text-2xl mb-4">Welcome to Project Nebula</h1>
        <p className="text-gray-400 mb-4">{session?.user?.email}</p>
        <button
          onClick={() => authClient.signOut()}
          className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
```

---

### Agent 2.5: _public routes

**Depends on:** 1.4 (auth-client.ts), 1.5 (router.tsx)

**File 1:** `apps/desktop/src/routes/_public.tsx` (create)

```typescript
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_public")({
  beforeLoad: async ({ context }) => {
    if (context.auth.isLoading) {
      return;
    }
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  component: () => <Outlet />,
});
```

**File 2:** `apps/desktop/src/routes/_public/login.tsx` (create)

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "../../lib/auth-client";

export const Route = createFileRoute("/_public/login")({
  component: LoginPage,
});

function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isSignUp) {
        const result = await authClient.signUp.email({
          email,
          password,
          name,
        });
        if (result.error) {
          setError(result.error.message || "Sign up failed");
        } else {
          setPendingVerification(true);
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        });
        if (result.error) {
          if (result.error.status === 403) {
            setError("Please verify your email before signing in");
            setPendingVerification(true);
          } else {
            setError(result.error.message || "Sign in failed");
          }
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleResendVerification = async () => {
    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: window.location.origin,
      });
      setError("");
      alert("Verification email sent!");
    } catch {
      setError("Failed to resend verification email");
    }
  };

  if (pendingVerification) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-80 text-white">
          <h1 className="text-2xl mb-4 text-center">Check Your Email</h1>
          <p className="text-gray-400 mb-4 text-center">
            We sent a verification link to {email}
          </p>
          <button
            onClick={handleResendVerification}
            className="w-full py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            Resend Verification Email
          </button>
          <button
            onClick={() => setPendingVerification(false)}
            className="w-full py-2 mt-2 text-gray-400 hover:text-white"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-80">
        <h1 className="text-2xl text-white mb-6 text-center">
          {isSignUp ? "Create Account" : "Sign In"}
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

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
          required
          minLength={8}
        />

        <button
          type="submit"
          className="w-full py-2 bg-blue-600 rounded hover:bg-blue-700 text-white"
        >
          {isSignUp ? "Sign Up" : "Sign In"}
        </button>

        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full py-2 mt-3 text-gray-400 hover:text-white"
        >
          {isSignUp
            ? "Already have an account? Sign In"
            : "Need an account? Sign Up"}
        </button>
      </form>
    </div>
  );
}
```

---

## Wave 3: Secure Functions + HTTP (2 parallel agents)

Depends on Wave 2 (specifically auth.ts for authComponent).

### Agent 3.1: lib/functions.ts

**Depends on:** 2.2 (auth.ts for authComponent)

**File:** `packages/convex/convex/lib/functions.ts` (create)

```typescript
import {
  query as baseQuery,
  mutation as baseMutation,
  action as baseAction,
} from "../_generated/server";
import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { authComponent } from "../auth";

// Types for authenticated context
type AuthUser = NonNullable<
  Awaited<ReturnType<typeof authComponent.getAuthUser>>
>;

type AuthenticatedQueryCtx = QueryCtx & { user: AuthUser };
type AuthenticatedMutationCtx = MutationCtx & { user: AuthUser };
type AuthenticatedActionCtx = ActionCtx & { user: AuthUser };

// Authenticated by default - this is what you import
export function query<Args extends Record<string, unknown>, Output>(
  args: Args,
  handler: (ctx: AuthenticatedQueryCtx, args: Args) => Promise<Output> | Output
) {
  return baseQuery({
    args,
    handler: async (ctx, fnArgs) => {
      const user = await authComponent.getAuthUser(ctx);
      if (!user) {
        throw new Error("Unauthorized");
      }
      return handler({ ...ctx, user } as AuthenticatedQueryCtx, fnArgs as Args);
    },
  });
}

export function mutation<Args extends Record<string, unknown>, Output>(
  args: Args,
  handler: (
    ctx: AuthenticatedMutationCtx,
    args: Args
  ) => Promise<Output> | Output
) {
  return baseMutation({
    args,
    handler: async (ctx, fnArgs) => {
      const user = await authComponent.getAuthUser(ctx);
      if (!user) {
        throw new Error("Unauthorized");
      }
      return handler(
        { ...ctx, user } as AuthenticatedMutationCtx,
        fnArgs as Args
      );
    },
  });
}

export function action<Args extends Record<string, unknown>, Output>(
  args: Args,
  handler: (
    ctx: AuthenticatedActionCtx,
    args: Args
  ) => Promise<Output> | Output
) {
  return baseAction({
    args,
    handler: async (ctx, fnArgs) => {
      const user = await authComponent.getAuthUser(ctx);
      if (!user) {
        throw new Error("Unauthorized");
      }
      return handler(
        { ...ctx, user } as AuthenticatedActionCtx,
        fnArgs as Args
      );
    },
  });
}

// Explicit public functions - must consciously choose these
export const publicQuery = baseQuery;
export const publicMutation = baseMutation;
export const publicAction = baseAction;
```

---

### Agent 3.2: http.ts

**Depends on:** 2.2 (auth.ts for authComponent, createAuth)

**File:** `packages/convex/convex/http.ts` (create)

```typescript
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register Better Auth routes with CORS for cross-domain requests
authComponent.registerRoutes(http, createAuth, { cors: true });

export default http;
```

---

## Wave 4: Merge + Env (1 agent, sequential)

Depends on all previous waves.

### Agent 4.1: main.tsx + cleanup + env vars

**Step 1: Update main.tsx**

**File:** `apps/desktop/src/main.tsx` (modify)

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { RouterProvider } from "@tanstack/react-router";
import { authClient } from "./lib/auth-client";
import { router } from "./router";
import "./styles/globals.css";

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string,
  {
    expectAuth: true,
  }
);

function App() {
  const { data: session, isPending } = authClient.useSession();

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
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <App />
    </ConvexBetterAuthProvider>
  </React.StrictMode>
);
```

**Step 2: Delete old App.tsx**

```bash
rm apps/desktop/src/App.tsx
```

**Step 3: Create .env.local**

**File:** `apps/desktop/.env.local` (create)

```
VITE_CONVEX_URL=<your-convex-deployment-url>
VITE_CONVEX_SITE_URL=<your-convex-site-url>
VITE_SITE_URL=http://localhost:1420
```

**Step 4: Set Convex environment variables**

```bash
# Generate and set auth secret
npx convex env set BETTER_AUTH_SECRET $(openssl rand -base64 32)
npx convex env set SITE_URL http://localhost:1420
```

---

## Wave 5: Test (manual)

**Step 1: Start Convex**
```bash
pnpm --filter=@nebula/convex dev
```

**Step 2: Start desktop (separate terminal)**
```bash
pnpm --filter=@nebula/desktop dev
```

**Step 3: Verify**
- Navigate to `http://localhost:1420` → should redirect to `/login`
- Create account → should show "Check Your Email"
- Check terminal for verification token (console.log for now)

---

## Summary

| Wave | Agents | Tasks |
|------|--------|-------|
| 0 | 1 | Install dependencies |
| 1 | 6 | Foundation files (no deps) |
| 2 | 5 | Core auth + routes |
| 3 | 2 | Secure functions + HTTP |
| 4 | 1 | Merge + env setup |
| 5 | - | Manual testing |

**Total: 4 waves of parallel execution + testing**

---

## Future: Resend Integration

When ready for real emails:

```bash
pnpm add resend --filter=@nebula/convex
npx convex env set RESEND_API_KEY re_xxxxx
```

Then update `auth.ts` email functions to use Resend API.

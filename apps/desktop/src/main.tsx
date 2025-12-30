import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { RouterProvider } from "@tanstack/react-router";
import { attachConsole } from "@tauri-apps/plugin-log";
import { authClient } from "./lib/auth-client";
import { router } from "./router";
import "./styles/globals.css";

// Forward console.log/error/etc to Rust logger
attachConsole();

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

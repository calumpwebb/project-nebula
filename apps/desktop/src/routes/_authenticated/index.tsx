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

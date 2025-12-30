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

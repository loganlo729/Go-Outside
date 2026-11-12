
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const supabase = getSupabaseClient();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        throw signInError;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to log in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (googleLoading) return;

    setGoogleLoading(true);
    setError("");

    try {
      const { data, error: oauthError } =
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=/`,
          },
        });

      if (oauthError) throw oauthError;

      if (!data.url) {
        throw new Error(
          "Google authentication URL was not returned."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to log in with Google."
      );
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">WELCOME BACK</p>

        <h1>Log in</h1>

        <p className="auth-description">
          Sign in to manage your events, communities, and profile.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="button button-primary"
            disabled={loading || googleLoading}
          >
            {loading ? "Logging in..." : "Log in"}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button
            type="button"
            className="button button-secondary"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
          >
            {googleLoading
              ? "Connecting to Google..."
              : "Continue with Google"}
          </button>

          <button
            type="button"
            className="button button-secondary"
            disabled={loading || googleLoading}
            onClick={() => router.push("/account_creation")}
          >
            Create Account
          </button>

          <button
            type="button"
            className="button button-tertiary"
            disabled={loading || googleLoading}
            onClick={() => router.push("/forgot_password")}
          >
            Forgot Password?
          </button>
        </form>
      </div>
    </div>
  );
}

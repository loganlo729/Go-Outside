
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const [error, setError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = getSupabaseClient();

  // Check whether a username already exists
  async function checkUsernameExists(username: string): Promise<boolean> {
    const cleanUsername = username.trim().toLowerCase();

    const { data, error } = await supabase
      .from("Profile")
      .select("username")
      .eq("username", cleanUsername)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return !!data;
  }

  // Check the username when the user leaves the field
  async function handleCheck() {
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername) {
      setUsernameError("Username is required.");
      return;
    }

    setCheckingUsername(true);
    setUsernameError("");

    try {
      const isTaken = await checkUsernameExists(cleanUsername);

      if (isTaken) {
        setUsernameError("This username is already taken.");
      }
    } catch {
      setUsernameError("Could not check username availability.");
    } finally {
      setCheckingUsername(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setUsernameError("");

    const cleanUsername = username.trim().toLowerCase();

    try {
      // Validate username before creating the account
      if (!cleanUsername) {
        setUsernameError("Username is required.");
        return;
      }

      const isTaken = await checkUsernameExists(cleanUsername);

      if (isTaken) {
        setUsernameError("This username is already taken.");
        return;
      }

      // Create Supabase Auth account
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: cleanUsername,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.user) {
        setError("Account could not be created.");
        return;
      }

      // Redirect after successful registration
      router.push("/profile");
      router.refresh();
    } catch {
      setError("Unable to complete registration. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">WELCOME</p>

        <h1>Create Account</h1>

        <p className="auth-description">
          Create an account to manage your events, communities, and profile.
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
            Username

            <input
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setUsernameError("");
              }}
              onBlur={handleCheck}
              placeholder="Enter your username"
              autoComplete="username"
              required
            />
          </label>

          {checkingUsername && (
            <p className="auth-description">
              Checking username...
            </p>
          )}

          {usernameError && (
            <p className="auth-error" role="alert">
              {usernameError}
            </p>
          )}

          <label>
            Password

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="new-password"
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
            disabled={loading || checkingUsername}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <button
            type="button"
            className="button button-secondary"
            disabled={loading}
            onClick={() => router.push("/login")}
          >
            Log in
          </button>
        </form>
      </div>
    </div>
  );
}

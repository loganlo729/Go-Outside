
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../lib/supabase/client";

export default function CompleteProfilePage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkProfile() {
      try {
        const { data, error: authError } =
          await supabase.auth.getUser();

        if (authError || !data.user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("Profile")
            .select("username")
            .eq("userID", data.user.id)
            .maybeSingle();

        if (profileError) throw profileError;

        if (!mounted) return;

        if (profile?.username?.trim()) {
          router.replace("/profile");
          return;
        }

        setUserId(data.user.id);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your profile."
          );
        }
      } finally {
        if (mounted) setChecking(false);
      }
    }

    void checkProfile();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId || saving) return;

    const cleanUsername = username.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError(
        "Username must be 3–20 characters using letters, numbers, or underscores."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { data: taken, error: checkError } =
        await supabase.rpc("is_username_taken", {
          requested_username: cleanUsername,
        });

      if (checkError) throw checkError;

      if (taken) {
        setError("This username is already taken.");
        return;
      }

      const { data: existingProfile, error: lookupError } =
        await supabase
          .from("Profile")
          .select("userID")
          .eq("userID", userId)
          .maybeSingle();

      if (lookupError) throw lookupError;

      if (!existingProfile) {
        throw new Error(
          "Your profile record hasn't been created yet. Please contact support."
        );
      }

      const { data: updatedProfile, error: updateError } =
        await supabase
          .from("Profile")
          .update({ username: cleanUsername })
          .eq("userID", userId)
          .select("username")
          .single();

      if (updateError) throw updateError;

      if (!updatedProfile) {
        throw new Error("Username could not be saved.");
      }

      router.replace("/profile");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p>Checking your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">ALMOST THERE</p>

        <h1>Complete Your Profile</h1>

        <p className="auth-description">
          Choose a username to finish setting up your
          GoOutside account.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setError("");
              }}
              placeholder="Choose a username"
              autoComplete="username"
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
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
            disabled={saving || !userId}
          >
            {saving ? "Saving..." : "Complete Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}

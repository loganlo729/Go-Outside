
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

        console.log("Complete profile authentication:", {
          userId: data.user?.id ?? null,
          error: authError?.message ?? null,
          currentUrl: window.location.href,
        });

        if (authError || !data.user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("Profile")
            .select("profileCompleted")
            .eq("userID", data.user.id)
            .maybeSingle();

        if (profileError) throw profileError;

        if (!mounted) return;

        // Only redirect if the user has actually completed
        // registration, not merely received an automatic username.
        if (profile?.profileCompleted === true) {
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
        if (mounted) {
          setChecking(false);
        }
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
      // Confirm that the current session still belongs
      // to the user completing registration.
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      if (authData.user.id !== userId) {
        throw new Error(
          "Your session has changed. Please reload the page."
        );
      }

      // Check username availability.
      const { data: taken, error: checkError } =
        await supabase.rpc("is_username_taken", {
          requested_username: cleanUsername,
        });

      if (checkError) throw checkError;

      if (taken) {
        setError("This username is already taken.");
        return;
      }

      // Verify that the user's profile exists.
      const { data: existingProfile, error: lookupError } =
        await supabase
          .from("Profile")
          .select("userID, profileCompleted")
          .eq("userID", userId)
          .maybeSingle();

      if (lookupError) throw lookupError;

      if (!existingProfile) {
        throw new Error(
          "Your profile record hasn't been created yet. Please contact support."
        );
      }

      if (existingProfile.profileCompleted === true) {
        router.replace("/profile");
        router.refresh();
        return;
      }

      // Save the selected username and mark
      // registration as completed together.
      const { data: updatedProfile, error: updateError } =
        await supabase
          .from("Profile")
          .update({
            username: cleanUsername,
            profileCompleted: true,
          })
          .eq("userID", userId)
          .eq("profileCompleted", false)
          .select("username, profileCompleted")
          .single();

      if (updateError) throw updateError;

      if (
        !updatedProfile ||
        updatedProfile.username !== cleanUsername ||
        updatedProfile.profileCompleted !== true
      ) {
        throw new Error(
          "Username could not be saved. Please try again."
        );
      }

      // Send the welcome email after successful registration.
      // Email failure should not prevent account completion.
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          const response = await fetch("/api/send-welcome", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (!response.ok) {
            console.error(
              "Welcome email request failed:",
              response.status
            );
          }
        }
      } catch (emailError) {
        console.error("Welcome email error:", emailError);
      }

      // Registration is complete.
      router.replace("/profile");
      router.refresh();
    } catch (err) {
      console.error("Complete profile error:", err);

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
              disabled={saving || !userId}
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

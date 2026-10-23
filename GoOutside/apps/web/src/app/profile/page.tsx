"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "../../lib/supabase/client";

const accentColors = [
  "#0D9488",
  "#6366F1",
  "#3B82F6",
  "#EC4899",
  "#F59E0B",
];

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  const [original, setOriginal] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
  });

  const [darkMode, setDarkMode] = useState(false);
  const [accentColor, setAccentColor] = useState("#0D9488");

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();

    async function loadUser() {
      try {
        // First, independently verify authentication.
        const { data, error: authError } =
          await supabase.auth.getUser();

        if (!mounted) return;

        if (authError || !data.user) {
          setUser(null);
          return;
        }

        const currentUser = data.user;

        // Authentication is successful.
        setUser(currentUser);

        // Set defaults using authenticated user information.
        const profile = {
          fullName: "",
          email: currentUser.email ?? "",
          phone: currentUser.user_metadata?.phone ?? "",
          location: currentUser.user_metadata?.location ?? "",
        };

        // Fetch display name separately.
        const { data: profileData, error: profileError } =
          await supabase
            .from("Profile")
            .select("displayName")
            .eq("userID", currentUser.id)
            .maybeSingle();

        if (!mounted) return;

        if (profileError) {
          console.error(
            "Profile lookup failed:",
            profileError
          );
          setError("Unable to load your display name.");
        } else {
          profile.fullName = profileData?.displayName ?? "";
        }

        setFullName(profile.fullName);
        setEmail(profile.email);
        setPhone(profile.phone);
        setLocation(profile.location);
        setOriginal(profile);
      } catch (err) {
        console.error("Account loading error:", err);

        if (mounted) {
          setError("Unable to load your account.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  function handleCancel() {
    setFullName(original.fullName);
    setEmail(original.email);
    setPhone(original.phone);
    setLocation(original.location);
    setError("");
    setSuccess("");
  }

  async function handleSave() {
    if (!user || saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const supabase = getSupabaseClient();

      const newDisplayName = fullName.trim();

      if (!newDisplayName) {
        throw new Error("Display name cannot be empty.");
      }

      // Update the Profile table
      const { data: updatedProfile, error: profileError } =
        await supabase
          .from("Profile")
          .update({
            displayName: newDisplayName,
          })
          .eq("userID", user.id)
          .select("displayName")
          .single();

      if (profileError) throw profileError;

      // Update remaining fields in Supabase Auth
      const emailChanged = email.trim() !== user.email;

      const { data, error: authError } =
        await supabase.auth.updateUser({
          ...(emailChanged
            ? { email: email.trim() }
            : {}),
          data: {
            phone: phone.trim(),
            location: location.trim(),
          },
        });

      if (authError) throw authError;

      if (data.user) setUser(data.user);

      const saved = {
        fullName: updatedProfile.displayName,
        email: data.user?.email ?? user.email ?? "",
        phone: phone.trim(),
        location: location.trim(),
      };

      setOriginal(saved);
      setFullName(saved.fullName);
      setPhone(saved.phone);
      setLocation(saved.location);

      setSuccess(
        emailChanged
          ? "Profile updated. Check your email to confirm the address change."
          : "Profile changes saved successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save changes."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setError("");

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  async function handlePasswordReset() {
    if (!user?.email) return;

    setError("");
    setSuccess("");

    const supabase = getSupabaseClient();

    const { error } =
      await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(
        "Password reset email sent. Check your inbox."
      );
    }
  }

  if (loading) {
    return (
      <div className="account-page">
        <p>Loading account settings...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="account-page">
        <div className="account-panel account-guest">
          <h1>Not logged in</h1>
          <p>Log in to manage your account settings.</p>
          <Link href="/login" className="account-btn primary">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  const displayName =
    fullName.trim() ||
    user.user_metadata?.username ||
    email.split("@")[0] ||
    "User";

  const initials = displayName
    .split(" ")
    .map((part: string) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const memberSince = new Date(
    user.created_at
  ).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main
      className="account-page"
      style={
        {
          "--account-accent": accentColor,
        } as React.CSSProperties
      }
    >
      {/* Page heading */}
      <div className="account-heading">
        <div>
          <h1>Account Settings</h1>
          <p>
            Manage your profile, account preferences,
            and subscription status
          </p>
        </div>

        <div className="account-actions">
          <button
            type="button"
            className="account-btn outline"
            onClick={handleCancel}
          >
            Cancel
          </button>

          <button
            type="button"
            className="account-btn primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {error && <p className="auth-error">{error}</p>}
      {success && <p className="auth-success">{success}</p>}

      {/* Profile banner */}
      <section className="account-banner">
        <div className="account-cover" />

        <div className="account-identity">
          <div className="account-avatar">
            {initials}
          </div>

          <div className="account-identity-info">
            <div className="account-name-row">
              <h2>{displayName}</h2>
            </div>

            <p>
              Member since {memberSince}
              {location && ` • ${location}`}
            </p>
          </div>

          <div className="account-image-actions">
            <button
              type="button"
              className="account-btn outline"
              title="Upload a new cover image"
            >
              Change Cover
            </button>

            <button
              type="button"
              className="account-btn outline"
              title="Upload a new avatar image"
            >
              Edit Avatar
            </button>
          </div>
        </div>
      </section>

      {/* Two-column layout */}
      <div className="account-grid">
        <div className="account-column">
          {/* Personal information */}
          <section className="account-panel">
            <h2>Personal Information</h2>
            <p className="account-description">
              Update your default name, contact information,
              and public profile data
            </p>

            <div className="account-form">
              <label>
                <span>
                  Display Name <strong>*</strong>
                </span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                  placeholder="Your display name"
                />
              </label>

              <label>
                <span>
                  Email Address <strong>*</strong>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="name@example.com"
                />
              </label>

              <label>
                <span>Phone Number</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  placeholder="+1 (555) 000-0000"
                />
              </label>

              <label>
                <span>Location</span>
                <input
                  type="text"
                  value={location}
                  onChange={(event) =>
                    setLocation(event.target.value)
                  }
                  placeholder="City, State"
                />
              </label>
            </div>
          </section>

          {/* Theme settings */}
          <section className="account-panel">
            <h2>Theme & Personalization</h2>
            <p className="account-description">
              Choose the interface theme that best
              represents your visual identity
            </p>

            <div className="account-setting-row">
              <div>
                <strong>Automatic dark mode</strong>
                <small>
                  Sync with your system preferences
                </small>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={darkMode}
                className={`account-switch ${
                  darkMode ? "enabled" : ""
                }`}
                onClick={() =>
                  setDarkMode((previous) => !previous)
                }
                title="Theme preference preview only"
              >
                <span />
              </button>
            </div>

            <div className="account-color-setting">
              <strong>Active Accent Color</strong>

              <div className="account-colors">
                {accentColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="account-color"
                    style={{ backgroundColor: color }}
                    aria-label={`Select ${color} accent`}
                    aria-pressed={accentColor === color}
                    onClick={() => setAccentColor(color)}
                  >
                    {accentColor === color ? "✓" : ""}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="account-column">
          {/* Subscription */}
          <section className="account-panel">
            <div className="account-panel-heading">
              <h2>Subscription Plan</h2>
              <span className="account-badge neutral">
                No plan connected
              </span>
            </div>

            <div className="account-plan">
              <div className="account-plan-title">
                <strong>Account Plan</strong>
                <strong>Not configured</strong>
              </div>
              <p>
                Subscription details will appear here
                when billing is integrated.
              </p>
            </div>

            <div className="account-plan-actions">
              <button
                type="button"
                className="account-btn primary"
                disabled
              >
                Upgrade Plan
              </button>

              <button
                type="button"
                className="account-btn outline"
                disabled
              >
                Update Billing
              </button>

              <button
                type="button"
                className="account-btn danger-soft"
                disabled
              >
                Cancel Subscription
              </button>
            </div>
          </section>

          {/* Security */}
          <section className="account-panel">
            <h2>Security & Active Sessions</h2>
            <p className="account-description">
              Manage your password settings and
              monitor account access
            </p>

            <div className="account-session">
              <div className="account-session-icon">
                ▣
              </div>

              <div>
                <strong>Current Browser Session</strong>
                <small>
                  You are currently signed in
                </small>
              </div>

              <span className="account-badge current">
                Current
              </span>
            </div>

            <div className="account-security-row">
              <div>
                <strong>Password Settings</strong>
                <small>
                  Manage your account password
                </small>
              </div>

              <button
                type="button"
                className="account-btn outline"
                onClick={handlePasswordReset}
              >
                Reset Password
              </button>
            </div>

            <div className="account-security-row">
              <div>
                <p>
                  <strong>Sign Out</strong>
                </p>
              </div>

              <button
                type="button"
                className="account-btn danger"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
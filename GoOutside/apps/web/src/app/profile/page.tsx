"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../lib/supabase/client";

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const supabase = getSupabaseClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setEmail(user?.email ?? null);
      setLoading(false);
    }

    loadUser();
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseClient();

    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="page-container page-section">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="page-container page-section">
        <h1>Not logged in</h1>
        <p>You need to log in to view this page.</p>
      </div>
    );
  }

  return (
    <div className="page-container page-section">
      <div className="profile-header">
        <div className="profile-avatar">
          {email.charAt(0).toUpperCase()}
        </div>

        <div>
          <p className="eyebrow">PROFILE</p>
          <h1>Your Profile</h1>
          <p>{email}</p>
        </div>
      </div>

      <div style={{ marginTop: "32px" }}>
        <button
          type="button"
          onClick={handleLogout}
          className="button button-secondary"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
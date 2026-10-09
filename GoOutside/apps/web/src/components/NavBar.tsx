"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../lib/supabase/client";

export default function Navbar() {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Check whether the user is already logged in
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsLoggedIn(!!user);
      setLoading(false);
    }

    checkUser();

    // Update navbar whenever authentication changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout failed:", error.message);
      return;
    }

    setIsLoggedIn(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="logo">
          Go Outside
        </Link>

        <nav className="nav-links">
          <Link href="/">Home</Link>
          <Link href="/events">Events</Link>
          <Link href="/communities">Communities</Link>
        </nav>

        <div className="nav-actions">
          {!loading && (
            <>
              {isLoggedIn ? (
                <button
                  type="button"
                  className="login-link"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              ) : (
                <Link href="/login" className="login-link">
                  Log in
                </Link>
              )}
            </>
          )}

          {isLoggedIn && (
            <Link href="/profile" className="profile-button">
              Profile
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

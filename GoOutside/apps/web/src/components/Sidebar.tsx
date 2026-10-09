"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "../lib/supabase/client";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      setLoading(false);
    }

    loadUser();

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setEmail(session?.user?.email ?? null);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout failed:", error.message);
      return;
    }

    router.push("/login");
    router.refresh();
  }

  const links = [
    { href: "/", label: "Home", icon: "⌂" },
    { href: "/events", label: "Events", icon: "▦" },
    { href: "/communities", label: "Communities", icon: "♧" },
  ];

  return (
    <aside className="sidebar">
      <Link href="/" className="sidebar-logo">
        <img
            src="/logo.svg"
            alt="GoOutside Logo"
            className="sidebar-logo-image"
        />
      </Link>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              pathname === link.href
                ? "sidebar-link active"
                : "sidebar-link"
            }
          >
            <span className="sidebar-link-icon">
              {link.icon}
            </span>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {!loading && (
          email ? (
            <>
              <Link href="/profile" className="sidebar-profile">
                <div className="sidebar-avatar">
                  <span>👤</span>
                </div>

                <div className="sidebar-profile-info">
                  <strong>My Profile</strong>
                  <small>{email}</small>
                </div>
              </Link>

              <button
                type="button"
                className="sidebar-logout"
                onClick={handleLogout}
              >
                Log out
              </button>
            </>
          ) : (
            <Link href="/login" className="sidebar-login">
              Log in
            </Link>
          )
        )}
      </div>
    </aside>
  );
}

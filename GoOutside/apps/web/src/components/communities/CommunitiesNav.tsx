"use client";

// Navigation
import Link from "next/link";
import {
  usePathname,
  useSearchParams,
} from "next/navigation";

// Styles
import styles from "./CommunityDashboard.module.css";

// ==================================================
// Communities Navigation
// ==================================================

export default function CommunitiesNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --------------------------------------------------
  // Determine Current Page
  // --------------------------------------------------

  const from = searchParams.get("from");

  // --------------------------------------------------
  // My Communities
  // --------------------------------------------------

  const isMyCommunities =
    pathname === "/communities/my_communities" ||
    pathname === "/communities/create_community" ||
    (
      pathname.startsWith("/communities/") &&
      from === "my_communities"
    );

  // --------------------------------------------------
  // All Communities
  // --------------------------------------------------

  const isAllCommunities =
    pathname === "/communities" ||
    pathname === "/communities/all_communities" ||
    (
      pathname.startsWith("/communities/") &&
      !isMyCommunities
    );

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <nav
      className={styles.tabs}
      aria-label="Communities navigation"
    >
      {/* All Communities */}

      <Link
        href="/communities/all_communities"
        className={styles.tab}
        aria-current={
          isAllCommunities ? "page" : undefined
        }
      >
        All Communities
      </Link>

      {/* My Communities */}

      <Link
        href="/communities/my_communities"
        className={styles.tab}
        aria-current={
          isMyCommunities ? "page" : undefined
        }
      >
        My Communities
      </Link>
    </nav>
  );
}
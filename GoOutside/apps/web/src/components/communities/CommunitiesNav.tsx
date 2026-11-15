"use client";

// Navigation
import Link from "next/link";
import { usePathname } from "next/navigation";

// Styles
import styles from "./CommunityDashboard.module.css";

// --------------------------------------------------
// Communities Navigation
// --------------------------------------------------

export default function CommunitiesNav() {
  const pathname = usePathname();

  const isAllCommunities =
    pathname === "/communities" ||
    pathname === "/communities/all_communities";

  const isMyCommunities =
    pathname === "/communities/my_communities";

  return (
    <nav
      className={styles.tabs}
      aria-label="Communities navigation"
    >
      <Link
        href="/communities/all_communities"
        className={styles.tab}
        aria-current={
          isAllCommunities ? "page" : undefined
        }
      >
        All Communities
      </Link>

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

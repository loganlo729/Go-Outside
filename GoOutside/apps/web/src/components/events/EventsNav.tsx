"use client";

// Navigation component
import Link from "next/link";

// Navigation hooks
import {
  usePathname,
  useSearchParams,
} from "next/navigation";

// Component styles
import styles from "./EventDashboard.module.css";


// --------------------------------------------------
// Events Navigation
// --------------------------------------------------

export default function EventsNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --------------------------------------------------
  // Determine Active Dashboard
  // --------------------------------------------------

  const from = searchParams.get("from");
  
  const isAllEvents =
    pathname === "/events" ||
    pathname === "/events/all_events" ||
    pathname.startsWith("/events/category/") ||
    (pathname.startsWith("/events/") &&
      from === "all_events");

  const isMyEvents =
    pathname === "/events/my_events" ||
    pathname.startsWith("/events/collections/") ||
    pathname === "/events/create_event" ||
    (pathname.startsWith("/events/") &&
      from === "my_events");

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <nav
      className={styles.tabs}
      aria-label="Events navigation"
    >
      <Link
        href="/events/all_events"
        className={styles.tab}
        aria-current={
          isAllEvents ? "page" : undefined
        }
      >
        All Events
      </Link>

      <Link
        href="/events/my_events"
        className={styles.tab}
        aria-current={
          isMyEvents ? "page" : undefined
        }
      >
        My Events
      </Link>
    </nav>
  );
}


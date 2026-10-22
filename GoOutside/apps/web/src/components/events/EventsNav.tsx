
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function EventsNav() {
  const pathname = usePathname();

  return (
    <nav className="events-nav">
      <Link
        href="/events/all_events"
        className={
          pathname === "/events/all_events"
            ? "events-nav-link active"
            : "events-nav-link"
        }
      >
        All Events
      </Link>

      <Link
        href="/events/my_events"
        className={
          pathname === "/events/my_events"
            ? "events-nav-link active"
            : "events-nav-link"
        }
      >
        My Events
      </Link>
    </nav>
  );
}

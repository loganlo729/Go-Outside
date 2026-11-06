
// Navigation
import Link from "next/link";

// Event type
import type { EventRecord } from "../../types/event";

// Event card component
import EventCard from "./EventCard";

// Component styles
import styles from "./EventDashboard.module.css";

// --------------------------------------------------
// Event Section Props
// --------------------------------------------------

type EventSectionProps = {
  title: string;
  events: EventRecord[];
  from?: "all_events" | "my_events";
  viewAllHref?: string;
};

// --------------------------------------------------
// Event Section
// --------------------------------------------------

export default function EventSection({
  title,
  events,
  from = "all_events",
  viewAllHref,
}: EventSectionProps) {
  // Don't render empty sections.
  if (!events.length) {
    return null;
  }

  return (
    <section
      className={`${styles.section} ${styles.carouselContainer}`}
      aria-label={title}
    >
      {/* Section Header */}

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          {title}
        </h2>

        {/* View All Button */}

        {viewAllHref && (
          <Link
            href={viewAllHref}
            className={styles.viewAllLink}
          >
            View All
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>

      {/* Horizontally Scrollable Event Cards */}

      <div
        className={styles.rail}
        tabIndex={0}
        aria-label={`Scroll ${title} events horizontally`}
      >
        {events.map((event) => (
          <EventCard
            key={event.eventID}
            event={event}
            from={from}
          />
        ))}
      </div>
    </section>
  );
}

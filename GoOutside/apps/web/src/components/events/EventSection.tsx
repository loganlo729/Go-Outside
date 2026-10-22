
import type { EventRecord } from "../../types/event";

import EventCard from "./EventCard";

import styles from "./EventDashboard.module.css";

export default function EventSection({
  title,
  events,
}: {
  title: string;
  events: EventRecord[];
}) {
  // Don't render empty sections
  if (!events.length) {
    return null;
  }

  return (
    <section
      className={styles.section}
      aria-label={title}
    >
      {/* Section Title */}

      <h2 className={styles.sectionTitle}>
        {title}
      </h2>

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
          />
        ))}
      </div>
    </section>
  );
}

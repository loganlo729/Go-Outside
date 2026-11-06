
"use client";

// Navigation
import Link from "next/link";
import { useParams } from "next/navigation";

// Event components
import EventCard from "../../../../components/events/EventCard";

// Events hook
import { useEvents } from "../../../../hooks/useEvents";

// Component styles
import styles from "../../../../components/events/EventDashboard.module.css";

// --------------------------------------------------
// Category Events Page
// --------------------------------------------------

export default function CategoryEventsPage() {
  const { categoryID } = useParams<{
    categoryID: string;
  }>();

  const {
    events,
    categories,
    loading,
    error,
    retry,
  } = useEvents();

  // Identify category
  const isFeatured = categoryID === "featured";

  const category = categories.find(
    (item) => item.categoryID === categoryID
  );

  const title = isFeatured
    ? "Featured Events"
    : category?.categoryName ?? "Category Events";

  // Filter matching events
  const matchingEvents = events.filter((event) =>
    isFeatured
      ? event.isFeatured
      : event.categoryID === categoryID
  );

  return (
    <main className={styles.viewAllPage}>

      {/* Back to All Events */}

      <Link
        href="/events/all_events"
        className={styles.viewAllBack}
      >
        <span aria-hidden="true">←</span>
        Back to All Events
      </Link>

      {/* Category Heading */}

      <h1 className={styles.heading}>
        {title}
      </h1>

      {/* Event Grid */}

      {loading ? (
        <p className={styles.message}>
          Loading events...
        </p>
      ) : error ? (
        <div>
          <p className={styles.error} role="alert">
            {error}
          </p>

          <button
            type="button"
            className={styles.retry}
            onClick={retry}
          >
            Retry
          </button>
        </div>
      ) : !isFeatured && !category ? (
        <p className={styles.message}>
          Category not found.
        </p>
      ) : matchingEvents.length === 0 ? (
        <p className={styles.message}>
          No upcoming events found.
        </p>
      ) : (
        <div className={styles.viewAllGrid}>
          {matchingEvents.map((event) => (
            <EventCard
              key={event.eventID}
              event={event}
              from="all_events"
            />
          ))}
        </div>
      )}
    </main>
  );
}

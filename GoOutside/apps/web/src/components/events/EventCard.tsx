
import type { EventRecord } from "../../types/event";

import {
  formatEventCost,
  formatEventDate,
} from "../../utils/eventFormat";

import styles from "./EventDashboard.module.css";

// --------------------------------------------------
// Title Formatting
// --------------------------------------------------

function formatEventTitle(
  title: string | null,
  maxLength = 22
): string {
  if (!title) {
    return "Untitled Event";
  }

  return title.length > maxLength
    ? `${title.slice(0, maxLength)}...`
    : title;
}

// --------------------------------------------------
// Event Card
// --------------------------------------------------

export default function EventCard({
  event,
}: {
  event: EventRecord;
}) {
  return (
    <article className={styles.card}>
      {/* Event Image */}

      {event.eventImageURL?.startsWith("https://") ? (
        <img
          className={styles.image}
          src={event.eventImageURL}
          alt={event.eventTitle ?? "Event photo"}
          loading="lazy"
        />
      ) : (
        <div className={styles.imagePlaceholder}>
          GO OUTSIDE
        </div>
      )}

      {/* Event Information */}

      <div className={styles.cardBody}>
        {/* Date */}

        <p className={styles.date}>
          {formatEventDate(event.eventStartTime)}
        </p>

        {/* Title */}

        <h3
          className={styles.cardTitle}
          title={event.eventTitle ?? "Untitled Event"}
        >
          {formatEventTitle(event.eventTitle)}
        </h3>

        {/* Location */}

        <p className={styles.location}>
          ⌖ {event.eventLocation || "Location TBD"}
        </p>

        {/* Cost and Featured Badge */}

        <div className={styles.cardFooter}>
          <strong>
            {formatEventCost(event.eventCost)}
          </strong>

          {event.isFeatured && (
            <span className={styles.featuredBadge}>
              Featured
            </span>
          )}
        </div>
      </div>
    </article>
  );
}


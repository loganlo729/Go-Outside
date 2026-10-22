
import type { EventRecord } from "../../types/event";

import {
  formatEventCost,
  formatEventDate,
} from "../../utils/eventFormat";

import styles from "./EventDashboard.module.css";

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
          alt=""
        />
      ) : (
        <div className={styles.imagePlaceholder}>
          GO OUTSIDE
        </div>
      )}

      {/* Event Information */}

      <div className={styles.cardBody}>
        <p className={styles.date}>
          {formatEventDate(event.eventStartTime)}
        </p>

        <h3 className={styles.cardTitle}>
          {event.eventTitle}
        </h3>

        <p className={styles.location}>
          ⌖ {event.eventLocation || "Location TBD"}
        </p>

        {/* Event Footer */}

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

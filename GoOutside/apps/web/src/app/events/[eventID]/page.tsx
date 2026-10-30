
"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  getEventByID,
  getEventCategories,
} from "../../../services/events";

import type {
  EventRecord,
} from "../../../types/event";

import {
  formatEventCost,
  formatEventDate,
} from "../../../utils/eventFormat";

import styles from "./EventDetails.module.css";

// --------------------------------------------------
// Event Details Page
// --------------------------------------------------

export default function EventDetailsPage() {
  const { eventID } = useParams<{
    eventID: string;
  }>();

  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [event, setEvent] = useState<EventRecord | null>(
    null
  );

  const [categoryName, setCategoryName] = useState(
    "Uncategorized"
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Load Event Details
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadEvent() {
      setLoading(true);
      setError("");
      setEvent(null);
      setCategoryName("Uncategorized");

      try {
        // Get the event and available categories.

        const [eventResult, categories] =
          await Promise.all([
            getEventByID(eventID),
            getEventCategories().catch(() => []),
          ]);

        if (!active) {
          return;
        }

        setEvent(eventResult);

        // Find the event's category name.

        if (eventResult?.categoryID) {
          const category = categories.find(
            (item) =>
              item.categoryID === eventResult.categoryID
          );

          setCategoryName(
            category?.categoryName ??
              "Uncategorized"
          );
        }
        } catch (error) {
          console.error("Event details loading failed:", error);
          console.error("Requested event ID:", eventID);

          if (active) {
            const message =
              error instanceof Error
                ? error.message
                : error &&
                    typeof error === "object" &&
                    "message" in error &&
                    typeof error.message === "string"
                  ? error.message
                  : String(error);

            setError(message);
          }
        } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadEvent();

    return () => {
      active = false;
    };
  }, [eventID]);

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Navigation */}

        <div className={styles.navigation}>
          <Link
            href="/events/all_events"
            className={styles.backLink}
          >
            ← Back to Events
          </Link>
        </div>

        {/* Loading */}

        {loading && (
          <p className={styles.message}>
            Loading event details...
          </p>
        )}

        {/* Error */}

        {!loading && error && (
          <p
            role="alert"
            className={styles.error}
          >
            {error}
          </p>
        )}

        {/* Event Not Found */}

        {!loading && !error && !event && (
          <div className={styles.emptyState}>
            <h1>Event Not Found</h1>

            <p>
              This event no longer exists.
            </p>

            <Link href="/events/all_events">
              Browse Events
            </Link>
          </div>
        )}

        {/* ----------------------------------------
            Event Details
        ---------------------------------------- */}

        {!loading && !error && event && (
          <>
            {/* Event Photo */}

            <div className={styles.hero}>
              {event.eventImageURL?.startsWith(
                "https://"
              ) ? (
                <img
                  src={event.eventImageURL}
                  alt={
                    event.eventTitle ??
                    "Event photo"
                  }
                  className={styles.heroImage}
                />
              ) : (
                <div className={styles.imagePlaceholder}>
                  GO OUTSIDE
                </div>
              )}
            </div>

            {/* Event Header */}

            <div className={styles.header}>
              <div className={styles.headerContent}>
                <p className={styles.category}>
                  {categoryName}
                </p>

                <h1 className={styles.title}>
                  {event.eventTitle ||
                    "Untitled Event"}
                </h1>

                <div className={styles.badges}>
                  {event.isFeatured && (
                    <span className={styles.featuredBadge}>
                      Featured Event
                    </span>
                  )}

                  {event.status === "drafted" && (
                    <span className={styles.draftBadge}>
                      Draft
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.priceBox}>
                <span className={styles.priceLabel}>
                  Event Cost
                </span>

                <strong className={styles.price}>
                  {formatEventCost(event.eventCost)}
                </strong>
              </div>
            </div>

            




            {/* ----------------------------------------
                Description and Event Information
            ---------------------------------------- */}

            <div className={styles.detailsGrid}>
              {/* Event Description */}

              <section className={styles.descriptionCard}>
                <h2 className={styles.sectionTitle}>
                  About This Event
                </h2>

                <p className={styles.description}>
                  {event.eventDescription ||
                    "No description has been provided for this event."}
                </p>
              </section>

              {/* Event Information */}

              <aside className={styles.infoCard}>
                <h2 className={styles.sectionTitle}>
                  Event Information
                </h2>

                {/* Start Date */}

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>
                    Start Date & Time
                  </span>

                  <span className={styles.infoValue}>
                    {formatEventDate(
                      event.eventStartTime
                    )}
                  </span>
                </div>

                {/* End Date */}

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>
                    End Date & Time
                  </span>

                  <span className={styles.infoValue}>
                    {formatEventDate(
                      event.eventEndTime
                    )}
                  </span>
                </div>

                {/* Location */}

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>
                    Location
                  </span>

                  <span className={styles.infoValue}>
                    {event.eventLocation ||
                      "Location TBD"}
                  </span>
                </div>

                {/* Category */}

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>
                    Category
                  </span>

                  <span className={styles.infoValue}>
                    {categoryName}
                  </span>
                </div>

                {/* Cost */}

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>
                    Cost
                  </span>

                  <span className={styles.infoValue}>
                    {formatEventCost(
                      event.eventCost
                    )}
                  </span>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

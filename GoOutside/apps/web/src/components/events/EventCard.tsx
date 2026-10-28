
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { EventRecord } from "../../types/event";

import {
  formatEventCost,
  formatEventDate,
} from "../../utils/eventFormat";

import {
  eventClient,
  getEventRSVP,
  addEventRSVP,
  removeEventRSVP,
} from "../../services/events";

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
  const router = useRouter();

  // --------------------------------------------------
  // RSVP State
  // --------------------------------------------------

  const [userID, setUserID] = useState<string | null>(null);
  const [going, setGoing] = useState(false);

  const [loadingRSVP, setLoadingRSVP] = useState(true);
  const [savingRSVP, setSavingRSVP] = useState(false);

  const [rsvpError, setRSVPError] = useState("");

  const isPublished = event.status === "publicActive";

  // --------------------------------------------------
  // Load Current User's RSVP
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadRSVP() {
      setLoadingRSVP(true);
      setGoing(false);
      setUserID(null);
      setRSVPError("");

      if (!isPublished) {
        setLoadingRSVP(false);
        return;
      }

      try {
        const client = eventClient();

        // Check whether the user has a session.

        const {
          data: { session },
          error: sessionError,
        } = await client.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!active) {
          return;
        }

        // Signed-out users can still see the RSVP button.

        if (!session) {
          return;
        }

        // Verify authenticated user.

        const {
          data: { user },
          error: authError,
        } = await client.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!active || !user) {
          return;
        }

        setUserID(user.id);

        // Retrieve RSVP status from Supabase.

        const hasRSVP = await getEventRSVP(
          event.eventID,
          user.id
        );

        if (active) {
          setGoing(hasRSVP);
        }
      } catch (error) {
        if (active) {
          setRSVPError(
            error instanceof Error
              ? error.message
              : "Unable to load RSVP."
          );
        }
      } finally {
        if (active) {
          setLoadingRSVP(false);
        }
      }
    }

    void loadRSVP();

    return () => {
      active = false;
    };
  }, [event.eventID, isPublished]);

  // --------------------------------------------------
  // Toggle RSVP
  // --------------------------------------------------

  async function handleRSVP() {
    if (
      !isPublished ||
      loadingRSVP ||
      savingRSVP
    ) {
      return;
    }

    setRSVPError("");

    // Require authentication before saving an RSVP.

    if (!userID) {
      router.push("/login");
      return;
    }

    setSavingRSVP(true);

    try {
      if (going) {
        // Cancel RSVP.

        await removeEventRSVP(
          event.eventID,
          userID
        );

        setGoing(false);
      } else {
        // RSVP to event.

        await addEventRSVP(
          event.eventID,
          userID
        );

        setGoing(true);
      }
    } catch (error) {
      setRSVPError(
        error instanceof Error
          ? error.message
          : "Unable to update RSVP."
      );
    } finally {
      setSavingRSVP(false);
    }
  }

  // --------------------------------------------------
  // Render Event Card
  // --------------------------------------------------

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

        {/* Card Footer */}

        <div className={styles.cardFooter}>
          {/* Event Cost */}

          <strong>
            {formatEventCost(event.eventCost)}
          </strong>

          {/* Featured Badge / RSVP */}

          <div className={styles.rsvpActions}>
            {event.isFeatured && (
              <span className={styles.featuredBadge}>
                Featured
              </span>
            )}

            {isPublished && (
              <button
                type="button"
                className={
                  going
                    ? styles.goingButton
                    : styles.rsvpButton
                }
                onClick={() => void handleRSVP()}
                disabled={loadingRSVP || savingRSVP}
                aria-pressed={going}
                aria-label={
                  going
                    ? "Cancel RSVP for this event"
                    : "RSVP to this event"
                }
              >
                {loadingRSVP || savingRSVP
                  ? "..."
                  : going
                    ? "Going"
                    : "RSVP"}
              </button>
            )}
          </div>
        </div>

        {/* RSVP Error */}

        {!!rsvpError && (
          <p
            className={styles.rsvpError}
            role="alert"
          >
            {rsvpError}
          </p>
        )}
      </div>
    </article>
  );
}


"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { EventRecord } from "../../types/event";

import {
  formatEventCost,
  formatEventDate,
} from "../../utils/eventFormat";

import {
  addEventRSVP,
  eventClient,
  getEventRSVP,
  removeEventRSVP,
  subscribeToRSVPChanges,
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

  const [userID, setUserID] = useState<string | null>(
    null
  );

  const [going, setGoing] = useState(false);
  const [loadingRSVP, setLoadingRSVP] = useState(true);
  const [savingRSVP, setSavingRSVP] = useState(false);
  const [rsvpError, setRSVPError] = useState("");

  const isPublished = event.status === "publicActive";

  // --------------------------------------------------
  // Load RSVP and Subscribe to Changes
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    let currentUserID: string | null = null;
    let changeVersion = 0;

    setUserID(null);
    setGoing(false);
    setLoadingRSVP(true);
    setRSVPError("");

    // Listen for RSVP changes from other cards.

    const unsubscribe = subscribeToRSVPChanges(
      (changedEventID, changedUserID, isGoing) => {
        if (
          !active ||
          changedEventID !== event.eventID ||
          changedUserID !== currentUserID
        ) {
          return;
        }

        // Mark the database snapshot as outdated.

        changeVersion += 1;

        // Update this card immediately.

        setGoing(isGoing);
        setRSVPError("");
      }
    );

    // ----------------------------------------
    // Initial RSVP Fetch
    // ----------------------------------------

    async function loadRSVP() {
      if (!isPublished) {
        setLoadingRSVP(false);
        return;
      }

      try {
        const client = eventClient();

        const {
          data: { session },
          error: sessionError,
        } = await client.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!active || !session) {
          return;
        }

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

        currentUserID = user.id;
        setUserID(user.id);

        // Remember which changes happened before
        // this database request was sent.

        const versionAtFetch = changeVersion;

        const hasRSVP = await getEventRSVP(
          event.eventID,
          user.id
        );

        // Do not overwrite a newer RSVP notification.

        if (
          active &&
          versionAtFetch === changeVersion
        ) {
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

    // ----------------------------------------
    // Cleanup
    // ----------------------------------------

    return () => {
      active = false;
      unsubscribe();
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

    // Redirect signed-out users to login.

    if (!userID) {
      router.push("/login");
      return;
    }

    setSavingRSVP(true);

    try {
      if (going) {
        // Delete the user's RSVP record.

        await removeEventRSVP(
          event.eventID,
          userID
        );

        setGoing(false);
      } else {
        // Create the user's RSVP record.

        await addEventRSVP(
          event.eventID,
          userID
        );

        setGoing(true);
      }

      // Other mounted cards are updated automatically
      // by the notifications sent from events.ts.
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
          title={
            event.eventTitle ?? "Untitled Event"
          }
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

          {/* Featured Badge and RSVP Button */}

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
            role="alert"
            className={styles.rsvpError}
          >
            {rsvpError}
          </p>
        )}
      </div>
    </article>
  );
}


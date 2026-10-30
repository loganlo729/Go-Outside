
"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
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
  maxLength = 20
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
  // Host Name State
  // --------------------------------------------------
  
  const [hostName, setHostName] = useState("Loading...");

  
  useEffect(() => {
    let active = true;

    async function loadHost() {
      const { data, error } = await eventClient()
        .from("Profile")
        .select("displayName")
        .eq("userID", event.userID)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("Unable to load event host:", error);
        setHostName("Unknown");
        return;
      }

      setHostName(data?.displayName || "Unknown");
    }

    void loadHost();

    return () => {
      active = false;
    };
  }, [event.userID]);




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
  // Load RSVP Status and Subscribe to Changes
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    let currentUserID: string | null = null;
    let changeVersion = 0;

    setUserID(null);
    setGoing(false);
    setLoadingRSVP(true);
    setRSVPError("");

    // Listen for RSVP updates from other event cards.

    const unsubscribe = subscribeToRSVPChanges(
      (changedEventID, changedUserID, isGoing) => {
        if (
          !active ||
          changedEventID !== event.eventID ||
          changedUserID !== currentUserID
        ) {
          return;
        }

        changeVersion += 1;

        setGoing(isGoing);
        setRSVPError("");
      }
    );

    // ----------------------------------------
    // Load Initial RSVP
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

        const versionAtFetch = changeVersion;

        const hasRSVP = await getEventRSVP(
          event.eventID,
          user.id
        );

        // Prevent an outdated response from
        // overwriting a newer RSVP change.

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

    if (!userID) {
      router.push("/login");
      return;
    }

    setSavingRSVP(true);

    try {
      if (going) {
        // Delete the RSVP record.

        await removeEventRSVP(
          event.eventID,
          userID
        );

        setGoing(false);
      } else {
        // Create the RSVP record.

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
  // Render
  // --------------------------------------------------
  return (
    <article className={styles.card}>
      {/* Clickable Card Overlay */}

      <Link
        href={`/events/${event.eventID}`}
        className={styles.cardOpenLink}
        aria-label={`View details for ${
          event.eventTitle || "Untitled Event"
        }`}
      />

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
          ⌖ {event.eventLocation
            ? event.eventLocation.length > 65
              ? `${event.eventLocation.slice(0, 65)}...`
              : event.eventLocation
            : "Location TBD"}
        </p>

        {/* Event Host */}

        <p className={styles.host}>
          Hosted by: <strong>{hostName}</strong>
        </p>

        {/* Footer */}

        <div className={styles.cardFooter}>
          <strong>
            {formatEventCost(event.eventCost)}
          </strong>

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
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  void handleRSVP();
                }}
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
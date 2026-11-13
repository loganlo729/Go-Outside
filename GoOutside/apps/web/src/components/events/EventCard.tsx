"use client";

// React hooks
import { useEffect, useState } from "react";

// Navigation
import Link from "next/link";
import { useRouter } from "next/navigation";
import LoginRequiredModal from "./LoginRequiredModal";

// Event type
import type { EventRecord } from "../../types/event";

// Formatting utilities
import {
  formatEventCost,
  formatEventDate,
} from "../../utils/eventFormat";

// Event and RSVP services
import {
  addEventRSVP,
  eventClient,
  getEventRSVP,
  removeEventRSVP,
  subscribeToRSVPChanges,
} from "../../services/events";

// Component styles
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

type EventCardProps = {
  event: EventRecord;
  from?: "all_events" | "my_events";
};

export default function EventCard({
  event,
  from = "all_events",
}: EventCardProps) {
  const router = useRouter();

  const [showLoginModal, setShowLoginModal] = useState(false);
  
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

  const isUpcoming = !!event.eventStartTime && new Date(event.eventStartTime).getTime() > Date.now();

  const canRSVP = isPublished && isUpcoming;

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

        if (!active || !session?.user) {
          return;
        }

        const user = session.user;

        currentUserID = user.id;
        setUserID(user.id);

        const versionAtFetch = changeVersion;

        const hasRSVP = await getEventRSVP(
          event.eventID,
          user.id
        );

        // Prevent an outdated response from overwriting a newer RSVP change.

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
      !canRSVP ||
      loadingRSVP ||
      savingRSVP
    ) {
      return;
    }

    setRSVPError("");

    if (!userID) {
      setShowLoginModal(true);
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
      {/* ----------------------------------------
          Clickable Card Overlay
      ---------------------------------------- */}

      <Link
        href={{
          pathname: `/events/${event.eventID}`,
          query: { from },
        }}
        className={styles.cardOpenLink}
        aria-label={`View details for ${
          event.eventTitle || "Untitled Event"
        }`}
      />

      {/* ----------------------------------------
          Event Image
      ---------------------------------------- */}

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

      {/* ----------------------------------------
          Event Information
      ---------------------------------------- */}

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
          ⌖{" "}
          {event.eventLocation
            ? event.eventLocation.length > 30
              ? `${event.eventLocation.slice(0, 30)}...`
              : event.eventLocation
            : "Location TBD"}
        </p>

        {/* Event Host */}

        <p className={styles.host}>
          Hosted by: <strong>{hostName}</strong>
        </p>

        {/* ----------------------------------------
            Card Footer
        ---------------------------------------- */}

        <div className={styles.cardFooter}>
          {/* Event Cost */}

          <strong>
            {formatEventCost(event.eventCost)}
          </strong>

          {/* Featured Badge and RSVP */}

          <div className={styles.rsvpActions}>
            {/* Featured Badge */}

            {event.isFeatured && (
              <span className={styles.featuredBadge}>
                Featured
              </span>
            )}

            {/* RSVP / Going Button */}

            {canRSVP && (
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

        {/* ----------------------------------------
            RSVP Error
        ---------------------------------------- */}

        {!!rsvpError && (
          <p
            role="alert"
            className={styles.rsvpError}
          >
            {rsvpError}
          </p>
        )}
      </div>

      {/* ----------------------------------------
          Login Required Modal
      ---------------------------------------- */}

      <LoginRequiredModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={() => {
          setShowLoginModal(false);
          router.push("/login");
        }}
      />
    </article>
  );
}
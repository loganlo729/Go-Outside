
"use client";

// React hooks
import {
  useEffect,
  useState,
} from "react";

// Navigation
import Link from "next/link";
import { useParams } from "next/navigation";

// Event components
import EventCard from "../../../../components/events/EventCard";

// Event services
import {
  eventClient,
  getMyEvents,
  getMyUpcomingRSVPEvents,
} from "../../../../services/events";

// Event type
import type { EventRecord } from "../../../../types/event";

// Component styles
import styles from "../../../../components/events/EventDashboard.module.css";

// --------------------------------------------------
// My Events Collection Page
// --------------------------------------------------

export default function MyEventCollectionPage() {
  const { sectionID } = useParams<{
    sectionID: string;
  }>();

  const [createdEvents, setCreatedEvents] =
    useState<EventRecord[]>([]);

  const [rsvpEvents, setRSVPEvents] =
    useState<EventRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  // --------------------------------------------------
  // Load User Events
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await eventClient().auth.getUser();

        if (authError && user) {
          throw authError;
        }

        if (!active) {
          return;
        }

        if (!user) {
          setSignedIn(false);
          setCreatedEvents([]);
          setRSVPEvents([]);
          return;
        }

        setSignedIn(true);

        const [created, attending] =
          await Promise.all([
            getMyEvents(user.id),
            getMyUpcomingRSVPEvents(user.id),
          ]);

        if (!active) {
          return;
        }

        setCreatedEvents(created);
        setRSVPEvents(attending);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load events."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadEvents();

    return () => {
      active = false;
    };
  }, []);

  // --------------------------------------------------
  // Organize Events
  // --------------------------------------------------

  const now = Date.now();

  const upcoming = rsvpEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime).getTime() >= now
  );

  const active = createdEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime).getTime() >= now
  );

  const drafted = createdEvents.filter(
    (event) => event.status === "drafted"
  );

  const past = createdEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime).getTime() < now
  );

  const other = createdEvents.filter(
    (event) =>
      !active.includes(event) &&
      !drafted.includes(event) &&
      !past.includes(event)
  );

  const collections: Record<
    string,
    { title: string; events: EventRecord[] }
  > = {
    upcoming: {
      title: "Upcoming Events",
      events: upcoming,
    },
    active: {
      title: "Your Active Events",
      events: active,
    },
    drafted: {
      title: "Your Drafted Events",
      events: drafted,
    },
    past: {
      title: "Your Past Events",
      events: past,
    },
    other: {
      title: "Other Events",
      events: other,
    },
  };

  const selectedCollection = collections[sectionID];

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <main className={styles.viewAllPage}>
      {/* Back to My Events */}

      <Link
        href="/events/my_events"
        className={styles.viewAllBack}
      >
        <span aria-hidden="true">←</span>
        Back to My Events
      </Link>

      {/* Collection Heading */}

      <h1 className={styles.heading}>
        {selectedCollection?.title ?? "Events"}
      </h1>

      {/* Event Grid */}

      {loading ? (
        <p className={styles.message}>
          Loading events...
        </p>
      ) : error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : !signedIn ? (
        <p className={styles.message}>
          Please log in to view your events.
        </p>
      ) : !selectedCollection ? (
        <p className={styles.message}>
          Event section not found.
        </p>
      ) : selectedCollection.events.length === 0 ? (
        <p className={styles.message}>
          No events found in this section.
        </p>
      ) : (
        <div className={styles.viewAllGrid}>
          {selectedCollection.events.map((event) => (
            <EventCard
              key={event.eventID}
              event={event}
              from="my_events"
            />
          ))}
        </div>
      )}
    </main>
  );
}

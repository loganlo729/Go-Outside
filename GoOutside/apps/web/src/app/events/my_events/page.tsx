
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import EventSection from "../../../components/events/EventSection";

import {
  eventClient,
  getMyEvents,
  getMyUpcomingRSVPEvents,
  subscribeToRSVPChanges,
} from "../../../services/events";

import type {
  EventRecord,
} from "../../../types/event";

import styles from "../../../components/events/EventDashboard.module.css";

// --------------------------------------------------
// My Events Page
// --------------------------------------------------

export default function MyEventsPage() {
  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [events, setEvents] = useState<EventRecord[]>([]);

  const [rsvpEvents, setRSVPEvents] = useState<
    EventRecord[]
  >([]);

  const [currentUserID, setCurrentUserID] = useState<
    string | null
  >(null);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  // --------------------------------------------------
  // Fetch User Events
  // --------------------------------------------------

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await eventClient().auth.getUser();

      if (authError) {
        throw authError;
      }

      // ----------------------------------------
      // Signed-Out User
      // ----------------------------------------

      if (!user) {
        setSignedIn(false);
        setCurrentUserID(null);

        setEvents([]);
        setRSVPEvents([]);

        return;
      }

      // ----------------------------------------
      // Signed-In User
      // ----------------------------------------

      setSignedIn(true);
      setCurrentUserID(user.id);

      // Fetch created events and RSVP events separately.

      const [createdEvents, attendingEvents] =
        await Promise.all([
          getMyEvents(user.id),
          getMyUpcomingRSVPEvents(user.id),
        ]);

      setEvents(createdEvents);
      setRSVPEvents(attendingEvents);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load your events."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // --------------------------------------------------
  // Initial Load
  // --------------------------------------------------

  useEffect(() => {
    void load();
  }, [load]);

  // --------------------------------------------------
  // Listen for RSVP Changes
  // --------------------------------------------------

  useEffect(() => {
    if (!currentUserID) {
      return;
    }

    let active = true;
    let updateVersion = 0;

    const unsubscribe = subscribeToRSVPChanges(
      (eventID, userID, going) => {
        // Only handle the current user's changes.

        if (userID !== currentUserID) {
          return;
        }

        // Track the latest RSVP update.

        const version = ++updateVersion;

        // ----------------------------------------
        // RSVP Cancelled
        // ----------------------------------------

        if (!going) {
          // Remove the event from Upcoming Events
          // immediately after the database delete.

          setRSVPEvents((previous) =>
            previous.filter(
              (event) => event.eventID !== eventID
            )
          );

          return;
        }

        // ----------------------------------------
        // RSVP Added
        // ----------------------------------------

        // Reload the user's attending events.

        void getMyUpcomingRSVPEvents(currentUserID)
          .then((result) => {
            // Ignore outdated requests.

            if (
              !active ||
              version !== updateVersion
            ) {
              return;
            }

            setRSVPEvents(result);
          })
          .catch((error) => {
            console.error(
              "Unable to refresh upcoming RSVP events:",
              error
            );
          });
      }
    );

    // Stop listening when the page unmounts.

    return () => {
      active = false;
      unsubscribe();
    };
  }, [currentUserID]);

  // --------------------------------------------------
  // Filter Events by Search
  // --------------------------------------------------

  const query = search.trim().toLowerCase();

  function matchesSearch(event: EventRecord): boolean {
    if (!query) {
      return true;
    }

    return [
      event.eventTitle,
      event.eventDescription,
      event.eventLocation,
      event.status,
    ].some((value) =>
      (value ?? "").toLowerCase().includes(query)
    );
  }

  // Events created by the user.

  const filteredEvents = events.filter(matchesSearch);

  // Events the user RSVP'd to.

  const filteredRSVPEvents =
    rsvpEvents.filter(matchesSearch);

  // --------------------------------------------------
  // Organize Events into Sections
  // --------------------------------------------------

  const now = Date.now();

  // ----------------------------------------
  // Upcoming Events: RSVP'd Events
  // ----------------------------------------

  const upcomingEvents = filteredRSVPEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime).getTime() >= now
  );

  // ----------------------------------------
  // Your Active Events: Created by User
  // ----------------------------------------

  const activeEvents = filteredEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime).getTime() >= now
  );

  // ----------------------------------------
  // Your Drafted Events
  // ----------------------------------------

  const draftEvents = filteredEvents.filter(
    (event) => event.status === "drafted"
  );

  // ----------------------------------------
  // Your Past Events
  // ----------------------------------------

  const pastEvents = filteredEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime).getTime() < now
  );

  // ----------------------------------------
  // Other Events
  // ----------------------------------------

  const others = filteredEvents.filter(
    (event) =>
      !activeEvents.includes(event) &&
      !draftEvents.includes(event) &&
      !pastEvents.includes(event)
  );

  // --------------------------------------------------
  // Empty State
  // --------------------------------------------------

  const noMatchingEvents =
    filteredEvents.length === 0 &&
    filteredRSVPEvents.length === 0;

  const hasNoEvents =
    events.length === 0 &&
    rsvpEvents.length === 0;

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <main className={styles.page}>
      {/* Header */}

      <header className={styles.header}>
        <h1 className={styles.heading}>
          My Events
        </h1>

        <div className={styles.headerActions}>
          <Link
            href="/events/create_event"
            className={styles.button}
          >
            + Create Event
          </Link>
        </div>
      </header>

      {/* ----------------------------------------
          Loading State
      ---------------------------------------- */}

      {loading ? (
        <p className={styles.message}>
          Loading your events...
        </p>
      ) : error ? (
        // ----------------------------------------
        // Error State
        // ----------------------------------------

        <p
          role="alert"
          className={styles.error}
        >
          {error}{" "}

          <button
            type="button"
            className={styles.retry}
            onClick={() => void load()}
          >
            Retry
          </button>
        </p>
      ) : !signedIn ? (
        // ----------------------------------------
        // Signed-Out State
        // ----------------------------------------

        <p className={styles.message}>
          Sign in to see events you've created
          or RSVP'd to.{" "}

          <Link href="/login">
            Log in
          </Link>
        </p>
      ) : (
        // ----------------------------------------
        // Signed-In Content
        // ----------------------------------------

        <>
          {/* Search */}

          <input
            type="search"
            className={styles.search}
            value={search}
            placeholder="Search your events..."
            aria-label="Search your events"
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

          {/* Empty State */}

          {noMatchingEvents ? (
            <p className={styles.message}>
              {hasNoEvents
                ? "You haven't created or RSVP'd to any events yet."
                : "No matching events."}
            </p>
          ) : (
            // ----------------------------------------
            // Event Sections
            // ----------------------------------------

            <>
              <EventSection
                title="Upcoming Events"
                events={upcomingEvents}
              />

              <EventSection
                title="Your Active Events"
                events={activeEvents}
              />

              <EventSection
                title="Your Drafted Events"
                events={draftEvents}
              />

              <EventSection
                title="Your Past Events"
                events={pastEvents}
              />

              <EventSection
                title="Other Events"
                events={others}
              />
            </>
          )}
        </>
      )}
    </main>
  );
}



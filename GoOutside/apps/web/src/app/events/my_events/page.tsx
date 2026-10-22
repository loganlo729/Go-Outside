
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import EventSection from "../../../components/events/EventSection";
import { eventClient, getMyEvents } from "../../../services/events";

import type { EventRecord } from "../../../types/event";

import styles from "../../../components/events/EventDashboard.module.css";

export default function MyEventsPage() {
  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [events, setEvents] = useState<EventRecord[]>([]);
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

      if (!user) {
        setSignedIn(false);
        setEvents([]);
        return;
      }

      setSignedIn(true);

      const userEvents = await getMyEvents(user.id);
      setEvents(userEvents);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load your events"
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
  // Search Filtering
  // --------------------------------------------------

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();

    return events.filter(
      (event) =>
        !query ||
        [
          event.eventTitle,
          event.eventDescription,
          event.eventLocation,
          event.status,
        ].some((value) =>
          (value ?? "").toLowerCase().includes(query)
        )
    );
  }, [events, search]);

  // --------------------------------------------------
  // Group Events
  // --------------------------------------------------

  const now = Date.now();

  const upcoming = filtered.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime).getTime() >= now
  );

  const drafts = filtered.filter(
    (event) => event.status === "drafted"
  );

  const past = filtered.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime).getTime() < now
  );

  const others = filtered.filter(
    (event) =>
      !upcoming.includes(event) &&
      !drafts.includes(event) &&
      !past.includes(event)
  );

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <main className={styles.page}>
      {/* Header */}

      <header className={styles.header}>
        <h1 className={styles.heading}>Events</h1>

        <button
          type="button"
          className={styles.button}
          onClick={() => void load()}
          disabled={loading}
        >
          Refresh
        </button>
      </header>

      {/* Loading, Error, and Authentication States */}

      {loading ? (
        <p className={styles.message}>
          Loading your events...
        </p>
      ) : error ? (
        <p role="alert" className={styles.error}>
          {error}{" "}

          <button
            className={styles.retry}
            onClick={() => void load()}
          >
            Retry
          </button>
        </p>
      ) : !signedIn ? (
        <p className={styles.message}>
          Sign in to see the events you've created.{" "}
          <Link href="/login">Log in</Link>
        </p>
      ) : (
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

          {/* Empty State / Event Sections */}

          {filtered.length === 0 ? (
            <p className={styles.message}>
              {events.length === 0
                ? "You haven't created any events yet."
                : "No matching events."}
            </p>
          ) : (
            <>
              <EventSection
                title="Upcoming Events"
                events={upcoming}
              />

              <EventSection
                title="Drafts"
                events={drafts}
              />

              <EventSection
                title="Past Events"
                events={past}
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


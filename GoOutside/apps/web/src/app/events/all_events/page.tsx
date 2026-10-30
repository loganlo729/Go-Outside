"use client";

import { useMemo, useState } from "react";

import EventFilters from "../../../components/events/EventFilters";
import EventSection from "../../../components/events/EventSection";
import { useEvents } from "../../../hooks/useEvents";

import type { DateFilter } from "../../../types/event";

import styles from "../../../components/events/EventDashboard.module.css";

export default function AllEventsPage() {
  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const {
    events,
    categories,
    loading,
    refreshing,
    error,
    refresh,
    retry,
  } = useEvents();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  // --------------------------------------------------
  // Filter Events
  // --------------------------------------------------

  const filtered = useMemo(() => {
    const now = new Date();
    const end = new Date(now);

    // Calculate date range
    if (dateFilter === "twoWeeks") {
      end.setDate(end.getDate() + 14);
    }

    if (dateFilter === "month") {
      end.setMonth(end.getMonth() + 1);
    }

    const query = search.trim().toLowerCase();

    return events.filter((event) => {
      // Search matching
      const matchesText =
        !query ||
        [
          event.eventTitle,
          event.eventDescription,
          event.eventLocation,
        ].some((value) =>
          (value ?? "").toLowerCase().includes(query)
        );

      // Category matching
      const matchesCategory =
        selectedCategory === "all" ||
        event.categoryID === selectedCategory;

      // Date matching
      const date = event.eventStartTime
        ? new Date(event.eventStartTime)
        : null;

      const matchesDate =
        dateFilter === "all" ||
        (!!date && date >= now && date <= end);

      return (
        matchesText &&
        matchesCategory &&
        matchesDate
      );
    });
  }, [events, search, selectedCategory, dateFilter]);

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <main className={styles.page}>
      {/* Header */}

      <header className={styles.header}>
        <h1 className={styles.heading}>All Events</h1>
      </header>

      {/* Search */}

      <input
        className={styles.search}
        type="search"
        aria-label="Search all events"
        placeholder="Search all events..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {/* Category and Date Filters */}

      <EventFilters
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
      />

      {/* Loading, Error, and Empty States */}

      {loading ? (
        <p className={styles.message}>
          Loading events...
        </p>
      ) : error ? (
        <p className={styles.error} role="alert">
          {error}{" "}

          <button
            className={styles.retry}
            onClick={retry}
          >
            Retry
          </button>
        </p>
      ) : filtered.length === 0 ? (
        <p className={styles.message}>
          No events found. Try adjusting your search or filters.
        </p>
      ) : (
        <>
          {/* Featured Events */}

          <EventSection
            title="Featured"
            events={filtered.filter(
              (event) => event.isFeatured
            )}
          />

          {/* Dynamic Category Sections */}

          {categories
            .filter(
              (category) =>
                selectedCategory === "all" ||
                category.categoryID === selectedCategory
            )
            .map((category) => (
              <EventSection
                key={category.categoryID}
                title={category.categoryName}
                events={filtered.filter(
                  (event) =>
                    event.categoryID === category.categoryID
                )}
              />
            ))}
        </>
      )}
    </main>
  );
}


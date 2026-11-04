
"use client";

// React hooks
import { useMemo, useState } from "react";

// Event components
import EventFilters from "../../../components/events/EventFilters";
import EventSection from "../../../components/events/EventSection";

// Events hook
import { useEvents } from "../../../hooks/useEvents";

// Date filter type
import type { DateFilter } from "../../../types/event";

// Component styles
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  // Add or remove categories
  function toggleCategory(categoryID: string) {
    setSelectedCategories((previous) =>
      previous.includes(categoryID)
        ? previous.filter((id) => id !== categoryID)
        : [...previous, categoryID]
    );
  }

  // Clear category filters
  function clearCategories() {
    setSelectedCategories([]);
  }


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
        selectedCategories.length === 0 ||
        (
          event.categoryID !== null &&
          selectedCategories.includes(event.categoryID)
        );

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
  }, [events, search, selectedCategories, dateFilter]);

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
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
        onClearCategories={clearCategories}
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
                selectedCategories.length === 0 ||
                selectedCategories.includes(category.categoryID)
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


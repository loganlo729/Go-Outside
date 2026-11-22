"use client";

// React hooks
import { useMemo, useState } from "react";

// Community components
import CommunityFilter from "../../../components/communities/CommunityFilter";
import CommunitySection from "../../../components/communities/CommunitySection";

// Communities hook
import { useCommunities } from "../../../hooks/useCommunities";

// Styles
import styles from "../../../components/communities/CommunityDashboard.module.css";

// --------------------------------------------------
// All Communities Page
// --------------------------------------------------

export default function AllCommunitiesPage() {
  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const {
    communities,
    categories,
    loading,
    error,
    retry,
  } = useCommunities();

  const [search, setSearch] = useState("");

  const [
    selectedCategories,
    setSelectedCategories,
  ] = useState<string[]>([]);

  // Add or remove categories.
  function toggleCategory(categoryID: string) {
    setSelectedCategories((previous) =>
      previous.includes(categoryID)
        ? previous.filter(
            (id) => id !== categoryID
          )
        : [...previous, categoryID]
    );
  }

  // Clear category filters.
  function clearCategories() {
    setSelectedCategories([]);
  }

  // --------------------------------------------------
  // Filter Communities
  // --------------------------------------------------

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return communities.filter((community) => {
      // Only published communities.
      const isPublished =
        community.status === "publicActive";

      // Search matching.
      const matchesText =
        !query ||
        [
          community.communityTitle,
          community.communityDescription,
          community.stateCode,
          community.locationID,
        ].some((value) =>
          String (value ?? "")
            .toLowerCase()
            .includes(query)
        );

      // Category matching.
      const matchesCategory =
        selectedCategories.length === 0 ||
        (
          community.categoryID !== null &&
          selectedCategories.includes(
            community.categoryID
          )
        );

      return (
        isPublished &&
        matchesText &&
        matchesCategory
      );
    });
  }, [
    communities,
    search,
    selectedCategories,
  ]);

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <main className={styles.page}>
      {/* Header */}

      <header className={styles.header}>
        <h1 className={styles.heading}>
          All Communities
        </h1>
      </header>

      {/* Search */}

      <input
        className={styles.search}
        type="search"
        aria-label="Search all communities"
        placeholder="Search all communities..."
        value={search}
        onChange={(event) =>
          setSearch(event.target.value)
        }
      />

      {/* Category Filters */}

      <CommunityFilter
        categories={categories}
        selectedCategories={
          selectedCategories
        }
        onToggleCategory={toggleCategory}
        onClearCategories={clearCategories}
      />

      {/* Loading, Error, Empty States */}

      {loading ? (
        <p className={styles.message}>
          Loading communities...
        </p>
      ) : error ? (
        <p
          className={styles.error}
          role="alert"
        >
          {error}{" "}

          <button
            type="button"
            className={styles.retry}
            onClick={retry}
          >
            Retry
          </button>
        </p>
      ) : filtered.length === 0 ? (
        <p className={styles.message}>
          No communities found. Try adjusting
          your search or filters.
        </p>
      ) : (
        <>
          {/* Dynamic Category Sections */}

          {categories
            .filter(
              (category) =>
                selectedCategories.length === 0 ||
                selectedCategories.includes(
                  category.categoryID
                )
            )
            .map((category) => (
              <CommunitySection
                key={category.categoryID}
                title={category.categoryName}
                communities={filtered.filter(
                  (community) =>
                    community.categoryID ===
                    category.categoryID
                )}
                viewAllHref={`/communities/category/${encodeURIComponent(
                  category.categoryID
                )}`}
              />
            ))}
        </>
      )}
    </main>
  );
}
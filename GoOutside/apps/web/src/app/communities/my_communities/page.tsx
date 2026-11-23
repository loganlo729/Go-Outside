"use client";

// ==================================================
// IMPORTS
// ==================================================

// React
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

// Next.js
import Link from "next/link";

// Supabase
import { getSupabaseClient } from "../../../lib/supabase/client";

// Community Components
import CommunitySection from "../../../components/communities/CommunitySection";

// Types
import type {
  CommunityRecord,
} from "../../../types/community";

// Styles
import styles from "../../../components/communities/CommunityDashboard.module.css";


// ==================================================
// MY COMMUNITIES PAGE
// ==================================================

export default function MyCommunitiesPage() {
  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [search, setSearch] = useState("");

  const [ownedCommunities, setOwnedCommunities] =
    useState<CommunityRecord[]>([]);

  const [joinedCommunities, setJoinedCommunities] =
    useState<CommunityRecord[]>([]);

  const [loading, setLoading] = useState(true);

  const [signedIn, setSignedIn] = useState(false);

  const [error, setError] = useState<string | null>(
    null
  );

  const [reloadKey, setReloadKey] = useState(0);

  const [supabase] = useState(() => getSupabaseClient());
  
  const [userID, setUserID] = useState<string | null>(null);


  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserID(data.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserID(session?.user?.id ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // --------------------------------------------------
  // Load My Communities
  // --------------------------------------------------

  const loadCommunities = useCallback(async () => {
    const supabase = getSupabaseClient();

    // ----------------------------------------
    // Authenticate User
    // ----------------------------------------

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      // Missing sessions are treated as signed out.
      if (
        !authData.user &&
        (
          !authError ||
          authError.name === "AuthSessionMissingError" ||
          authError.status === 401
        )
      ) {
        return {
          signedIn: false,
          owned: [] as CommunityRecord[],
          joined: [] as CommunityRecord[],
        };
      }

      throw authError ?? new Error(
        "Unable to authenticate."
      );
    }

    const userID = authData.user.id;

    // ----------------------------------------
    // Fetch Owned Communities and Memberships
    // ----------------------------------------

    const [
      ownedResult,
      membershipsResult,
    ] = await Promise.all([
      supabase
        .from("Community")
        .select("*")
        .eq("ownerID", userID),

      supabase
        .from("CommunityMember")
        .select("communityID")
        .eq("userID", userID),
    ]);

    if (ownedResult.error) {
      throw ownedResult.error;
    }

    if (membershipsResult.error) {
      throw membershipsResult.error;
    }

    // ----------------------------------------
    // Get Joined Community IDs
    // ----------------------------------------

    const joinedIDs = (
      membershipsResult.data ?? []
    ).map(
      (membership) => membership.communityID
    );

    let joined: CommunityRecord[] = [];

    // ----------------------------------------
    // Fetch Joined Communities
    // ----------------------------------------

    if (joinedIDs.length > 0) {
      const {
        data: joinedData,
        error: joinedError,
      } = await supabase
        .from("Community")
        .select("*")
        .in("communityID", joinedIDs)
        .eq("status", "publicActive");

      if (joinedError) {
        throw joinedError;
      }

      joined = (
        joinedData ?? []
      ) as CommunityRecord[];
    }

    return {
      signedIn: true,
      owned: (
        ownedResult.data ?? []
      ) as CommunityRecord[],
      joined,
    };
  }, []);

  // --------------------------------------------------
  // Initial Load and Retry
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function fetchCommunities() {
      setLoading(true);
      setError(null);

      try {
        const result = await loadCommunities();

        if (!active) {
          return;
        }

        setSignedIn(result.signedIn);

        setOwnedCommunities(result.owned);
        setJoinedCommunities(result.joined);
      } catch (err) {
        if (!active) {
          return;
        }

        console.error(
          "Unable to fetch communities:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your communities."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchCommunities();

    return () => {
      active = false;
    };
  }, [loadCommunities, reloadKey]);

  // --------------------------------------------------
  // Retry
  // --------------------------------------------------

  function retry() {
    setReloadKey((previous) => previous + 1);
  }

  // --------------------------------------------------
  // Search Filter
  // --------------------------------------------------

  const query = search.trim().toLowerCase();

  const matchesSearch = useCallback(
    (community: CommunityRecord) => {
      if (!query) {
        return true;
      }

      return [
        community.communityTitle,
        community.communityDescription,
        community.stateCode,
        community.locationID,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query)
      );
    },
    [query]
  );

  // --------------------------------------------------
  // Joined Communities
  // --------------------------------------------------

  const joined = useMemo(() => {
    return joinedCommunities.filter(
      matchesSearch
    );
  }, [
    joinedCommunities,
    matchesSearch,
  ]);

  // --------------------------------------------------
  // Owned Communities
  // --------------------------------------------------

  const owned = useMemo(() => {
    return ownedCommunities.filter(
      (community) =>
        community.status === "publicActive" &&
        matchesSearch(community)
    );
  }, [
    ownedCommunities,
    matchesSearch,
  ]);

  // --------------------------------------------------
  // Drafted Communities
  // --------------------------------------------------

  const drafted = useMemo(() => {
    return ownedCommunities.filter(
      (community) =>
        community.status === "drafted" &&
        matchesSearch(community)
    );
  }, [
    ownedCommunities,
    matchesSearch,
  ]);

  // --------------------------------------------------
  // Empty State
  // --------------------------------------------------

  const hasNoMatches =
    joined.length === 0 &&
    owned.length === 0 &&
    drafted.length === 0;

  const hasNoCommunities =
    joinedCommunities.length === 0 &&
    ownedCommunities.length === 0;

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <main className={styles.page}>
      {/* ----------------------------------------
          Header
      ---------------------------------------- */}

      <header className={styles.header}>
        <h1 className={styles.heading}>
          My Communities
        </h1>
      </header>

      {/* ----------------------------------------
          Search and Create Community
      ---------------------------------------- */}

      <div className={styles.searchActions}>
        {/* Search */}

        <input
          className={styles.search}
          type="search"
          aria-label="Search your communities"
          placeholder="Search your communities..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        {/* Create Community */}

        {userID && (
          <Link
            href="/communities/create_community"
            className={styles.createButton}
          >
            Create Community
          </Link>
        )}
      </div>

      {/* ----------------------------------------
          Loading State
      ---------------------------------------- */}

      {loading ? (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>
            Loading communities...
          </h2>
        </div>
      ) : error ? (
        /* ----------------------------------------
            Error State
        ---------------------------------------- */

        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>
            Unable to load communities
          </h2>

          <p
            className={styles.error}
            role="alert"
          >
            {error}
          </p>

          <button
            type="button"
            className={styles.retry}
            onClick={retry}
          >
            Retry
          </button>
        </div>
      ) : !signedIn ? (
        /* ----------------------------------------
            Signed-Out State
        ---------------------------------------- */

        <div className={styles.loginPrompt}>
          <h2 className={styles.loginTitle}>
            Log in to see your communities
          </h2>

          <p className={styles.loginDescription}>
            View communities you've joined, created, and saved as drafts.
          </p>

          <Link
            href="/login"
            className={styles.loginButton}
          >
            Log In
          </Link>
        </div>
      ) : hasNoMatches ? (
        /* ----------------------------------------
            No Communities Found
        ---------------------------------------- */

        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>
            No communities found
          </h2>

          <p className={styles.emptyDescription}>
            {query
              ? "Try another search."
              : hasNoCommunities
                ? "You haven't joined or created any communities yet."
                : "No communities match your search."}
          </p>
        </div>
      ) : (
        /* ----------------------------------------
            Community Sections
        ---------------------------------------- */

        <div className={styles.sections}>
          {/* ========================================
              Joined Communities
          ======================================== */}

          {joined.length > 0 && (
            <CommunitySection
              title="Joined Communities"
              communities={joined}
              from="my_communities"
            />
          )}

          {/* ========================================
              Owned Communities
          ======================================== */}

          {owned.length > 0 && (
            <CommunitySection
              title="Owned Communities"
              communities={owned}
              from="my_communities"
            />
          )}

          {/* ========================================
              Drafted Communities
          ======================================== */}

          {drafted.length > 0 && (
            <CommunitySection
              title="Drafted Communities"
              communities={drafted}
              from="my_communities"
            />
          )}
        </div>
      )}
    </main>
  );
}
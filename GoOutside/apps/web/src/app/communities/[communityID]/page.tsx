"use client";

// React
import { useEffect, useState } from "react";

// Next.js
import Link from "next/link";
import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";

// Supabase
import { getSupabaseClient } from "../../../lib/supabase/client";

// Types
import type {
  CommunityRecord,
} from "../../../types/community";

// Styles
import styles from "./CommunityDetails.module.css";

// ==================================================
// Community Details Page
// ==================================================

// --------------------------------------------------
// Formatting Utilities
// --------------------------------------------------

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAccessType(
  community: CommunityRecord
): string {
  return community.accessType === "public"
    ? "Public"
    : "Private";
}

function formatJoinOptions(
  community: CommunityRecord
): string {
  if (community.accessType === "public") {
    return "Open to Everyone";
  }

  if (
    community.allowJoinRequests &&
    community.allowInviteCodes
  ) {
    return "Join Requests or Invite Code";
  }

  if (community.allowJoinRequests) {
    return "Join Requests";
  }

  if (community.allowInviteCodes) {
    return "Invite Code Only";
  }

  return "Closed";
}

// ==================================================
// Component
// ==================================================

export default function CommunityDetailsPage() {
  // --------------------------------------------------
  // Navigation
  // --------------------------------------------------

  const { communityID } = useParams<{
    communityID: string;
  }>();

  const router = useRouter();
  const searchParams = useSearchParams();

  const from =
    searchParams.get("from") === "my_communities"
      ? "my_communities"
      : "all_communities";

  const backHref = `/communities/${from}`;

  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [community, setCommunity] =
    useState<CommunityRecord | null>(null);

  const [categoryName, setCategoryName] =
    useState("Uncategorized");

  const [ownerName, setOwnerName] =
    useState("Loading...");

  const [locationName, setLocationName] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // --------------------------------------------------
  // Load Community Details
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadCommunity() {
      const supabase = getSupabaseClient();

      setLoading(true);
      setError("");
      setCommunity(null);

      setCategoryName("Uncategorized");
      setOwnerName("Loading...");
      setLocationName("");

      try {
        // ----------------------------------------
        // Community
        // ----------------------------------------

        const {
          data: communityData,
          error: communityError,
        } = await supabase
          .from("Community")
          .select("*")
          .eq("communityID", communityID)
          .maybeSingle();

        if (communityError) {
          throw communityError;
        }

        if (!active) return;

        if (!communityData) {
          setCommunity(null);
          return;
        }

        const record =
          communityData as CommunityRecord;

        setCommunity(record);

        // ----------------------------------------
        // Owner
        // ----------------------------------------

        if (record.ownerID) {
          const {
            data: ownerData,
            error: ownerError,
          } = await supabase
            .from("Profile")
            .select("displayName")
            .eq("userID", record.ownerID)
            .maybeSingle();

          if (!active) return;

          if (ownerError) {
            console.error(
              "Unable to load community owner:",
              ownerError
            );
          }

          setOwnerName(
            ownerData?.displayName || "Unknown"
          );
        } else {
          setOwnerName("Unknown");
        }

        // ----------------------------------------
        // Category
        // ----------------------------------------

        if (record.categoryID != null) {
          const {
            data: categoryData,
            error: categoryError,
          } = await supabase
            .from("Category")
            .select("categoryName")
            .eq("categoryID", record.categoryID)
            .maybeSingle();

          if (!active) return;

          if (categoryError) {
            console.error(
              "Unable to load community category:",
              categoryError
            );
          }

          setCategoryName(
            categoryData?.categoryName ||
              "Uncategorized"
          );
        }

        // ----------------------------------------
        // State
        // ----------------------------------------

        const {
          data: stateData,
          error: stateError,
        } = await supabase
          .from("State")
          .select("stateName")
          .eq("stateCode", record.stateCode)
          .maybeSingle();

        if (!active) return;

        if (stateError) {
          console.error(
            "Unable to load community state:",
            stateError
          );
        }

        const stateName =
          stateData?.stateName ||
          record.stateCode;

        // ----------------------------------------
        // State-Wide Community
        // ----------------------------------------

        if (record.locationID == null) {
          setLocationName(stateName);
          return;
        }

        // ----------------------------------------
        // City-Specific Community
        // ----------------------------------------

        const {
          data: locationData,
          error: locationError,
        } = await supabase
          .from("Location")
          .select("locationName")
          .eq("id", record.locationID)
          .eq("stateCode", record.stateCode)
          .maybeSingle();

        if (!active) return;

        if (locationError) {
          console.error(
            "Unable to load community location:",
            locationError
          );
        }

        if (locationData?.locationName) {
          setLocationName(
            `${locationData.locationName}, ${stateName}`
          );
        } else {
          setLocationName(stateName);
        }
      } catch (loadError) {
        console.error(
          "Unable to load community details:",
          loadError
        );

        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load community details."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (communityID) {
      void loadCommunity();
    } else {
      setLoading(false);
      setError("Invalid community ID.");
    }

    return () => {
      active = false;
    };
  }, [communityID]);

  // --------------------------------------------------
  // Community Information
  // --------------------------------------------------

  const isDrafted =
    community?.status === "drafted";

  const accessType = community
    ? formatAccessType(community)
    : "";

  const joinOptions = community
    ? formatJoinOptions(community)
    : "";

  // --------------------------------------------------
  // Navigation
  // --------------------------------------------------

  function handleBack(
    event: React.MouseEvent<HTMLAnchorElement>
  ) {
    event.preventDefault();

    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(backHref);
    }
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <main className={styles.page}>
      <div className={styles.container}>

        {/* ----------------------------------------
            Navigation
        ---------------------------------------- */}

        <div className={styles.navigation}>
          <Link
            href={backHref}
            className={styles.backLink}
            onClick={handleBack}
          >
            ← Back to Communities
          </Link>
        </div>

        {/* ----------------------------------------
            Loading
        ---------------------------------------- */}

        {loading && (
          <p className={styles.message}>
            Loading community details...
          </p>
        )}

        {/* ----------------------------------------
            Error
        ---------------------------------------- */}

        {!loading && error && (
          <p
            role="alert"
            className={styles.error}
          >
            {error}
          </p>
        )}

        {/* ----------------------------------------
            Community Not Found
        ---------------------------------------- */}

        {!loading && !error && !community && (
          <div className={styles.emptyState}>
            <h1>Community Not Found</h1>

            <p>
              This community doesn't exist or
              is not available to view.
            </p>

            <Link href={backHref}>
              Browse Communities
            </Link>
          </div>
        )}

        {/* ----------------------------------------
            Community Details
        ---------------------------------------- */}

        {!loading && !error && community && (
          <>

            {/* ----------------------------------------
                Community Image
            ---------------------------------------- */}

            <div className={styles.hero}>
              {community.communityImageURL?.startsWith(
                "https://"
              ) ? (
                <img
                  src={community.communityImageURL}
                  alt={
                    community.communityTitle ||
                    "Community photo"
                  }
                  className={styles.heroImage}
                />
              ) : (
                <div
                  className={styles.imagePlaceholder}
                >
                  GO OUTSIDE
                </div>
              )}
            </div>

            {/* ----------------------------------------
                Community Header
            ---------------------------------------- */}

            <div className={styles.header}>

              {/* Community Header Content */}

              <div className={styles.headerContent}>

                {/* Community Title */}

                <h1 className={styles.title}>
                  {community.communityTitle || "Untitled Community"}
                </h1>

                {/* Community Owner */}

                <p className={styles.owner}>
                  Owned by:{" "}
                  <strong
                    className={styles.ownerName}
                  >
                    {ownerName}
                  </strong>
                </p>

                {/* Community Badges */}

                <div className={styles.badges}>
                  <span
                    className={
                      community.accessType === "public"
                        ? styles.publicBadge
                        : styles.privateBadge
                    }
                  >
                    {accessType}
                  </span>

                  {isDrafted && (
                    <span
                      className={styles.draftBadge}
                    >
                      Draft
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ----------------------------------------
                Community Description and Information
            ---------------------------------------- */}

            <div className={styles.detailsGrid}>

              {/* Community Description */}

              <section
                className={styles.descriptionCard}
              >
                <h2
                  className={styles.sectionTitle}
                >
                  About This Community
                </h2>

                <p className={styles.description}>
                  {community.communityDescription ||
                    "No description has been provided for this community."}
                </p>
              </section>

              {/* ----------------------------------------
                  Community Information
              ---------------------------------------- */}

              <aside className={styles.infoCard}>

                <h2 className={styles.sectionTitle}>
                  Community Information
                </h2>

                {/* ----------------------------------------
                    Location
                ---------------------------------------- */}

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>
                    Location
                  </span>

                  <span className={styles.infoValue}>
                    {locationName || community.stateCode}
                  </span>
                </div>

                {/* ----------------------------------------
                    Category
                ---------------------------------------- */}

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>
                    Category
                  </span>

                  <span className={styles.infoValue}>
                    {categoryName}
                  </span>
                </div>

                {/* ----------------------------------------
                    Date Created
                ---------------------------------------- */}

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>
                    Created
                  </span>

                  <span className={styles.infoValue}>
                    {formatDate(community.createdAt)}
                  </span>
                </div>

              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
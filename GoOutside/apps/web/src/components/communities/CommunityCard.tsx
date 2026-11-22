"use client";

// React
import { useEffect, useState } from "react";

// Next.js
import Link from "next/link";

// Supabase
import { getSupabaseClient } from "../../lib/supabase/client";

// Types
import type { CommunityRecord } from "../../types/community";

// Styles
import styles from "./CommunityDashboard.module.css";

// ==================================================
// Community Card
// ==================================================

// --------------------------------------------------
// Title Formatting
// --------------------------------------------------

function formatCommunityTitle(
  title: string | null,
  maxLength = 30
): string {
  if (!title) {
    return "Untitled Community";
  }

  return title.length > maxLength
    ? `${title.slice(0, maxLength)}...`
    : title;
}

// --------------------------------------------------
// Access Type Formatting
// --------------------------------------------------

function formatAccessType(
  community: CommunityRecord
): string {
  if (community.accessType === "public") {
    return "Public";
  }

  if (
    community.allowJoinRequests &&
    community.allowInviteCodes
  ) {
    return "Request Access / Invite Only";
  }

  if (community.allowJoinRequests) {
    return "Request Access";
  }

  return "Invite Only";
}

// --------------------------------------------------
// Props
// --------------------------------------------------

type CommunityCardProps = {
  community: CommunityRecord;
  from?: "all_communities" | "my_communities";
};

// ==================================================
// Component
// ==================================================

export default function CommunityCard({
  community,
  from = "all_communities",
}: CommunityCardProps) {

  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [ownerName, setOwnerName] = useState("");

  const [locationName, setLocationName] = useState(
    community.stateCode
  );

  // --------------------------------------------------
  // Load Community Owner
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadOwner() {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("Profile")
        .select("displayName")
        .eq("userID", community.ownerID)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error(
          "Unable to load community owner:",
          error
        );

        setOwnerName("Unknown");
        return;
      }

      setOwnerName(
        data?.displayName || "Unknown"
      );
    }

    void loadOwner();

    return () => {
      active = false;
    };
  }, [community.ownerID]);

  // --------------------------------------------------
  // Load Community Location
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadLocation() {
      const supabase = getSupabaseClient();

      // ----------------------------------------
      // State
      // ----------------------------------------

      const { data: stateData, error: stateError } =
        await supabase
          .from("State")
          .select("stateName")
          .eq("stateCode", community.stateCode)
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
        community.stateCode;

      // ----------------------------------------
      // State-Wide Community
      // ----------------------------------------

      if (community.locationID == null) {
        setLocationName(stateName);
        return;
      }

      // ----------------------------------------
      // City-Specific Community
      // ----------------------------------------

      const { data: locationData, error: locationError } =
        await supabase
          .from("Location")
          .select("locationName, stateCode")
          .eq("id", community.locationID)
          .eq("stateCode", community.stateCode)
          .maybeSingle();

      if (!active) return;

      if (locationError) {
        console.error(
          "Unable to load community location:",
          locationError
        );

        setLocationName(stateName);
        return;
      }

      if (locationData?.locationName) {
        setLocationName(
          `${locationData.locationName}, ${stateName}`
        );
      } else {
        setLocationName(stateName);
      }
    }

    void loadLocation();

    return () => {
      active = false;
    };
  }, [
    community.stateCode,
    community.locationID,
  ]);

  // --------------------------------------------------
  // Community Information
  // --------------------------------------------------

  const communityTitle = community.communityTitle || "Untitled Community";

  const accessType = formatAccessType(community);

  const communityImage = community.communityImageURL;

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <article className={styles.communityPlaceholder}>

      {/* ----------------------------------------
          Clickable Community Card
      ---------------------------------------- */}

      <Link
        href={{
          pathname: `/communities/${community.communityID}`,
          query: { from },
        }}
        className={styles.communityCardOpenLink}
        aria-label={`View details for ${communityTitle}`}
      />

      {/* ----------------------------------------
          Community Image
      ---------------------------------------- */}

      {communityImage?.startsWith("https://") ? (
        <img
          className={styles.communityCardImage}
          src={communityImage}
          alt={communityTitle}
          loading="lazy"
        />
      ) : (
        <div className={styles.placeholderImage}>
          <span>GO OUTSIDE</span>
        </div>
      )}

      {/* ----------------------------------------
          Community Information
      ---------------------------------------- */}

      <div className={styles.placeholderContent}>

        {/* Community Title */}

        <h3 title={communityTitle}>
          {formatCommunityTitle(
            community.communityTitle
          )}
        </h3>

        {/* Location */}

        <p className={styles.communityCardLocation}>
          ⌖ {locationName}
        </p>

        {/* Owner */}

        <p className={styles.communityCardOwner}>
          Owned by:{" "}
          <strong>
            {ownerName || "Loading..."}
          </strong>
        </p>

        {/* ----------------------------------------
            Card Footer
        ---------------------------------------- */}

        <div className={styles.communityCardFooter}>

          {/* Access Type */}

          <span className={styles.communityAccessBadge}>
            {accessType}
          </span>
        </div>
      </div>
    </article>
  );
}
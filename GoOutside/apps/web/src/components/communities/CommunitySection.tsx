// Navigation
import Link from "next/link";

// Types
import type {
  CommunityRecord,
} from "../../types/community";

// Styles
import styles from "./CommunityDashboard.module.css";

// --------------------------------------------------
// Props
// --------------------------------------------------

type CommunitySectionProps = {
  title: string;
  communities: CommunityRecord[];
  from?: "all_communities" | "my_communities";
  viewAllHref?: string;
};

// --------------------------------------------------
// Community Section
// --------------------------------------------------

export default function CommunitySection({
  title,
  communities,
  from = "all_communities",
  viewAllHref,
}: CommunitySectionProps) {
  // Don't render empty sections.
  if (!communities.length) {
    return null;
  }

  return (
    <section
      className={`${styles.section} ${styles.carouselContainer}`}
      aria-label={title}
    >
      {/* Section Header */}

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          {title}
        </h2>

        {/* View All Button */}

        {viewAllHref && (
          <Link
            href={viewAllHref}
            className={styles.viewAllLink}
          >
            View All
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>

      {/* Horizontally Scrollable Communities */}

      <div
        className={styles.rail}
        tabIndex={0}
        aria-label={`Scroll ${title} communities horizontally`}
      >
        {communities.map((community) => (
          <div
            key={community.communityID}
            className={styles.communityPlaceholder}
          >
            {/* Temporary Placeholder */}

            <div
              className={styles.placeholderImage}
            />

            <div
              className={styles.placeholderContent}
            >
              <h3>
                {community.communityTitle}
              </h3>

              <p>
                {community.communityLocation ||
                  "Location TBD"}
              </p>

              <span>
                {community.accessType === "public"
                  ? "Public"
                  : community.allowJoinRequests &&
                      community.allowInviteCodes
                    ? "Request Access / Invite Only"
                    : community.allowJoinRequests
                      ? "Request Access"
                      : "Invite Only"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
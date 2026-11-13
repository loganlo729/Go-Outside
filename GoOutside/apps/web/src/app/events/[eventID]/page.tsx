"use client";

// React hooks
import {
  useEffect,
  useRef,
  useState,
} from "react";

// Navigation
import Link from "next/link";
import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";

// Event and RSVP services
import {
  addEventRSVP,
  eventClient,
  getEventByID,
  getEventCategories,
  getEventRSVP,
  removeEventRSVP,
  subscribeToRSVPChanges,
} from "../../../services/events";

// Event type
import type {
  EventRecord,
} from "../../../types/event";

// Formatting utilities
import {
  formatEventCost,
  formatEventDate,
} from "../../../utils/eventFormat";

// Component styles
import styles from "./EventDetails.module.css";

// --------------------------------------------------
// Event Details Page
// --------------------------------------------------

export default function EventDetailsPage() {
  const { eventID } = useParams<{
    eventID: string;
  }>();

  const router = useRouter();
  const searchParams = useSearchParams();

  // --------------------------------------------------
  // Determine Which Dashboard User Came From
  // --------------------------------------------------

  const from =
    searchParams.get("from") === "my_events"
      ? "my_events"
      : "all_events";

  const backHref = `/events/${from}`;

  // --------------------------------------------------
  // Event State
  // --------------------------------------------------

  const [event, setEvent] = useState<EventRecord | null>(
    null
  );

  const [categoryName, setCategoryName] = useState(
    "Uncategorized"
  );

  const [hostName, setHostName] = useState("Loading...");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Delete Confirmation Modal
  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState(false);

  // --------------------------------------------------
  // Authentication and Ownership State
  // --------------------------------------------------

  const [viewerID, setViewerID] = useState<
    string | null
  >(null);

  const [authLoading, setAuthLoading] = useState(true);

  const isOwner =
    !!event &&
    !!viewerID &&
    event.userID === viewerID;

  // --------------------------------------------------
  // Event Management State
  // --------------------------------------------------

  const [managingEvent, setManagingEvent] = useState<
    "publishing" | "canceling" | "deleting" | null
  >(null);

  const [managementError, setManagementError] =
    useState("");

  // Prevent duplicate management requests.
  const managingRef = useRef(false);

  // --------------------------------------------------
  // RSVP State
  // --------------------------------------------------

  const [userID, setUserID] = useState<
    string | null
  >(null);

  const [going, setGoing] = useState(false);
  const [loadingRSVP, setLoadingRSVP] = useState(true);
  const [savingRSVP, setSavingRSVP] = useState(false);
  const [rsvpError, setRSVPError] = useState("");

  // Prevent outdated RSVP requests from overwriting
  // newer changes.
  const rsvpVersion = useRef(0);

  // Prevent duplicate RSVP requests.
  const savingRSVPRef = useRef(false);

  // --------------------------------------------------
  // Event Status
  // --------------------------------------------------

  const isPublished =
    event?.status === "publicActive";

  const isDrafted =
    event?.status === "drafted";

  const isUpcoming =
    !!event?.eventStartTime &&
    new Date(event.eventStartTime).getTime() >
      Date.now();

  const isEventOver =
    !!event?.eventEndTime &&
    new Date(event.eventEndTime).getTime() <= Date.now();

  const canRSVP = isPublished && isUpcoming;

  // --------------------------------------------------
  // Load Current User
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadUser() {
      setAuthLoading(true);

      try {
        const client = eventClient();

        const {
          data: { user },
          error: authError,
        } = await client.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (active) {
          setViewerID(user?.id ?? null);
        }
      } catch (authError) {
        console.error(
          "Unable to load current user:",
          authError
        );

        if (active) {
          setViewerID(null);
        }
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      active = false;
    };
  }, []);

  // --------------------------------------------------
  // Load Event Details
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadEvent() {
      setLoading(true);
      setError("");
      setEvent(null);
      setCategoryName("Uncategorized");
      setManagementError("");

      try {
        // Retrieve event and category records.

        const [eventResult, categories] =
          await Promise.all([
            getEventByID(eventID),
            getEventCategories().catch(() => []),
          ]);

        if (!active) {
          return;
        }

        setEvent(eventResult);

        // Find the event's category name.

        if (eventResult?.categoryID) {
          const category = categories.find(
            (item) =>
              item.categoryID ===
              eventResult.categoryID
          );

          setCategoryName(
            category?.categoryName ??
              "Uncategorized"
          );
        }
      } catch (loadError) {
        console.error(
          "Event details loading failed:",
          loadError
        );

        console.error(
          "Requested event ID:",
          eventID
        );

        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load event details."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadEvent();

    return () => {
      active = false;
    };
  }, [eventID]);

  // --------------------------------------------------
  // Load Event Host
  // --------------------------------------------------

  useEffect(() => {
    const hostUserID = event?.userID;

    if (!hostUserID) {
      setHostName("Unknown");
      return;
    }

    let active = true;

    setHostName("Loading...");

    async function loadHost() {
      const { data, error } = await eventClient()
        .from("Profile")
        .select("displayName")
        .eq("userID", hostUserID)
        .maybeSingle();

      if (!active) {
        return;
      }

      if (error) {
        console.error(
          "Unable to load event host:",
          error
        );

        setHostName("Unknown");
        return;
      }

      setHostName(
        data?.displayName || "Unknown"
      );
    }

    void loadHost();

    return () => {
      active = false;
    };
  }, [event?.userID]);

  // --------------------------------------------------
  // Load RSVP Status and Subscribe to Changes
  // --------------------------------------------------

  useEffect(() => {
    if (!event || !canRSVP) {
      setUserID(null);
      setGoing(false);
      setLoadingRSVP(false);
      setRSVPError("");
      return;
    }

    let active = true;
    let currentUserID: string | null = null;

    const currentEventID = event.eventID;
    const initialVersion = ++rsvpVersion.current;

    setUserID(null);
    setGoing(false);
    setLoadingRSVP(true);
    setRSVPError("");

    // Listen for RSVP changes from other event cards.

    const unsubscribe = subscribeToRSVPChanges(
      (changedEventID, changedUserID, isGoing) => {
        if (
          !active ||
          changedEventID !== currentEventID ||
          changedUserID !== currentUserID
        ) {
          return;
        }

        rsvpVersion.current += 1;

        setGoing(isGoing);
        setRSVPError("");
      }
    );

    // --------------------------------------------------
    // Load Initial RSVP
    // --------------------------------------------------

    async function loadRSVP() {
      try {
        const client = eventClient();

        const {
          data: { session },
          error: sessionError,
        } = await client.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        // Signed-out users must log in to RSVP.

        if (!active || !session) {
          return;
        }

        const {
          data: { user },
          error: authError,
        } = await client.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!active || !user) {
          return;
        }

        currentUserID = user.id;
        setUserID(user.id);

        const versionAtFetch =
          rsvpVersion.current;

        const hasRSVP = await getEventRSVP(
          currentEventID,
          user.id
        );

        // Ignore outdated responses.

        if (
          active &&
          versionAtFetch === rsvpVersion.current
        ) {
          setGoing(hasRSVP);
        }
      } catch (rsvpLoadError) {
        if (active) {
          setRSVPError(
            rsvpLoadError instanceof Error
              ? rsvpLoadError.message
              : "Unable to load RSVP."
          );
        }
      } finally {
        if (active) {
          setLoadingRSVP(false);
        }
      }
    }

    void loadRSVP();

    return () => {
      active = false;
      unsubscribe();

      // Invalidate unfinished RSVP requests.

      if (
        rsvpVersion.current >= initialVersion
      ) {
        rsvpVersion.current += 1;
      }
    };
  }, [event?.eventID, canRSVP]);

  // --------------------------------------------------
  // Toggle RSVP
  // --------------------------------------------------

  async function handleRSVP() {
    if (
      !event ||
      !canRSVP ||
      loadingRSVP ||
      savingRSVPRef.current
    ) {
      return;
    }

    setRSVPError("");

    // Redirect signed-out users to login.

    if (!userID) {
      router.push("/login");
      return;
    }

    savingRSVPRef.current = true;
    setSavingRSVP(true);

    try {
      if (going) {
        // Remove existing RSVP.

        await removeEventRSVP(
          event.eventID,
          userID
        );

        rsvpVersion.current += 1;
        setGoing(false);
      } else {
        // Create RSVP.

        await addEventRSVP(
          event.eventID,
          userID
        );

        rsvpVersion.current += 1;
        setGoing(true);
      }
    } catch (rsvpSaveError) {
      setRSVPError(
        rsvpSaveError instanceof Error
          ? rsvpSaveError.message
          : "Unable to update RSVP."
      );
    } finally {
      savingRSVPRef.current = false;
      setSavingRSVP(false);
    }
  }

  // --------------------------------------------------
  // Change Event Status
  // --------------------------------------------------

  async function changeEventStatus(
    nextStatus: "drafted" | "publicActive"
  ) {
    if (
      !event ||
      !isOwner ||
      managingRef.current ||
      authLoading
    ) {
      return;
    }

    setManagementError("");

    // --------------------------------------------------
    // Enforce Valid Status Transitions
    // --------------------------------------------------

    // Published events can only be canceled.

    if (
      nextStatus === "drafted" &&
      !isPublished
    ) {
      setManagementError(
        "Only published events can be canceled."
      );
      return;
    }

    // Only drafted events can be published.

    if (
      nextStatus === "publicActive" &&
      !isDrafted
    ) {
      setManagementError(
        "Only draft events can be published."
      );
      return;
    }

    // --------------------------------------------------
    // Validate Before Publishing
    // --------------------------------------------------

    if (nextStatus === "publicActive") {
      if (
        !event.eventTitle?.trim() ||
        !event.categoryID ||
        !event.eventDescription?.trim() ||
        !event.eventStartTime ||
        !event.eventEndTime ||
        !event.eventLocation?.trim() ||
        !event.eventImageURL
      ) {
        setManagementError(
          "This draft is missing required information. Edit the event before publishing."
        );

        return;
      }

      const startTime = new Date(
        event.eventStartTime
      ).getTime();

      const endTime = new Date(
        event.eventEndTime
      ).getTime();

      if (
        !Number.isFinite(startTime) ||
        !Number.isFinite(endTime) ||
        startTime <= Date.now() ||
        endTime <= startTime
      ) {
        setManagementError(
          "The event must have valid future start and end times before publishing."
        );

        return;
      }

      if (
        event.eventCost === null ||
        !Number.isFinite(
          Number(event.eventCost)
        ) ||
        Number(event.eventCost) < 0
      ) {
        setManagementError(
          "Enter a valid event cost before publishing."
        );

        return;
      }
    }

    // --------------------------------------------------
    // Update Event Status in Supabase
    // --------------------------------------------------

    managingRef.current = true;

    setManagingEvent(
      nextStatus === "publicActive"
        ? "publishing"
        : "canceling"
    );

    try {
      const client = eventClient();

      // Verify ownership before updating.

      const {
        data: { user },
        error: authError,
      } = await client.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (
        !user ||
        user.id !== event.userID
      ) {
        throw new Error(
          "Only the event owner can change its status."
        );
      }

      // Update status.
      // Assumes the event table is named "Event".

      const { data, error: updateError } =
        await client
          .from("Event")
          .update({
            status: nextStatus,
          })
          .eq("eventID", event.eventID)
          .eq("userID", user.id)
          .eq("status", event.status)
          .select("eventID")
          .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (!data) {
        throw new Error(
          "Unable to update this event. It may have changed or you may not have permission."
        );
      }

      // Update the displayed event status.

      setEvent((previous) =>
        previous
          ? {
              ...previous,
              status: nextStatus,
            }
          : previous
      );

      router.refresh();
    } catch (updateError) {
      setManagementError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update event status."
      );
    } finally {
      managingRef.current = false;
      setManagingEvent(null);
    }
  }

  // --------------------------------------------------
  // Cancel Published Event
  // --------------------------------------------------

  async function handleCancelEvent() {
    if (
      !event ||
      !isOwner ||
      !isPublished
    ) {
      return;
    }

    // Published -> Drafted

    await changeEventStatus("drafted");
  }

  // --------------------------------------------------
  // Publish Draft Event
  // --------------------------------------------------

  async function handlePublishEvent() {
    if (
      !event ||
      !isOwner ||
      !isDrafted
    ) {
      return;
    }

    // Drafted -> Published

    await changeEventStatus("publicActive");
  }

  // --------------------------------------------------
  // Delete Draft Event
  // --------------------------------------------------

  // Open Delete Confirmation

  function handleOpenDeleteConfirm() {
    if (
      !event ||
      !isOwner ||
      !isDrafted ||
      managingRef.current
    ) {
      return;
    }

    setManagementError("");
    setShowDeleteConfirm(true);
  }

  // Close Delete Confirmation

  function handleCloseDeleteConfirm() {
    if (managingRef.current) {
      return;
    }

  setShowDeleteConfirm(false);
}


  async function handleDeleteEvent() {
    if (
      !event ||
      !isOwner ||
      !isDrafted ||
      !showDeleteConfirm ||
      managingRef.current ||
      authLoading
    ) {
      return;
    }

    // --------------------------------------------------
    // Confirmation
    // --------------------------------------------------
    setManagementError("");

    managingRef.current = true;
    setManagingEvent("deleting");

    try {
      const client = eventClient();

      // Verify ownership before deleting.

      const {
        data: { user },
        error: authError,
      } = await client.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (
        !user ||
        user.id !== event.userID
      ) {
        throw new Error(
          "Only the event owner can delete it."
        );
      }

      // --------------------------------------------------
      // Delete Draft Event
      // --------------------------------------------------

      // Only delete an event if it is still drafted.
      // Assumes the event table is named "Event".

      const { data, error: deleteError } =
        await client
          .from("Event")
          .delete()
          .eq("eventID", event.eventID)
          .eq("userID", user.id)
          .eq("status", "drafted")
          .select("eventID")
          .maybeSingle();

      if (deleteError) {
        throw deleteError;
      }

      if (!data) {
        throw new Error(
          "Unable to delete this draft. It may already be deleted, published, or you may not have permission."
        );
      }

      // Return to My Events after deletion.

      router.replace("/events/my_events");
      router.refresh();
    } catch (deleteError) {
      setManagementError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete event."
      );
    } finally {
      managingRef.current = false;
      setManagingEvent(null);
    }
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* ----------------------------------------
            Navigation and Event Management
        ---------------------------------------- */}

        <div className={styles.navigation}>
          {/* Back to Events */}

          <button
            type="button"
            className={styles.backLink}
            onClick={(clickEvent: React.MouseEvent<HTMLButtonElement>) => {
              // Return to the actual previous page.
              if (window.history.length > 1) {
                router.back();
              } else {
                // Fallback for a directly opened event link.
                router.push(backHref);
              }
            }}
          >
            ← Back to Events
          </button>

          {/* ----------------------------------------
              Owner-Only Event Controls
          ---------------------------------------- */}

          {!loading &&
            !error &&
            isOwner &&
            !authLoading && (
              <div className={styles.ownerActions}>
                {/* ----------------------------------------
                    Published Event: Cancel Only
                ---------------------------------------- */}
  
                {isPublished && !isEventOver && (
                  <button
                    type="button"
                    className={styles.cancelEventButton}
                    onClick={() => void handleCancelEvent()}
                    disabled={!!managingEvent}
                  >
                    {managingEvent === "canceling"
                      ? "Canceling..."
                      : "Cancel Event"}
                  </button>
                )}


                {/* ----------------------------------------
                    Draft Event: Edit, Publish, Delete
                ---------------------------------------- */}

                {isDrafted && (
                  <>
                    {/* Edit Event */}

                    <Link
                      href={`/events/create_event?edit=${encodeURIComponent(eventID)}`}
                      className={styles.editEventButton}
                      aria-disabled={!!managingEvent}
                      onClick={(clickEvent) => {
                        if (managingEvent) {
                          clickEvent.preventDefault();
                        }
                      }}
                    >
                      Edit Event
                    </Link>

                    {/* Publish Event */}

                    <button
                      type="button"
                      className={styles.publishEventButton}
                      onClick={() =>
                        void handlePublishEvent()
                      }
                      disabled={!!managingEvent}
                    >
                      {managingEvent === "publishing"
                        ? "Publishing..."
                        : "Publish Event"}
                    </button>

                    {/* Delete Event */}

                    <button
                      type="button"
                      className={styles.deleteEventButton}
                      onClick={handleOpenDeleteConfirm}
                      disabled={!!managingEvent}
                      aria-label="Delete event"
                      title="Delete Event"
                    >

                      {/* Trash Can Icon */}

                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 10v7" />
                        <path d="M14 10v7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            )}
        </div>

        {/* ----------------------------------------
            Event Management Error
        ---------------------------------------- */}

        {!!managementError && (
          <p
            role="alert"
            className={styles.managementError}
          >
            {managementError}
          </p>
        )}

        {/* ----------------------------------------
            Loading State
        ---------------------------------------- */}

        {loading && (
          <p className={styles.message}>
            Loading event details...
          </p>
        )}

        {/* ----------------------------------------
            Error State
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
            Event Not Found
        ---------------------------------------- */}

        {!loading && !error && !event && (
          <div className={styles.emptyState}>
            <h1>Event Not Found</h1>

            <p>
              This event no longer exists.
            </p>

            <Link href={backHref}>
              Browse Events
            </Link>
          </div>
        )}

        {/* ----------------------------------------
            Event Details
        ---------------------------------------- */}

        {!loading && !error && event && (
          <>
            {/* ----------------------------------------
                Event Photo
            ---------------------------------------- */}

            <div className={styles.hero}>
              {event.eventImageURL?.startsWith(
                "https://"
              ) ? (
                <img
                  src={event.eventImageURL}
                  alt={
                    event.eventTitle ??
                    "Event photo"
                  }
                  className={styles.heroImage}
                />
              ) : (
                <div className={styles.imagePlaceholder}>
                  GO OUTSIDE
                </div>
              )}
            </div>

            {/* ----------------------------------------
                Event Header
            ---------------------------------------- */}

            <div className={styles.header}>
              {/* Event Header Content */}

              <div className={styles.headerContent}>
                {/* Event Category */}

                <p className={styles.category}>
                  {categoryName}
                </p>

                {/* Event Title */}

                <h1 className={styles.title}>
                  {event.eventTitle ||
                    "Untitled Event"}
                </h1>

                {/* Event Host */}

                <p className={styles.host}>
                  Hosted by:{" "}
                  <strong className={styles.hostName}>
                    {hostName}
                  </strong>
                </p>

                {/* Event Badges */}

                <div className={styles.badges}>
                  {event.isFeatured && (
                    <span
                      className={styles.featuredBadge}
                    >
                      Featured Event
                    </span>
                  )}

                  {isDrafted && (
                    <span
                      className={styles.draftBadge}
                    >
                      Draft
                    </span>
                  )}
                </div>
              </div>

              {/* ----------------------------------------
                  Event Cost and RSVP
              ---------------------------------------- */}

              <div className={styles.eventActions}>
                {/* RSVP / Going Button - Left */}

                {canRSVP && (
                  <div className={styles.rsvpContainer}>
                    <button
                      type="button"
                      className={
                        going
                          ? styles.goingButton
                          : styles.rsvpButton
                      }
                      onClick={() =>
                        void handleRSVP()
                      }
                      disabled={
                        loadingRSVP ||
                        savingRSVP
                      }
                      aria-pressed={going}
                      aria-label={
                        going
                          ? "Cancel RSVP for this event"
                          : "RSVP to this event"
                      }
                    >
                      {loadingRSVP || savingRSVP
                        ? "..."
                        : going
                          ? "Going"
                          : "RSVP"}
                    </button>

                    {/* RSVP Error */}

                    {!!rsvpError && (
                      <p
                        role="alert"
                        className={styles.rsvpError}
                      >
                        {rsvpError}
                      </p>
                    )}
                  </div>
                )}

                {/* Event Cost Card - Right */}

                <div className={styles.priceBox}>
                  <span className={styles.priceLabel}>
                    Event Cost
                  </span>

                  <strong className={styles.price}>
                    {formatEventCost(event.eventCost)}
                  </strong>
                </div>
              </div>
            </div>

            {/* ----------------------------------------
                Description and Event Information
            ---------------------------------------- */}

            <div className={styles.detailsGrid}>
              {/* Event Description */}

              <section
                className={styles.descriptionCard}
              >
                <h2 className={styles.sectionTitle}>
                  About This Event
                </h2>

                <p className={styles.description}>
                  {event.eventDescription ||
                    "No description has been provided for this event."}
                </p>
              </section>

              {/* Event Information */}

              <aside className={styles.infoCard}>
                <h2 className={styles.sectionTitle}>
                  Event Information
                </h2>

                {/* Start Date */}

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>
                    Start Date & Time
                  </span>

                  <span className={styles.infoValue}>
                    {formatEventDate(
                      event.eventStartTime
                    )}
                  </span>
                </div>

                {/* End Date */}

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>
                    End Date & Time
                  </span>

                  <span className={styles.infoValue}>
                    {formatEventDate(
                      event.eventEndTime
                    )}
                  </span>
                </div>

                {/* Location */}

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>
                    Location
                  </span>

                  <span className={styles.infoValue}>
                    {event.eventLocation ||
                      "Location TBD"}
                  </span>
                </div>

                {/* Category */}

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>
                    Category
                  </span>

                  <span className={styles.infoValue}>
                    {categoryName}
                  </span>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>

      {/* ----------------------------------------
          Delete Event Confirmation Modal
      ---------------------------------------- */}

      {showDeleteConfirm && event && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(mouseEvent) => {
            if (mouseEvent.target === mouseEvent.currentTarget) {
              handleCloseDeleteConfirm();
            }
          }}
        >
          <div
            className={styles.confirmModal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="deleteModalTitle"
            aria-describedby="deleteModalDescription"
          >
            {/* Warning Icon */}

            <div className={styles.deleteIconContainer}>
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 10v7" />
                <path d="M14 10v7" />
              </svg>
            </div>

            {/* Confirmation Title */}

            <h2
              id="deleteModalTitle"
              className={styles.confirmModalTitle}
            >
              Delete Event?
            </h2>

            {/* Confirmation Description */}

            <p
              id="deleteModalDescription"
              className={styles.confirmModalDescription}
            >
              Are you sure you want to permanently delete{" "}
              <strong>
                "{event.eventTitle || "Untitled Event"}"
              </strong>
              ?
              <span className={styles.deleteWarning}>
                This action cannot be undone.
              </span>
            </p>

            {/* Modal Actions */}

            <div className={styles.confirmModalActions}>
              {/* Keep Event */}

              <button
                type="button"
                className={styles.keepEventButton}
                onClick={handleCloseDeleteConfirm}
                disabled={!!managingEvent}
              >
                Keep Event
              </button>

              {/* Delete Event */}

              <button
                type="button"
                className={styles.confirmDeleteButton}
                onClick={() => void handleDeleteEvent()}
                disabled={!!managingEvent}
              >
                {managingEvent === "deleting"
                  ? "Deleting..."
                  : "Delete Event"}
              </button>
            </div>

            {/* Error Message */}

            {!!managementError && (
              <p
                role="alert"
                className={styles.confirmModalError}
              >
                {managementError}
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}



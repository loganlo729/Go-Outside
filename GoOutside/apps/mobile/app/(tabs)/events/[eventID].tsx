
// React
import React, {
  useCallback,
  useRef,
  useState,
} from "react";

// React Native
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

// Navigation
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";

// Supabase
import { supabase } from "../../../src/lib/supabase";

// Event services
import {
  addEventRSVP,
  getEventByID,
  getEventCategories,
  getEventRSVP,
  removeEventRSVP,
  subscribeToRSVPChanges,
} from "../../../src/services/events";

// Event management
import {
  cancelMobileEvent,
  deleteMobileDraft,
  publishMobileEvent,
} from "../../../src/services/eventManagement";

// Types
import type { EventRecord } from "../../../src/types/event";

// Formatting
import {
  formatEventCost,
  formatEventDate,
} from "../../../src/utils/eventFormat";

// --------------------------------------------------
// Theme
// --------------------------------------------------

const GREEN = "#4C7A45";
const DARK_GREEN = "#2F6136";
const INK = "#1F2E22";
const BACKGROUND = "#F6F8F3";

// --------------------------------------------------
// Event Details Screen
// --------------------------------------------------

export default function EventDetailsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const { eventID, from, returnTo } =
    useLocalSearchParams<{
      eventID: string;
      from?: string;
      returnTo?: string;
    }>();

  const origin =
    from === "my_events"
      ? "my_events"
      : "all_events";

  const backPath =
    origin === "my_events"
      ? "/events/my_events"
      : "/events/all_events";

  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [event, setEvent] =
    useState<EventRecord | null>(null);

  const [categoryName, setCategoryName] =
    useState("Uncategorized");

  const [hostName, setHostName] =
    useState("Loading...");

  const [viewerID, setViewerID] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Event Management State
  // --------------------------------------------------

  const [managing, setManaging] = useState<
    "cancel" | "publish" | "delete" | null
  >(null);

  const [managementError, setManagementError] =
    useState("");

  const [confirmDelete, setConfirmDelete] =
    useState(false);

  const managingRef = useRef(false);

  // --------------------------------------------------
  // RSVP State
  // --------------------------------------------------

  const [going, setGoing] = useState(false);
  const [rsvpLoading, setRSVPLoading] = useState(true);
  const [rsvpSaving, setRSVPSaving] = useState(false);
  const [rsvpError, setRSVPError] = useState("");

  const [showLoginModal, setShowLoginModal] =
    useState(false);

  const rsvpSavingRef = useRef(false);
  const rsvpVersion = useRef(0);

  // --------------------------------------------------
  // Event Status and Permissions
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
    new Date(event.eventEndTime).getTime() <=
      Date.now();

  const canRSVP = isPublished && isUpcoming;

  const isOwner =
    !!event &&
    !!viewerID &&
    event.userID === viewerID;

  // --------------------------------------------------
  // Back Navigation
  // --------------------------------------------------

  function goBack() {
    if (returnTo?.startsWith("/events/")) {
      router.replace(returnTo as any);
      return;
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(backPath);
    }
  }

  // --------------------------------------------------
  // Load Event
  // --------------------------------------------------

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (!eventID) {
        throw new Error("Invalid event ID.");
      }

      const [result, categories, auth] =
        await Promise.all([
          getEventByID(eventID),
          getEventCategories().catch(() => []),
          supabase.auth.getSession(),
        ]);

      if (auth.error) {
        console.warn(
          "Unable to read auth session:",
          auth.error
        );
      }

      setEvent(result);

      setViewerID(
        auth.data.session?.user?.id ?? null
      );

      setCategoryName(
        categories.find(
          (item) =>
            item.categoryID === result?.categoryID
        )?.categoryName ?? "Uncategorized"
      );

      // Load event host.

      if (result?.userID) {
        const { data, error: hostError } =
          await supabase
            .from("Profile")
            .select("displayName")
            .eq("userID", result.userID)
            .maybeSingle();

        if (hostError) {
          console.error(
            "Unable to load host:",
            hostError
          );
        }

        setHostName(
          data?.displayName ?? "Unknown"
        );
      } else {
        setHostName("Unknown");
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load event."
      );
    } finally {
      setLoading(false);
    }
  }, [eventID]);

  // Refresh when screen receives focus.

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  // --------------------------------------------------
  // Load RSVP
  // --------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let currentUserID: string | null = null;

      const selectedID = event?.eventID;
      const initialVersion = ++rsvpVersion.current;

      setGoing(false);
      setRSVPLoading(true);
      setRSVPError("");

      if (!selectedID || !canRSVP) {
        setRSVPLoading(false);

        return () => {
          active = false;
        };
      }

      const unsubscribe = subscribeToRSVPChanges(
        (
          changedEventID,
          changedUserID,
          isGoing
        ) => {
          if (
            active &&
            changedEventID === selectedID &&
            changedUserID === currentUserID
          ) {
            rsvpVersion.current += 1;
            setGoing(isGoing);
          }
        }
      );

      async function loadRSVP() {
        try {
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            throw sessionError;
          }

          // Signed-out users can browse events.
          if (!active || !session?.user) {
            return;
          }

          currentUserID = session.user.id;

          const versionAtFetch =
            rsvpVersion.current;

          const hasRSVP = await getEventRSVP(
            selectedID!,
            session.user.id
          );

          if (
            active &&
            versionAtFetch === rsvpVersion.current
          ) {
            setGoing(hasRSVP);
          }
        } catch (loadError) {
          if (active) {
            setRSVPError(
              loadError instanceof Error
                ? loadError.message
                : "Unable to load RSVP."
            );
          }
        } finally {
          if (active) {
            setRSVPLoading(false);
          }
        }
      }

      void loadRSVP();

      return () => {
        active = false;
        unsubscribe();

        if (rsvpVersion.current >= initialVersion) {
          rsvpVersion.current += 1;
        }
      };
    }, [event?.eventID, canRSVP])
  );

  // --------------------------------------------------
  // Toggle RSVP
  // --------------------------------------------------

  async function handleRSVP() {
    if (
      !event ||
      !canRSVP ||
      rsvpLoading ||
      rsvpSavingRef.current
    ) {
      return;
    }

    setRSVPError("");

    if (!viewerID) {
      setShowLoginModal(true);
      return;
    }

    rsvpSavingRef.current = true;
    setRSVPSaving(true);

    try {
      if (going) {
        await removeEventRSVP(
          event.eventID,
          viewerID
        );
      } else {
        await addEventRSVP(
          event.eventID,
          viewerID
        );
      }

      rsvpVersion.current += 1;
      setGoing(!going);
    } catch (saveError) {
      setRSVPError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to update RSVP."
      );
    } finally {
      rsvpSavingRef.current = false;
      setRSVPSaving(false);
    }
  }

  // --------------------------------------------------
  // Event Management
  // --------------------------------------------------

  async function handleManagement(
    action: "cancel" | "publish" | "delete"
  ) {
    if (
      !event ||
      !isOwner ||
      managingRef.current
    ) {
      return;
    }

    if (
      action === "cancel" &&
      (!isPublished || isEventOver)
    ) {
      return;
    }

    if (
      action !== "cancel" &&
      !isDrafted
    ) {
      return;
    }

    if (
      action === "delete" &&
      !confirmDelete
    ) {
      return;
    }

    managingRef.current = true;
    setManaging(action);
    setManagementError("");

    try {
      if (action === "cancel") {
        await cancelMobileEvent(event.eventID);
      } else if (action === "publish") {
        await publishMobileEvent(event.eventID);
      } else {
        await deleteMobileDraft(event.eventID);
      }

      setConfirmDelete(false);

      if (action === "delete") {
        router.replace("/events/my_events");
        return;
      }

      await reload();
    } catch (manageError) {
      setManagementError(
        manageError instanceof Error
          ? manageError.message
          : "Unable to update event."
      );
    } finally {
      managingRef.current = false;
      setManaging(null);
    }
  }

  // --------------------------------------------------
  // Edit Event
  // --------------------------------------------------

  function editEvent() {
    if (!event || !isOwner || !isDrafted) {
      return;
    }

    router.push({
      pathname: "/events/create_event",
      params: {
        edit: event.eventID,
      },
    });
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation */}

        <View style={styles.navigation}>
          <Pressable
            style={styles.backButton}
            onPress={goBack}
            accessibilityRole="button"
          >
            <Ionicons
              name="arrow-back"
              size={19}
              color={GREEN}
            />

            <Text style={styles.backText}>
              Back to Events
            </Text>
          </Pressable>

          {/* Owner Actions */}

          {!loading && isOwner && (
            <View style={styles.ownerActions}>
              {/* Published Event */}

              {isPublished && !isEventOver && (
                <Pressable
                  style={[
                    styles.cancelEvent,
                    !!managing && styles.disabledButton,
                  ]}
                  disabled={!!managing}
                  onPress={() =>
                    void handleManagement("cancel")
                  }
                >
                  <Text style={styles.cancelEventText}>
                    {managing === "cancel"
                      ? "Canceling..."
                      : "Cancel Event"}
                  </Text>
                </Pressable>
              )}

              {/* Drafted Event */}

              {isDrafted && (
                <>
                  <Pressable
                    style={[
                      styles.editEvent,
                      !!managing && styles.disabledButton,
                    ]}
                    disabled={!!managing}
                    onPress={editEvent}
                  >
                    <Text style={styles.editText}>
                      Edit Event
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.publishEvent,
                      !!managing && styles.disabledButton,
                    ]}
                    disabled={!!managing}
                    onPress={() =>
                      void handleManagement("publish")
                    }
                  >
                    <Text style={styles.publishText}>
                      {managing === "publish"
                        ? "Publishing..."
                        : "Publish Event"}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.deleteEvent,
                      !!managing && styles.disabledButton,
                    ]}
                    disabled={!!managing}
                    onPress={() => {
                      setManagementError("");
                      setConfirmDelete(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Delete event"
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color="#B42318"
                    />
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>

        {!!managementError && !confirmDelete && (
          <Text style={styles.error}>
            {managementError}
          </Text>
        )}

        {/* Loading */}

        {loading && (
          <ActivityIndicator
            size="large"
            color={GREEN}
            style={styles.loading}
          />
        )}

        {/* Error */}

        {!loading && !!error && (
          <Text style={styles.error}>
            {error}
          </Text>
        )}

        {/* Event Not Found */}

        {!loading && !error && !event && (
          <Text style={styles.message}>
            Event not found.
          </Text>
        )}

        {/* Event Details */}

        {!loading && !error && event && (
          <>
            {/* ----------------------------------------
                Event Image
            ---------------------------------------- */}

            <View
              style={[
                styles.hero,
                {
                  height: Math.min(
                    300,
                    Math.max(170, width * 0.44)
                  ),
                },
              ]}
            >
              {event.eventImageURL ? (
                <Image
                  source={{
                    uri: event.eventImageURL,
                  }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderText}>
                    GO OUTSIDE
                  </Text>
                </View>
              )}
            </View>

            {/* ----------------------------------------
                Event Header
            ---------------------------------------- */}
            <View style={styles.eventHeaderRow}>
              {/* ----------------------------------------
                  Left Column: Event Information
              ---------------------------------------- */}

              <View style={styles.eventHeaderLeft}>
                {/* Category */}

                <Text style={styles.category}>
                  {categoryName}
                </Text>

                {/* Event Title */}

                <Text style={styles.title}>
                  {event.eventTitle || "Untitled Event"}
                </Text>

                {/* Event Host */}

                <Text style={styles.host}>
                  Hosted by:{" "}
                  <Text style={styles.hostName}>
                    {hostName}
                  </Text>
                </Text>

                {/* Event Badges */}

                {(event.isFeatured || isDrafted) && (
                  <View style={styles.badges}>
                    {event.isFeatured && (
                      <Text style={styles.featuredBadge}>
                        Featured Event
                      </Text>
                    )}

                    {isDrafted && (
                      <Text style={styles.draftBadge}>
                        Draft
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* ----------------------------------------
                  Right Column: RSVP and Event Cost
              ---------------------------------------- */}

              <View style={styles.eventHeaderRight}>
                <View style={styles.costActions}>
                  {/* RSVP Button */}

                  {canRSVP && (
                    <Pressable
                      style={[
                        styles.rsvpButton,
                        going && styles.goingButton,
                        (rsvpLoading || rsvpSaving) &&
                          styles.disabledButton,
                      ]}
                      disabled={rsvpLoading || rsvpSaving}
                      onPress={() => void handleRSVP()}
                      accessibilityRole="button"
                      accessibilityLabel={
                        going
                          ? "Cancel RSVP for this event"
                          : "RSVP to this event"
                      }
                      accessibilityState={{
                        selected: going,
                        disabled: rsvpLoading || rsvpSaving,
                      }}
                    >
                      <Text
                        style={[
                          styles.rsvpText,
                          going && styles.goingText,
                        ]}
                      >
                        {rsvpLoading || rsvpSaving
                          ? "..."
                          : going
                            ? "Going"
                            : "RSVP"}
                      </Text>
                    </Pressable>
                  )}

                  {/* Event Cost */}

                  <View style={styles.priceBox}>
                    <Text style={styles.label}>
                      Event Cost
                    </Text>

                    <Text style={styles.price}>
                      {formatEventCost(event.eventCost)}
                    </Text>
                  </View>
                </View>

                {/* RSVP Error */}

                {!!rsvpError && (
                  <Text style={styles.error}>
                    {rsvpError}
                  </Text>
                )}
              </View>
            </View>
            {/* ----------------------------------------
                About and Event Information
            ---------------------------------------- */}

            <View
              style={[
                styles.detailsGrid,
                width >= 800 &&
                  styles.detailsGridWide,
              ]}
            >
              {/* About This Event */}

              <View
                style={[
                  styles.panel,
                  styles.descriptionPanel,
                ]}
              >
                <Text style={styles.sectionTitle}>
                  About This Event
                </Text>

                <Text style={styles.description}>
                  {event.eventDescription ||
                    "No description has been provided for this event."}
                </Text>
              </View>

              {/* Event Information */}

              <View
                style={[
                  styles.panel,
                  styles.infoPanel,
                ]}
              >
                <Text style={styles.sectionTitle}>
                  Event Information
                </Text>

                <InfoRow
                  icon="calendar-outline"
                  label="Start Date & Time"
                  value={formatEventDate(
                    event.eventStartTime
                  )}
                />

                <InfoRow
                  icon="time-outline"
                  label="End Date & Time"
                  value={formatEventDate(
                    event.eventEndTime
                  )}
                />

                <InfoRow
                  icon="location-outline"
                  label="Location"
                  value={
                    event.eventLocation ||
                    "Location TBD"
                  }
                />

                <InfoRow
                  icon="pricetag-outline"
                  label="Category"
                  value={categoryName}
                  isLast
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* ==================================================
          DELETE CONFIRMATION MODAL
      ================================================== */}

      <Modal
        visible={confirmDelete}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!managingRef.current) {
            setConfirmDelete(false);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Delete Icon */}

            <View style={styles.deleteIcon}>
              <Ionicons
                name="trash-outline"
                size={28}
                color="#B42318"
              />
            </View>

            {/* Title */}

            <Text style={styles.modalTitle}>
              Delete Event?
            </Text>

            {/* Description */}

            <Text style={styles.modalDescription}>
              Are you sure you want to permanently
              delete{" "}
              <Text style={styles.modalEventName}>
                "{event?.eventTitle ||
                  "Untitled Event"}"
              </Text>
              ?
            </Text>

            <Text style={styles.warning}>
              This action cannot be undone.
            </Text>

            {!!managementError && (
              <Text style={styles.error}>
                {managementError}
              </Text>
            )}

            {/* Actions */}

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.keepButton}
                disabled={!!managing}
                onPress={() =>
                  setConfirmDelete(false)
                }
              >
                <Text style={styles.keepText}>
                  Keep Event
                </Text>
              </Pressable>

              <Pressable
                style={styles.confirmButton}
                disabled={!!managing}
                onPress={() =>
                  void handleManagement("delete")
                }
              >
                <Text style={styles.confirmText}>
                  {managing === "delete"
                    ? "Deleting..."
                    : "Delete Event"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================================================
          LOGIN REQUIRED MODAL
      ================================================== */}

      <Modal
        visible={showLoginModal}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowLoginModal(false)
        }
      >
        <View style={styles.loginModalOverlay}>
          <View style={styles.loginModalContent}>
            <Text style={styles.loginModalTitle}>
              Login Required
            </Text>

            <Text style={styles.loginModalMessage}>
              You need to log in to RSVP to an event.
            </Text>

            <View style={styles.loginModalActions}>
              {/* Cancel */}

              <Pressable
                style={styles.loginModalCancel}
                onPress={() =>
                  setShowLoginModal(false)
                }
              >
                <Text
                  style={styles.loginModalCancelText}
                >
                  Cancel
                </Text>
              </Pressable>

              {/* Log In */}

              <Pressable
                style={styles.loginModalConfirm}
                onPress={() => {
                  setShowLoginModal(false);
                  router.push(
                    "/login_sign_up/login"
                  );
                }}
              >
                <Text
                  style={styles.loginModalConfirmText}
                >
                  Log In
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==================================================
// REUSABLE EVENT INFORMATION ROW
// ==================================================

type InfoIcon =
  React.ComponentProps<typeof Ionicons>["name"];

function InfoRow({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: InfoIcon;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        isLast && styles.lastInfoRow,
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color="#31988F"
        style={styles.infoIcon}
      />

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>
          {label}
        </Text>

        <Text style={styles.infoValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  // --------------------------------------------------
  // Page
  // --------------------------------------------------

  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  content: {
    width: "100%",
    maxWidth: 1100,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 38,
  },

  // --------------------------------------------------
  // Navigation
  // --------------------------------------------------

  navigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
  },

  backText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // Owner Actions
  // --------------------------------------------------

  ownerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },

  cancelEvent: {
    backgroundColor: "#F4DBA8",
    borderWidth: 1,
    borderColor: "#D39C3B",
    paddingHorizontal: 17,
    paddingVertical: 11,
    borderRadius: 10,
  },

  cancelEventText: {
    color: "#754506",
    fontSize: 13,
    fontWeight: "800",
  },

  editEvent: {
    backgroundColor: "#DCEBD6",
    borderWidth: 1,
    borderColor: "#8FB28A",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  editText: {
    color: "#285C30",
    fontSize: 13,
    fontWeight: "800",
  },

  publishEvent: {
    backgroundColor: GREEN,
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  publishText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  deleteEvent: {
    backgroundColor: "#FCE5E2",
    borderWidth: 1,
    borderColor: "#D78C83",
    borderRadius: 10,
    padding: 10,
  },

  disabledButton: {
    opacity: 0.6,
  },

  // --------------------------------------------------
  // Event Image
  // --------------------------------------------------

  hero: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E5EDE4",
    borderWidth: 1,
    borderColor: "#DCE6D8",
  },

  heroImage: {
    width: "100%",
    height: "100%",
  },

  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderText: {
    color: "#31988F",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 3,
  },

  // --------------------------------------------------
  // Event Header
  // --------------------------------------------------

  category: {
    marginTop: 0,
    marginBottom: 5,
    color: "#3F6D3F",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  title: {
    color: "#203326",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },

  host: {
    marginTop: 7,
    fontSize: 14,
    color: "#63715F",
  },

  hostName: {
    color: "#263C2C",
    fontWeight: "700",
  },

  // --------------------------------------------------
  // Event Badges
  // --------------------------------------------------

  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 9,
    marginBottom: 14,
  },

  featuredBadge: {
    backgroundColor: "#D7EFEB",
    color: "#207E75",
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    overflow: "hidden",
    fontWeight: "700",
    fontSize: 12,
  },

  draftBadge: {
    backgroundColor: "#E8E9E6",
    color: "#5B645A",
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    overflow: "hidden",
    fontWeight: "700",
    fontSize: 12,
  },

  // --------------------------------------------------
  // RSVP and Cost
  // --------------------------------------------------

  costActions: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 8,
    width: "100%",
    marginBottom: 0,
  },

  rsvpButton: {
    width: "100%",
    flex: 0,
    minHeight: 44,

    borderRadius: 10,
    borderWidth: 1,
    borderColor: GREEN,
    backgroundColor: "#FFFFFF",

    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  goingButton: {
    backgroundColor: GREEN,
  },

  rsvpText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: "700",
  },

  goingText: {
    color: "#FFFFFF",
  },

  priceBox: {
    flex: 1,
    minWidth: 120,
    padding: 12,
    backgroundColor: "#EDF4E9",
    borderWidth: 1,
    borderColor: "#CBDCC6",
    borderRadius: 12,
  },

  label: {
    color: "#54704F",
    fontSize: 11,
    fontWeight: "700",
  },

  price: {
    marginTop: 4,
    color: "#376B38",
    fontSize: 22,
    fontWeight: "800",
  },

  // --------------------------------------------------
  // Detail Panels
  // --------------------------------------------------

  detailsGrid: {
    width: "100%",
    gap: 14,
  },

  detailsGridWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  panel: {
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE6D8",
    borderRadius: 14,
  },

  descriptionPanel: {
    flex: 1.4,
    borderLeftWidth: 4,
    borderLeftColor: GREEN,
  },

  infoPanel: {
    flex: 1,
    backgroundColor: "#FDFEFD",
  },

  sectionTitle: {
    color: DARK_GREEN,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 12,
  },

  description: {
    color: "#425246",
    fontSize: 14,
    lineHeight: 23,
  },

  // --------------------------------------------------
  // Event Information
  // --------------------------------------------------

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EEE5",
  },

  lastInfoRow: {
    borderBottomWidth: 0,
  },

  infoIcon: {
    marginRight: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    color: "#638060",
    fontSize: 12,
    fontWeight: "700",
  },

  infoValue: {
    color: "#263C2C",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 2,
  },

  // --------------------------------------------------
  // Loading and Errors
  // --------------------------------------------------

  loading: {
    marginTop: 48,
  },

  error: {
    color: "#B42318",
    fontSize: 14,
    marginVertical: 12,
  },

  message: {
    color: "#63715F",
    textAlign: "center",
    paddingVertical: 40,
  },

  // ==================================================
  // DELETE CONFIRMATION MODAL
  // ==================================================

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(20, 35, 24, 0.58)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  modalCard: {
    width: "100%",
    maxWidth: 440,
    padding: 28,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E0E6DC",
    alignItems: "center",
  },

  deleteIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#FFF0EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  modalTitle: {
    color: INK,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 12,
  },

  modalDescription: {
    color: "#63715F",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },

  modalEventName: {
    color: INK,
    fontWeight: "700",
  },

  warning: {
    color: "#B42318",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },

  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 26,
  },

  keepButton: {
    flex: 1,
    padding: 13,
    borderWidth: 1,
    borderColor: "#DCE4D8",
    borderRadius: 10,
    backgroundColor: "#F4F6F1",
    alignItems: "center",
  },

  keepText: {
    color: "#38573A",
    fontWeight: "700",
  },

  confirmButton: {
    flex: 1,
    padding: 13,
    borderRadius: 10,
    backgroundColor: "#B42318",
    alignItems: "center",
  },

  confirmText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // ==================================================
  // LOGIN REQUIRED MODAL
  // ==================================================

  loginModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 35, 24, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  loginModalContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 26,
    borderWidth: 1,
    borderColor: "#E0E6DB",
  },

  loginModalTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#243126",
    marginBottom: 12,
  },

  loginModalMessage: {
    fontSize: 15,
    lineHeight: 23,
    color: "#657463",
    marginBottom: 26,
  },

  loginModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },

  loginModalCancel: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5C5",
    alignItems: "center",
  },

  loginModalCancelText: {
    color: "#4F7846",
    fontSize: 14,
    fontWeight: "700",
  },

  loginModalConfirm: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: "#4F7846",
    alignItems: "center",
  },

  loginModalConfirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // Event Header Two-Column Layout
  // --------------------------------------------------

  eventHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 18,
    marginBottom: 18,
  },

  eventHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },

  eventHeaderRight: {
    width: 145,
    flexShrink: 0,
  },
});

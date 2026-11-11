
import React, {
  useCallback,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../../../src/lib/supabase";

import {
  addEventRSVP,
  getEventByID,
  getEventCategories,
  getEventRSVP,
  removeEventRSVP,
  subscribeToRSVPChanges,
} from "../../../src/services/events";

import {
  cancelMobileEvent,
  deleteMobileDraft,
  publishMobileEvent,
} from "../../../src/services/eventManagement";

import type {
  EventRecord,
} from "../../../src/types/event";

import {
  formatEventCost,
  formatEventDate,
} from "../../../src/utils/eventFormat";

// --------------------------------------------------
// Theme
// --------------------------------------------------

const GREEN = "#4C7A45";
const INK = "#1F2E22";

// --------------------------------------------------
// Event Details Screen
// --------------------------------------------------

export default function EventDetailsScreen() {
  const router = useRouter();

  const { eventID, from } = useLocalSearchParams<{
    eventID: string;
    from?: string;
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
  // Event State
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

  const [rsvpLoading, setRSVPLoading] =
    useState(true);

  const [rsvpSaving, setRSVPSaving] =
    useState(false);

  const [rsvpError, setRSVPError] =
    useState("");

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
    new Date(event.eventEndTime).getTime() <= Date.now();

  const canRSVP = isPublished && isUpcoming;

  const isOwner =
    !!event &&
    !!viewerID &&
    event.userID === viewerID;

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
          supabase.auth.getUser(),
        ]);

      if (auth.error) {
        throw auth.error;
      }

      setEvent(result);

      setViewerID(
        auth.data.user?.id ?? null
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
          console.error(hostError);
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

  // Refresh when returning from Edit Event.

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  // --------------------------------------------------
  // Load RSVP and Subscribe to Changes
  // --------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let currentUserID: string | null = null;

      const selectedID = event?.eventID;

      const initialVersion =
        ++rsvpVersion.current;

      setGoing(false);
      setRSVPLoading(true);
      setRSVPError("");

      if (!selectedID || !canRSVP) {
        setRSVPLoading(false);

        return () => {
          active = false;
        };
      }

      // Synchronize RSVP across event cards.

      const unsubscribe = subscribeToRSVPChanges(
        (changedEventID, changedUserID, isGoing) => {
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
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError) {
            throw authError;
          }

          if (!active || !user) {
            return;
          }

          currentUserID = user.id;

          const versionAtFetch =
            rsvpVersion.current;

          const hasRSVP = await getEventRSVP(
            selectedID!,
            user.id
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

        if (
          rsvpVersion.current >= initialVersion
        ) {
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
      router.push("/Login_Sign_Up/login");
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

    // Published events: cancel only.
    if (action === "cancel" && !isPublished) {
      return;
    }

    // Drafts: publish or delete.
    if (
      action !== "cancel" &&
      !isDrafted
    ) {
      return;
    }

    // Delete requires the confirmation modal.
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
  // Navigate to Edit Event
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
        {/* Navigation and Management Controls */}

        <View style={styles.navigation}>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace(backPath);
              }
            }}
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

          {/* Owner-Only Controls */}

          {!loading && isOwner && (
            <View style={styles.ownerActions}>
              {/* Published: Cancel Only */}

              {isPublished && !isEventOver && (
                <Pressable
                  style={styles.cancelEvent}
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
              

              {/* Draft: Edit, Publish, Delete */}

              {isDrafted && (
                <>
                  <Pressable
                    style={styles.editEvent}
                    disabled={!!managing}
                    onPress={editEvent}
                  >
                    <Text style={styles.editText}>
                      Edit
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.publishEvent}
                    disabled={!!managing}
                    onPress={() =>
                      void handleManagement("publish")
                    }
                  >
                    <Text style={styles.publishText}>
                      {managing === "publish"
                        ? "Publishing..."
                        : "Publish"}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.deleteEvent}
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

        {/* Loading / Error */}

        {loading && (
          <ActivityIndicator
            color={GREEN}
            size="large"
            style={{ marginTop: 48 }}
          />
        )}

        {!loading && !!error && (
          <Text style={styles.error}>
            {error}
          </Text>
        )}

        {!loading && !error && !event && (
          <Text style={styles.message}>
            Event not found.
          </Text>
        )}

        {/* Event Details */}

        {!loading && !error && event && (
          <>
            {/* Event Image */}

            <View style={styles.hero}>
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
                  <Text
                    style={styles.placeholderText}
                  >
                    GO OUTSIDE
                  </Text>
                </View>
              )}
            </View>

            {/* Category / Title / Host */}

            <Text style={styles.category}>
              {categoryName}
            </Text>

            <Text style={styles.title}>
              {event.eventTitle ||
                "Untitled Event"}
            </Text>

            <Text style={styles.host}>
              Hosted by:{" "}
              <Text style={styles.hostName}>
                {hostName}
              </Text>
            </Text>

            {/* Event Badges */}

            <View style={styles.badges}>
              {event.isFeatured && (
                <Text
                  style={styles.featuredBadge}
                >
                  Featured Event
                </Text>
              )}

              {isDrafted && (
                <Text
                  style={styles.draftBadge}
                >
                  Draft
                </Text>
              )}
            </View>

            {/* RSVP Left / Cost Right */}

            <View style={styles.costActions}>
              {canRSVP && (
                <Pressable
                  style={[
                    styles.rsvpButton,
                    going && styles.goingButton,
                  ]}
                  disabled={
                    rsvpLoading || rsvpSaving
                  }
                  onPress={() =>
                    void handleRSVP()
                  }
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: going,
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

              <View style={styles.priceBox}>
                <Text style={styles.label}>
                  Event Cost
                </Text>

                <Text style={styles.price}>
                  {formatEventCost(
                    event.eventCost
                  )}
                </Text>
              </View>
            </View>

            {!!rsvpError && (
              <Text style={styles.error}>
                {rsvpError}
              </Text>
            )}

            {/* Event Description */}

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>
                About This Event
              </Text>

              <Text style={styles.description}>
                {event.eventDescription ||
                  "No description has been provided for this event."}
              </Text>
            </View>

            {/* Event Information */}

            <View style={styles.panel}>
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
          </>
        )}
      </ScrollView>

      {/* ----------------------------------------
          Delete Confirmation Modal
      ---------------------------------------- */}

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
            <View style={styles.deleteIcon}>
              <Ionicons
                name="trash-outline"
                size={28}
                color="#B42318"
              />
            </View>

            <Text style={styles.modalTitle}>
              Delete Event?
            </Text>

            <Text style={styles.modalDescription}>
              Are you sure you want to
              permanently delete{" "}
              <Text style={{ fontWeight: "700" }}>
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
    </View>
  );
}

// --------------------------------------------------
// Reusable Event Information Row
// --------------------------------------------------

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
        size={21}
        color="#31988F"
        style={{ marginRight: 14 }}
      />

      <View style={{ flex: 1 }}>
        <Text style={styles.label}>
          {label}
        </Text>

        <Text style={styles.infoValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F7F3",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 70,
  },
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 22,
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
  ownerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  cancelEvent: {
    backgroundColor: "#FFF5E6",
    borderWidth: 1,
    borderColor: "#E4B86A",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
  },
  cancelEventText: {
    color: "#945D15",
    fontSize: 13,
    fontWeight: "700",
  },
  editEvent: {
    backgroundColor: "#E5EADF",
    borderWidth: 1,
    borderColor: "#B8C9B2",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  editText: {
    color: "#2F5B35",
    fontWeight: "700",
  },
  publishEvent: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  publishText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  deleteEvent: {
    backgroundColor: "#FFF0EE",
    borderWidth: 1,
    borderColor: "#E5B1AA",
    borderRadius: 10,
    padding: 10,
  },
  hero: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#DFEDEA",
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
  category: {
    marginTop: 24,
    marginBottom: 8,
    color: "#3F6D3F",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: INK,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 38,
  },
  host: {
    marginTop: 12,
    fontSize: 14,
    color: "#63715F",
  },
  hostName: {
    color: INK,
    fontWeight: "700",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    marginBottom: 20,
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
  costActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  rsvpButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GREEN,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  goingButton: {
    backgroundColor: GREEN,
  },
  rsvpText: {
    color: GREEN,
    fontSize: 15,
    fontWeight: "700",
  },
  goingText: {
    color: "#FFFFFF",
  },
  priceBox: {
    flex: 1,
    minWidth: 120,
    padding: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E6DD",
    borderRadius: 16,
  },
  label: {
    color: "#63715F",
    fontSize: 12,
    fontWeight: "700",
  },
  price: {
    marginTop: 6,
    color: "#3F6D3F",
    fontSize: 24,
    fontWeight: "800",
  },
  panel: {
    padding: 22,
    marginBottom: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E6DD",
    borderRadius: 16,
  },
  sectionTitle: {
    color: INK,
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 18,
  },
  description: {
    color: "#435044",
    fontSize: 15,
    lineHeight: 25,
  },
  infoRow: {
    flexDirection: "row",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF0EA",
  },
  lastInfoRow: {
    borderBottomWidth: 0,
  },
  infoValue: {
    color: INK,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    marginTop: 5,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(20,35,24,0.58)",
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
});

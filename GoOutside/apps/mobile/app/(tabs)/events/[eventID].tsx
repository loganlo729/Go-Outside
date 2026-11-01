
import React, {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  Image,
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

import {
  getEventByID,
  getEventCategories,
} from "../../../src/services/events";

import type {
  EventRecord,
} from "../../../src/types/event";

import {
  formatEventCost,
  formatEventDate,
} from "../../../src/utils/eventFormat";

import { supabase } from "../../../src/lib/supabase";

// --------------------------------------------------
// Event Details Screen
// --------------------------------------------------

export default function EventDetailsScreen() {
  const router = useRouter();

  // --------------------------------------------------
  // Route Parameters
  // --------------------------------------------------

  const { eventID, from } = useLocalSearchParams<{
    eventID: string;
    from?: string;
  }>();

  // --------------------------------------------------
  // Determine Originating Dashboard
  // --------------------------------------------------

  const activeDashboard =
    from === "my_events"
      ? "my_events"
      : "all_events";

  const backPath =
    activeDashboard === "my_events"
      ? "/events/my_events"
      : "/events/all_events";

  function backToEvents() {
    router.replace(backPath);
  }

  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [event, setEvent] =
    useState<EventRecord | null>(null);

  const [categoryName, setCategoryName] =
    useState("Uncategorized");

  const [currentUserID, setCurrentUserID] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Load Event Details When Screen Receives Focus
  // --------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadEvent() {
        setLoading(true);
        setError("");
        setEvent(null);
        setCategoryName("Uncategorized");

        try {
          // ----------------------------------------
          // Validate Event ID
          // ----------------------------------------

          if (
            typeof eventID !== "string" ||
            !eventID
          ) {
            throw new Error("Invalid event ID.");
          }

          // ----------------------------------------
          // Load Event, Categories, and Auth Session
          // ----------------------------------------

          const [
            eventResult,
            categories,
            sessionResult,
          ] = await Promise.all([
            getEventByID(eventID),
            getEventCategories(),
            supabase.auth.getSession(),
          ]);

          if (sessionResult.error) {
            throw sessionResult.error;
          }

          if (!active) {
            return;
          }

          // ----------------------------------------
          // Save Event Information
          // ----------------------------------------

          setEvent(eventResult);

          const category = categories.find(
            (item) =>
              item.categoryID ===
              eventResult?.categoryID
          );

          setCategoryName(
            category?.categoryName ??
              "Uncategorized"
          );

          // ----------------------------------------
          // Identify Authenticated User
          // ----------------------------------------

          if (!sessionResult.data.session) {
            // Signed-out visitors can still view
            // publicly available event details.

            setCurrentUserID(null);
          } else {
            const {
              data: { user },
              error: authError,
            } = await supabase.auth.getUser();

            if (!active) {
              return;
            }

            if (authError) {
              // If the session expired, treat the
              // visitor as signed out.

              if (
                authError.name ===
                  "AuthSessionMissingError" ||
                authError.status === 401
              ) {
                setCurrentUserID(null);
              } else {
                throw authError;
              }
            } else {
              setCurrentUserID(user?.id ?? null);
            }
          }
        } catch (err) {
          if (active) {
            console.error(
              "Unable to load event details:",
              err
            );

            setError(
              err instanceof Error
                ? err.message
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
    }, [eventID])
  );

  // --------------------------------------------------
  // Event Ownership and Status
  // --------------------------------------------------

  const isOwner =
    !!event &&
    !!currentUserID &&
    event.userID === currentUserID;

  const isUpcoming =
    !!event?.eventStartTime &&
    new Date(event.eventStartTime).getTime() >
      Date.now();

  const isPublished =
    event?.status === "publicActive";

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ----------------------------------------
          Events Dashboard Navigation
      ---------------------------------------- */}

      <View style={styles.tabs}>
        {/* All Events */}

        <Pressable
          style={[
            styles.tab,
            activeDashboard === "all_events" &&
              styles.activeTab,
          ]}
          onPress={() =>
            router.replace("/events/all_events")
          }
          accessibilityRole="button"
          accessibilityState={{
            selected:
              activeDashboard === "all_events",
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeDashboard === "all_events" &&
                styles.activeTabText,
            ]}
          >
            All Events
          </Text>
        </Pressable>

        {/* My Events */}

        <Pressable
          style={[
            styles.tab,
            activeDashboard === "my_events" &&
              styles.activeTab,
          ]}
          onPress={() =>
            router.replace("/events/my_events")
          }
          accessibilityRole="button"
          accessibilityState={{
            selected:
              activeDashboard === "my_events",
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeDashboard === "my_events" &&
                styles.activeTabText,
            ]}
          >
            My Events
          </Text>
        </Pressable>
      </View>

      {/* ----------------------------------------
          Back to Events
      ---------------------------------------- */}

      <Pressable
        style={styles.backButton}
        onPress={backToEvents}
        accessibilityRole="button"
        accessibilityLabel={`Back to ${
          activeDashboard === "my_events"
            ? "My Events"
            : "All Events"
        }`}
      >
        <Ionicons
          name="arrow-back"
          size={22}
          color="#3F6D3F"
        />

        <Text style={styles.backText}>
          Back to Events
        </Text>
      </Pressable>

      {/* ----------------------------------------
          Loading State
      ---------------------------------------- */}

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator
            size="large"
            color="#31988F"
          />

          <Text style={styles.message}>
            Loading event details...
          </Text>
        </View>
      )}

      {/* ----------------------------------------
          Error State
      ---------------------------------------- */}

      {!loading && !!error && (
        <View style={styles.centered}>
          <Text style={styles.error}>
            {error}
          </Text>
        </View>
      )}

      {/* ----------------------------------------
          Event Not Found
      ---------------------------------------- */}

      {!loading && !error && !event && (
        <View style={styles.centered}>
          <Text style={styles.title}>
            Event Not Found
          </Text>

          <Text style={styles.message}>
            This event may no longer exist or
            may not be available to you.
          </Text>
        </View>
      )}

      {/* ----------------------------------------
          Event Details
      ---------------------------------------- */}

      {!loading && !error && event && (
        <>
          {/* Event Image */}

          <View style={styles.hero}>
            {event.eventImageURL?.startsWith(
              "https://"
            ) ? (
              <Image
                source={{
                  uri: event.eventImageURL,
                }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={styles.imagePlaceholder}
              >
                <Text
                  style={styles.placeholderText}
                >
                  GO OUTSIDE
                </Text>
              </View>
            )}
          </View>

          {/* ----------------------------------------
              Category
          ---------------------------------------- */}

          <Text style={styles.category}>
            {categoryName}
          </Text>

          {/* ----------------------------------------
              Event Title
          ---------------------------------------- */}

          <Text style={styles.title}>
            {event.eventTitle ||
              "Untitled Event"}
          </Text>

          {/* ----------------------------------------
              Event Badges
          ---------------------------------------- */}

          <View style={styles.badges}>
            {event.isFeatured && (
              <View style={styles.featuredBadge}>
                <Text
                  style={styles.featuredText}
                >
                  Featured Event
                </Text>
              </View>
            )}

            {event.status === "drafted" && (
              <View style={styles.draftBadge}>
                <Text style={styles.draftText}>
                  Draft
                </Text>
              </View>
            )}

            {event.status === "cancelled" && (
              <View style={styles.draftBadge}>
                <Text style={styles.draftText}>
                  Cancelled
                </Text>
              </View>
            )}
          </View>

          {/* ----------------------------------------
              Event Cost
          ---------------------------------------- */}

          <View style={styles.priceBox}>
            <Text style={styles.label}>
              Event Cost
            </Text>

            <Text style={styles.price}>
              {formatEventCost(event.eventCost)}
            </Text>
          </View>

          {/* ----------------------------------------
              Ownership Information
          ---------------------------------------- */}

          {isOwner && (
            <View style={styles.ownerNotice}>
              <Ionicons
                name="person-circle-outline"
                size={19}
                color="#3F6D3F"
              />

              <Text style={styles.ownerText}>
                You're the organizer of this event.
              </Text>
            </View>
          )}

          {/* ----------------------------------------
              Event Description
          ---------------------------------------- */}

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>
              About This Event
            </Text>

            <Text style={styles.description}>
              {event.eventDescription ||
                "No description has been provided for this event."}
            </Text>
          </View>

          {/* ----------------------------------------
              Event Information
          ---------------------------------------- */}

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>
              Event Information
            </Text>

            {/* Start Date */}

            <InfoRow
              icon="calendar-outline"
              label="Start Date & Time"
              value={formatEventDate(
                event.eventStartTime
              )}
            />

            {/* End Date */}

            <InfoRow
              icon="time-outline"
              label="End Date & Time"
              value={formatEventDate(
                event.eventEndTime
              )}
            />

            {/* Location */}

            <InfoRow
              icon="location-outline"
              label="Location"
              value={
                event.eventLocation ||
                "Location TBD"
              }
            />

            {/* Category */}

            <InfoRow
              icon="pricetag-outline"
              label="Category"
              value={categoryName}
            />

            {/* Cost */}

            <InfoRow
              icon="cash-outline"
              label="Cost"
              value={formatEventCost(
                event.eventCost
              )}
              isLast
            />
          </View>

          {/* ----------------------------------------
              Past Event Message
          ---------------------------------------- */}

          {!isUpcoming && isPublished && (
            <Text style={styles.statusText}>
              This event has already started.
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

// --------------------------------------------------
// Reusable Information Row
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
        style={styles.infoIcon}
      />

      <View style={styles.infoContent}>
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
  // --------------------------------------------------
  // Screen Layout
  // --------------------------------------------------

  screen: {
    flex: 1,
    backgroundColor: "#F6F7F3",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 70,
  },

  // --------------------------------------------------
  // Events Dashboard Navigation
  // --------------------------------------------------

  tabs: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: "#E1E6EA",
    marginBottom: 24,
    gap: 26,
  },

  tab: {
    height: "100%",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },

  activeTab: {
    borderBottomColor: "#31988F",
  },

  tabText: {
    color: "#53617A",
    fontSize: 14,
    fontWeight: "400",
  },

  activeTabText: {
    color: "#31988F",
    fontWeight: "700",
  },

  // --------------------------------------------------
  // Back Button
  // --------------------------------------------------

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingVertical: 10,
    marginBottom: 12,
  },

  backText: {
    color: "#3F6D3F",
    fontSize: 15,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // Loading and Error States
  // --------------------------------------------------

  centered: {
    paddingVertical: 70,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  message: {
    fontSize: 15,
    color: "#63715F",
    textAlign: "center",
    lineHeight: 23,
  },

  error: {
    color: "#B42318",
    fontSize: 15,
    textAlign: "center",
  },

  // --------------------------------------------------
  // Event Image
  // --------------------------------------------------

  hero: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#DFEDEA",
    borderRadius: 16,
    overflow: "hidden",
  },

  heroImage: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
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
  // Event Title and Category
  // --------------------------------------------------

  category: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#3F6D3F",
  },

  title: {
    color: "#1F2E22",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 38,
  },

  // --------------------------------------------------
  // Event Badges
  // --------------------------------------------------

  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    marginBottom: 22,
  },

  featuredBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: "#D7EFEB",
  },

  featuredText: {
    color: "#207E75",
    fontSize: 12,
    fontWeight: "700",
  },

  draftBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: "#E8E9E6",
  },

  draftText: {
    color: "#5B645A",
    fontSize: 12,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // Event Cost
  // --------------------------------------------------

  priceBox: {
    marginTop: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0E6DD",
    backgroundColor: "#FFFFFF",
  },

  label: {
    color: "#63715F",
    fontSize: 12,
    fontWeight: "600",
  },

  price: {
    marginTop: 6,
    color: "#3F6D3F",
    fontSize: 25,
    fontWeight: "800",
  },

  // --------------------------------------------------
  // Ownership Notice
  // --------------------------------------------------

  ownerNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 20,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#EAF3E6",
  },

  ownerText: {
    flex: 1,
    color: "#3F6D3F",
    fontSize: 13,
    fontWeight: "600",
  },

  // --------------------------------------------------
  // Content Panels
  // --------------------------------------------------

  panel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E0E6DD",
    borderWidth: 1,
    borderRadius: 16,
    padding: 22,
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#1F2E22",
    marginBottom: 20,
  },

  description: {
    color: "#435044",
    fontSize: 15,
    lineHeight: 25,
  },

  // --------------------------------------------------
  // Event Information Rows
  // --------------------------------------------------

  infoRow: {
    flexDirection: "row",
    paddingVertical: 16,
    borderBottomColor: "#EDF0EA",
    borderBottomWidth: 1,
  },

  lastInfoRow: {
    borderBottomWidth: 0,
  },

  infoIcon: {
    marginRight: 14,
    marginTop: 3,
  },

  infoContent: {
    flex: 1,
    gap: 5,
  },

  infoValue: {
    color: "#1F2E22",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },

  // --------------------------------------------------
  // Event Status
  // --------------------------------------------------

  statusText: {
    color: "#63715F",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
});

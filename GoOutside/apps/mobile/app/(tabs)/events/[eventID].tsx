
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
// Event Details
// --------------------------------------------------

export default function EventDetailsScreen() {
  const router = useRouter();

  const { eventID } = useLocalSearchParams<{
    eventID: string;
  }>();

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
  // Load Event
  // --------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        setLoading(true);
        setError("");

        try {
          if (
            typeof eventID !== "string" ||
            !eventID
          ) {
            throw new Error("Invalid event ID.");
          }

          const [
            eventResult,
            categories,
            authResult,
          ] = await Promise.all([
            getEventByID(eventID),
            getEventCategories(),
            supabase.auth.getUser(),
          ]);

          if (authResult.error) {
            throw authResult.error;
          }

          if (!active) {
            return;
          }

          setEvent(eventResult);
          setCurrentUserID(
            authResult.data.user?.id ?? null
          );

          const category = categories.find(
            (item) =>
              item.categoryID ===
              eventResult?.categoryID
          );

          setCategoryName(
            category?.categoryName ??
              "Uncategorized"
          );
        } catch (error) {
          if (active) {
            setError(
              error instanceof Error
                ? error.message
                : "Unable to load event details."
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      void load();

      return () => {
        active = false;
      };
    }, [eventID])
  );

  // --------------------------------------------------
  // Event Status
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
    >
      {/* Back Button */}

      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
        accessibilityRole="button"
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

      {/* Loading */}

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

      {/* Error */}

      {!loading && !!error && (
        <View style={styles.centered}>
          <Text style={styles.error}>
            {error}
          </Text>
        </View>
      )}

      {/* Not Found */}

      {!loading && !error && !event && (
        <View style={styles.centered}>
          <Text style={styles.title}>
            Event Not Found
          </Text>

          <Text style={styles.message}>
            This event may no longer exist
            or may not be available to you.
          </Text>
        </View>
      )}

      {/* Event Details */}

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

          {/* Category */}

          <Text style={styles.category}>
            {categoryName}
          </Text>

          {/* Event Title */}

          <Text style={styles.title}>
            {event.eventTitle ||
              "Untitled Event"}
          </Text>

          {/* Badges */}

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

          {/* Cost */}

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

          {/* Ownership Info */}

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

          {/* Description */}

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
            />

            <InfoRow
              icon="cash-outline"
              label="Cost"
              value={formatEventCost(
                event.eventCost
              )}
              isLast
            />
          </View>

          {/* Event Status */}

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
  React.ComponentProps<
    typeof Ionicons
  >["name"];

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
  screen: {
    flex: 1,
    backgroundColor: "#F6F7F3",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 70,
  },

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

  statusText: {
    color: "#63715F",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
});

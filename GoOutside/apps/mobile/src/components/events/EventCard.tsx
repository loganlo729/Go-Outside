
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useFocusEffect,
  useRouter,
} from "expo-router";

import { supabase } from "../../lib/supabase";

import type {
  EventRecord,
} from "../../types/event";

import {
  formatEventCost,
  formatEventDate,
} from "../../utils/eventFormat";

import {
  addEventRSVP,
  getEventRSVP,
  removeEventRSVP,
  subscribeToRSVPChanges,
} from "../../services/events";

// --------------------------------------------------
// Event Card Props
// --------------------------------------------------

type EventCardProps = {
  event: EventRecord;
};

// --------------------------------------------------
// Format Event Title
// --------------------------------------------------

function formatEventTitle(
  title: string | null,
  maxLength = 20
): string {
  if (!title) {
    return "Untitled Event";
  }

  return title.length > maxLength
    ? `${title.slice(0, maxLength)}...`
    : title;
}

// --------------------------------------------------
// Event Card
// --------------------------------------------------

export default function EventCard({
  event,
}: EventCardProps) {
  const router = useRouter();

  // --------------------------------------------------
  // RSVP State
  // --------------------------------------------------

  const [userID, setUserID] = useState<
    string | null
  >(null);

  const [going, setGoing] = useState(false);

  const [loadingRSVP, setLoadingRSVP] =
    useState(true);

  const [savingRSVP, setSavingRSVP] =
    useState(false);

  const [rsvpError, setRSVPError] = useState("");

  // --------------------------------------------------
  // Event Status
  // --------------------------------------------------

  const isPublished =
    event.status === "publicActive";

  const isUpcoming =
    !!event.eventStartTime &&
    new Date(event.eventStartTime).getTime() >
      Date.now();

  const canRSVP = isPublished && isUpcoming;

  // --------------------------------------------------
  // Open Event Details
  // --------------------------------------------------

  function openEventDetails() {
    router.push({
      pathname: "/events/[eventID]",
      params: {
        eventID: event.eventID,
      },
    });
  }

  // --------------------------------------------------
  // Load RSVP Status on Focus
  // --------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      let active = true;

      let currentUserID: string | null = null;
      let changeVersion = 0;

      setUserID(null);
      setGoing(false);
      setLoadingRSVP(true);
      setRSVPError("");

      // ----------------------------------------
      // Listen for RSVP Changes
      // ----------------------------------------

      const unsubscribe = subscribeToRSVPChanges(
        (
          changedEventID,
          changedUserID,
          isGoing
        ) => {
          if (
            !active ||
            changedEventID !== event.eventID ||
            changedUserID !== currentUserID
          ) {
            return;
          }

          changeVersion += 1;

          setGoing(isGoing);
          setRSVPError("");
        }
      );

      // ----------------------------------------
      // Fetch Current RSVP Status
      // ----------------------------------------

      async function loadRSVP() {
        if (!canRSVP) {
          setLoadingRSVP(false);
          return;
        }

        try {
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            throw sessionError;
          }

          if (!active || !session) {
            return;
          }

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
          setUserID(user.id);

          const versionAtFetch = changeVersion;

          const hasRSVP = await getEventRSVP(
            event.eventID,
            user.id
          );

          if (
            active &&
            versionAtFetch === changeVersion
          ) {
            setGoing(hasRSVP);
          }
        } catch (error) {
          if (active) {
            setRSVPError(
              error instanceof Error
                ? error.message
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

      // ----------------------------------------
      // Cleanup
      // ----------------------------------------

      return () => {
        active = false;
        unsubscribe();
      };
    }, [event.eventID, canRSVP])
  );

  // --------------------------------------------------
  // Toggle RSVP
  // --------------------------------------------------

  async function handleRSVP() {
    if (
      !canRSVP ||
      loadingRSVP ||
      savingRSVP
    ) {
      return;
    }

    setRSVPError("");

    // ----------------------------------------
    // Require Authentication
    // ----------------------------------------

    if (!userID) {
      router.push(
        "/Login_Sign_Up/login"
      );
      return;
    }

    setSavingRSVP(true);

    try {
      if (going) {
        // Delete the user's RSVP record.

        await removeEventRSVP(
          event.eventID,
          userID
        );

        setGoing(false);
      } else {
        // Create the user's RSVP record.

        await addEventRSVP(
          event.eventID,
          userID
        );

        setGoing(true);
      }

      // Other mounted EventCards receive
      // the RSVP change notification.
    } catch (error) {
      setRSVPError(
        error instanceof Error
          ? error.message
          : "Unable to update RSVP."
      );
    } finally {
      setSavingRSVP(false);
    }
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <View style={styles.card}>
      {/* ----------------------------------------
          Clickable Card Content
      ---------------------------------------- */}

      <Pressable
        style={styles.cardContent}
        onPress={openEventDetails}
        accessibilityRole="button"
        accessibilityLabel={`View details for ${
          event.eventTitle || "Untitled Event"
        }`}
      >
        {/* Event Image */}

        {event.eventImageURL?.startsWith(
          "https://"
        ) ? (
          <Image
            source={{
              uri: event.eventImageURL,
            }}
            style={styles.image}
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

        {/* Event Information */}

        <View style={styles.cardBody}>
          {/* Date */}

          <Text style={styles.date}>
            {formatEventDate(
              event.eventStartTime
            )}
          </Text>

          {/* Title */}

          <Text
            style={styles.cardTitle}
            numberOfLines={2}
          >
            {formatEventTitle(
              event.eventTitle
            )}
          </Text>

          {/* Location */}

          <Text
            style={styles.location}
            numberOfLines={2}
          >
            {event.eventLocation ||
              "Location TBD"}
          </Text>
        </View>
      </Pressable>

      {/* ----------------------------------------
          Footer - Separate from Clickable Card
      ---------------------------------------- */}

      <View style={styles.cardFooter}>
        {/* Event Cost */}

        <Text style={styles.cost}>
          {formatEventCost(
            event.eventCost
          )}
        </Text>

        {/* RSVP and Featured Actions */}

        <View style={styles.rsvpActions}>
          {event.isFeatured && (
            <View style={styles.featuredBadge}>
              <Text
                style={styles.featuredText}
              >
                Featured
              </Text>
            </View>
          )}

          {/* RSVP Button */}

          {canRSVP && (
            <Pressable
              style={[
                styles.rsvpButton,
                going && styles.goingButton,
                (loadingRSVP || savingRSVP) &&
                  styles.disabledButton,
              ]}
              onPress={() => {
                void handleRSVP();
              }}
              disabled={
                loadingRSVP || savingRSVP
              }
              accessibilityRole="button"
              accessibilityState={{
                disabled:
                  loadingRSVP || savingRSVP,
                selected: going,
                busy:
                  loadingRSVP || savingRSVP,
              }}
              accessibilityLabel={
                going
                  ? "Cancel RSVP for this event"
                  : "RSVP to this event"
              }
            >
              {loadingRSVP || savingRSVP ? (
                <ActivityIndicator
                  size="small"
                  color={
                    going
                      ? "#FFFFFF"
                      : "#3F6D3F"
                  }
                />
              ) : (
                <Text
                  style={[
                    styles.rsvpButtonText,
                    going &&
                      styles.goingButtonText,
                  ]}
                >
                  {going ? "Going" : "RSVP"}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* RSVP Error */}

      {!!rsvpError && (
        <Text
          style={styles.rsvpError}
          accessibilityRole="alert"
        >
          {rsvpError}
        </Text>
      )}
    </View>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------

const styles = StyleSheet.create({
  // --------------------------------------------------
  // Card
  // --------------------------------------------------

  card: {
    width: 260,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E6EB",
    borderRadius: 11,
    overflow: "hidden",
  },

  cardContent: {
    width: "100%",
  },

  // --------------------------------------------------
  // Event Image
  // --------------------------------------------------

  image: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#DFEDEA",
  },

  imagePlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DFEDEA",
  },

  placeholderText: {
    color: "#31988F",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 2,
  },

  // --------------------------------------------------
  // Event Information
  // --------------------------------------------------

  cardBody: {
    paddingHorizontal: 13,
    paddingTop: 13,
    paddingBottom: 8,
  },

  date: {
    color: "#31988F",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 9,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
    minHeight: 44,
    color: "#18232B",
    marginBottom: 10,
  },

  location: {
    color: "#8290A4",
    fontSize: 13,
    lineHeight: 17,
    minHeight: 34,
  },

  // --------------------------------------------------
  // Card Footer
  // --------------------------------------------------

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,

    marginHorizontal: 13,
    marginTop: 5,
    paddingTop: 10,
    paddingBottom: 13,

    borderTopWidth: 1,
    borderTopColor: "#E5E9EE",
  },

  cost: {
    flexShrink: 1,
    color: "#31988F",
    fontSize: 13,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // Featured Badge
  // --------------------------------------------------

  rsvpActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    flexWrap: "wrap",
  },

  featuredBadge: {
    backgroundColor: "#D7EFEB",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 5,
  },

  featuredText: {
    color: "#207E75",
    fontSize: 11,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // RSVP Button
  // --------------------------------------------------

  rsvpButton: {
    minWidth: 64,
    minHeight: 33,

    paddingHorizontal: 12,
    paddingVertical: 7,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#FFFFFF",
    borderColor: "#3F6D3F",
    borderWidth: 1,
    borderRadius: 7,
  },

  rsvpButtonText: {
    color: "#3F6D3F",
    fontSize: 12,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // Going Button
  // --------------------------------------------------

  goingButton: {
    backgroundColor: "#3F6D3F",
    borderColor: "#3F6D3F",
  },

  goingButtonText: {
    color: "#FFFFFF",
  },

  disabledButton: {
    opacity: 0.6,
  },

  // --------------------------------------------------
  // RSVP Error
  // --------------------------------------------------

  rsvpError: {
    marginHorizontal: 13,
    marginBottom: 12,
    color: "#B42318",
    fontSize: 11,
    lineHeight: 16,
  },
});


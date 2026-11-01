
import React, {
  useCallback,
  useEffect,
  useRef,
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
import { theme } from "../../constants/theme";

import type { EventRecord } from "../../types/event";

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
// Props
// --------------------------------------------------

type EventCardProps = {
  event: EventRecord;
  from?: "all_events" | "my_events";
};

// --------------------------------------------------
// Display Formatting
// --------------------------------------------------

function formatEventTitle(
  title: string | null,
  maxLength = 22
): string {
  if (!title) {
    return "Untitled Event";
  }

  return title.length > maxLength
    ? `${title.slice(0, maxLength)}...`
    : title;
}

function formatLocation(
  location: string | null,
  maxLength = 45
): string {
  if (!location) {
    return "Location TBD";
  }

  return location.length > maxLength
    ? `${location.slice(0, maxLength)}...`
    : location;
}

// --------------------------------------------------
// Event Card
// --------------------------------------------------

export default function EventCard({
  event,
  from = "all_events",
}: EventCardProps) {
  const router = useRouter();

  // --------------------------------------------------
  // RSVP State
  // --------------------------------------------------

  const [userID, setUserID] = useState<string | null>(
    null
  );

  const [going, setGoing] = useState(false);
  const [loadingRSVP, setLoadingRSVP] = useState(true);
  const [savingRSVP, setSavingRSVP] = useState(false);
  const [rsvpError, setRSVPError] = useState("");

  // Prevent older RSVP requests from overwriting
  // more recent changes.
  const rsvpVersion = useRef(0);

  // Prevent rapid duplicate RSVP button presses.
  const savingRef = useRef(false);

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

  const hasImage = Boolean(
    event.eventImageURL?.startsWith("https://")
  );

  // --------------------------------------------------
  // Open Event Details
  // --------------------------------------------------

  function openEventDetails() {
    router.push({
      pathname: "/events/[eventID]",
      params: {
        eventID: event.eventID,
        from,
      },
    });
  }

  // --------------------------------------------------
  // Load RSVP When Screen Receives Focus
  // --------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let activeUserID: string | null = null;

      const currentVersion = ++rsvpVersion.current;

      setUserID(null);
      setGoing(false);
      setRSVPError("");
      setLoadingRSVP(canRSVP);

      // Listen for changes made by other cards
      // showing the same event.
      const unsubscribe = subscribeToRSVPChanges(
        (
          changedEventID,
          changedUserID,
          isGoing
        ) => {
          if (
            !active ||
            changedEventID !== event.eventID ||
            changedUserID !== activeUserID
          ) {
            return;
          }

          rsvpVersion.current += 1;
          setGoing(isGoing);
          setRSVPError("");
        }
      );

      async function loadRSVP() {
        if (!canRSVP) {
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

          activeUserID = user.id;
          setUserID(user.id);

          const requestVersion = rsvpVersion.current;

          const hasRSVP = await getEventRSVP(
            event.eventID,
            user.id
          );

          // Only apply the result if no newer
          // RSVP change has occurred.
          if (
            active &&
            requestVersion === rsvpVersion.current
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

      return () => {
        active = false;
        unsubscribe();

        // Invalidate unfinished requests.
        if (rsvpVersion.current === currentVersion) {
          rsvpVersion.current += 1;
        }
      };
    }, [event.eventID, canRSVP])
  );

  // --------------------------------------------------
  // Synchronize RSVP Changes Across Cards
  // --------------------------------------------------

  useEffect(() => {
    if (!userID || !canRSVP) {
      return;
    }

    const unsubscribe = subscribeToRSVPChanges(
      (changedEventID, changedUserID, isGoing) => {
        if (
          changedEventID !== event.eventID ||
          changedUserID !== userID
        ) {
          return;
        }

        rsvpVersion.current += 1;
        setGoing(isGoing);
        setRSVPError("");
      }
    );

    return unsubscribe;
  }, [event.eventID, userID, canRSVP]);

  // --------------------------------------------------
  // Toggle RSVP
  // --------------------------------------------------

  async function handleRSVP() {
    if (
      !canRSVP ||
      loadingRSVP ||
      savingRef.current
    ) {
      return;
    }

    setRSVPError("");

    // Signed-out users must log in first.
    if (!userID) {
      router.push("/Login_Sign_Up/login");
      return;
    }

    savingRef.current = true;
    setSavingRSVP(true);

    try {
      if (going) {
        // Cancel RSVP and delete the database record.
        await removeEventRSVP(
          event.eventID,
          userID
        );

        setGoing(false);
      } else {
        // Create RSVP.
        await addEventRSVP(
          event.eventID,
          userID
        );

        setGoing(true);
      }

      // The service notifies other event cards,
      // keeping all occurrences synchronized.
    } catch (error) {
      setRSVPError(
        error instanceof Error
          ? error.message
          : "Unable to update RSVP."
      );
    } finally {
      savingRef.current = false;
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

        {hasImage ? (
          <Image
            source={{
              uri: event.eventImageURL!,
            }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              GO OUTSIDE
            </Text>
          </View>
        )}

        {/* Event Information */}

        <View style={styles.body}>
          {/* Date */}

          <Text style={styles.date}>
            {formatEventDate(event.eventStartTime)}
          </Text>

          {/* Title */}

          <Text
            style={styles.title}
            numberOfLines={2}
          >
            {formatEventTitle(event.eventTitle)}
          </Text>

          {/* Location */}

          <Text
            style={styles.location}
            numberOfLines={2}
          >
            ⌖ {formatLocation(event.eventLocation)}
          </Text>

          {/* Host */}

          <Text
            style={styles.hostLine}
            numberOfLines={1}
          >
            Hosted by:{" "}
            <Text style={styles.hostName}>
              {event.hostName || "Unknown Host"}
            </Text>
          </Text>
        </View>
      </Pressable>

      {/* ----------------------------------------
          Divider
      ---------------------------------------- */}

      <View style={styles.divider} />

      {/* ----------------------------------------
          Footer
      ---------------------------------------- */}

      <View style={styles.footer}>
        {/* Price */}

        <Text style={styles.price}>
          {formatEventCost(event.eventCost)}
        </Text>

        {/* Featured Badge and RSVP Button */}

        <View style={styles.actions}>
          {event.isFeatured && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                Featured
              </Text>
            </View>
          )}

          {/* RSVP / Going */}

          {canRSVP && (
            <Pressable
              style={[
                styles.rsvpButton,
                going && styles.goingButton,
                (loadingRSVP || savingRSVP) &&
                  styles.disabledButton,
              ]}
              onPress={() => void handleRSVP()}
              disabled={loadingRSVP || savingRSVP}
              accessibilityRole="button"
              accessibilityLabel={
                going
                  ? "Cancel RSVP for this event"
                  : "RSVP to this event"
              }
              accessibilityState={{
                disabled: loadingRSVP || savingRSVP,
                selected: going,
                busy: loadingRSVP || savingRSVP,
              }}
            >
              {loadingRSVP || savingRSVP ? (
                <ActivityIndicator
                  size="small"
                  color={
                    going ? "#FFFFFF" : "#3F6D3F"
                  }
                />
              ) : (
                <Text
                  style={[
                    styles.rsvpButtonText,
                    going && styles.goingButtonText,
                  ]}
                >
                  {going ? "Going" : "RSVP"}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* ----------------------------------------
          RSVP Error
      ---------------------------------------- */}

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
  card: {
    width: 260,
    borderWidth: 1,
    borderColor: "#E0E6EB",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
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
    backgroundColor: "#E8EDF0",
  },

  placeholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#DFEDEA",
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderText: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.primary,
    letterSpacing: 2,
  },

  // --------------------------------------------------
  // Event Body
  // --------------------------------------------------

  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },

  date: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: "700",
    marginBottom: 10,
  },

  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2E22",
    lineHeight: 22,
    minHeight: 44,
    marginBottom: 12,
  },

  location: {
    fontSize: 12,
    color: "#8290A4",
    lineHeight: 18,
    minHeight: 36,
    marginBottom: 10,
  },

  hostLine: {
    fontSize: 12,
    color: "#6B7280",
  },

  hostName: {
    fontWeight: "700",
    color: "#4A5672",
  },

  // --------------------------------------------------
  // Divider
  // --------------------------------------------------

  divider: {
    height: 1,
    backgroundColor: "#E5E9EE",
    marginHorizontal: 16,
  },

  // --------------------------------------------------
  // Footer
  // --------------------------------------------------

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },

  price: {
    flexShrink: 1,
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 8,
  },

  // --------------------------------------------------
  // Featured Badge
  // --------------------------------------------------

  badge: {
    backgroundColor: "#D7EFEB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  badgeText: {
    color: "#207E75",
    fontSize: 11,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // RSVP Button
  // --------------------------------------------------

  rsvpButton: {
    minWidth: 64,
    minHeight: 34,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#3F6D3F",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  rsvpButtonText: {
    color: "#3F6D3F",
    fontSize: 12,
    fontWeight: "700",
  },

  goingButton: {
    backgroundColor: "#4C7A45",
    borderColor: "#4C7A45",
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
    marginHorizontal: 16,
    marginBottom: 12,
    color: "#B42318",
    fontSize: 11,
    lineHeight: 16,
  },
});

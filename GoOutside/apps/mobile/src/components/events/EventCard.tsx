
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

import { theme } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

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
// Title Formatting
// --------------------------------------------------

function shortTitle(
  title: string | null,
  maxLength = 22
): string {
  const text = title || "Untitled Event";

  return text.length > maxLength
    ? `${text.slice(0, maxLength)}...`
    : text;
}

// --------------------------------------------------
// Event Card
// --------------------------------------------------

export default function EventCard({
  event,
}: {
  event: EventRecord;
}) {
  const router = useRouter();

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

  const isPublished =
    event.status === "publicActive";

  const hasImage =
    !!event.eventImageURL?.startsWith("https://");

  // --------------------------------------------------
  // Load RSVP Status When Screen Receives Focus
  // --------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadRSVP() {
        if (!isPublished) {
          setLoadingRSVP(false);
          return;
        }

        setLoadingRSVP(true);
        setRSVPError("");

        try {
          // Check whether user is signed in.

          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            throw sessionError;
          }

          if (!active) {
            return;
          }

          if (!session) {
            setUserID(null);
            setGoing(false);
            return;
          }

          // Verify authenticated user.

          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError) {
            throw authError;
          }

          if (!active) {
            return;
          }

          if (!user) {
            setUserID(null);
            setGoing(false);
            return;
          }

          setUserID(user.id);

          // Fetch RSVP from Supabase.

          const hasRSVP = await getEventRSVP(
            event.eventID,
            user.id
          );

          if (active) {
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
      };
    }, [event.eventID, isPublished])
  );

  // --------------------------------------------------
  // Synchronize Duplicate Event Cards
  // --------------------------------------------------

  useEffect(() => {
    return subscribeToRSVPChanges(
      (changedEventID, changedUserID, isGoing) => {
        if (
          changedEventID === event.eventID &&
          changedUserID === userID
        ) {
          setGoing(isGoing);
        }
      }
    );
  }, [event.eventID, userID]);

  // --------------------------------------------------
  // Toggle RSVP
  // --------------------------------------------------

  async function handleRSVP() {
    if (
      !isPublished ||
      loadingRSVP ||
      savingRSVP
    ) {
      return;
    }

    setRSVPError("");

    // Signed-out users must log in.

    if (!userID) {
      router.push("/Login_Sign_Up/login");
      return;
    }

    setSavingRSVP(true);

    try {
      if (going) {
        // Cancel RSVP: delete database record.

        await removeEventRSVP(
          event.eventID,
          userID
        );

        setGoing(false);
      } else {
        // RSVP: create database record.

        await addEventRSVP(
          event.eventID,
          userID
        );

        setGoing(true);
      }
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
  // Render Event Card
  // --------------------------------------------------

  return (
    <View style={styles.card}>
      {/* Event Photo */}

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
          {shortTitle(event.eventTitle)}
        </Text>

        {/* Location */}

        <Text
          style={styles.location}
          numberOfLines={2}
        >
          ⌖ {event.eventLocation || "Location TBD"}
        </Text>

        {/* Footer */}

        <View style={styles.footer}>
          {/* Event Cost */}

          <Text style={styles.price}>
            {formatEventCost(event.eventCost)}
          </Text>

          {/* Featured Badge and RSVP Button */}

          <View style={styles.footerActions}>
            {event.isFeatured && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  Featured
                </Text>
              </View>
            )}

            {isPublished && (
              <Pressable
                style={[
                  styles.rsvpButton,
                  going
                    ? styles.goingButton
                    : styles.notGoingButton,
                  (loadingRSVP || savingRSVP) &&
                    styles.disabledButton,
                ]}
                onPress={() => void handleRSVP()}
                disabled={
                  loadingRSVP || savingRSVP
                }
                accessibilityRole="button"
                accessibilityLabel={
                  going
                    ? "Cancel RSVP for this event"
                    : "RSVP to this event"
                }
                accessibilityState={{
                  selected: going,
                  disabled: loadingRSVP || savingRSVP,
                }}
              >
                {loadingRSVP || savingRSVP ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                ) : (
                  <Text
                    style={[
                      styles.rsvpButtonText,
                      going
                        ? styles.goingButtonText
                        : styles.notGoingButtonText,
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
          <Text style={styles.rsvpError}>
            {rsvpError}
          </Text>
        )}
      </View>
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
    borderWidth: 1,
    borderColor: "#E0E6EB",
    backgroundColor: theme.colors.background,
    borderRadius: 11,
    overflow: "hidden",
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
  // Event Information
  // --------------------------------------------------

  body: {
    padding: 13,
    minHeight: 143,
  },

  date: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: "600",
    marginBottom: 9,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 10,
  },

  location: {
    fontSize: 12,
    color: "#8290A4",
    lineHeight: 18,
  },

  // --------------------------------------------------
  // Card Footer
  // --------------------------------------------------

  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E5E9EE",
    marginTop: 13,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  price: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 12,
    flexShrink: 1,
  },

  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 6,
  },

  // --------------------------------------------------
  // Featured Badge
  // --------------------------------------------------

  badge: {
    backgroundColor: "#D7EFEB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },

  badgeText: {
    color: "#207E75",
    fontSize: 10,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // RSVP Buttons
  // --------------------------------------------------

  rsvpButton: {
    minWidth: 58,
    minHeight: 31,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  notGoingButton: {
    backgroundColor: "#FFFFFF",
    borderColor: theme.colors.primary,
  },

  goingButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },

  rsvpButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },

  notGoingButtonText: {
    color: theme.colors.primary,
  },

  goingButtonText: {
    color: "#FFFFFF",
  },

  disabledButton: {
    opacity: 0.55,
  },

  // --------------------------------------------------
  // RSVP Error
  // --------------------------------------------------

  rsvpError: {
    color: "#B42318",
    fontSize: 11,
    marginTop: 8,
    lineHeight: 15,
  },
});

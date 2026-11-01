
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useFocusEffect,
  useRouter,
} from "expo-router";

import { supabase } from "../../../src/lib/supabase";

import AppSearchInput from "../../../src/components/ui/AppSearchInput";
import EventSection from "../../../src/components/events/EventSection";

import { theme } from "../../../src/constants/theme";

import {
  getMyEvents,
  getMyUpcomingRSVPEvents,
  subscribeToRSVPChanges,
} from "../../../src/services/events";

import type { EventRecord } from "../../../src/types/event";

// --------------------------------------------------
// My Events Screen
// --------------------------------------------------

export default function MyEventsScreen() {
  const router = useRouter();

  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [rsvpEvents, setRSVPEvents] = useState<EventRecord[]>([]);
  const [currentUserID, setCurrentUserID] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  // --------------------------------------------------
  // Load Events for the Current User
  // --------------------------------------------------

  const fetchMyEvents = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        // ----------------------------------------
        // Check Authentication Session
        // ----------------------------------------

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        // ----------------------------------------
        // Signed-Out User
        // ----------------------------------------

        if (!session) {
          setSignedIn(false);
          setCurrentUserID(null);
          setEvents([]);
          setRSVPEvents([]);
          setError("");
          return;
        }

        // ----------------------------------------
        // Verify Authenticated User
        // ----------------------------------------

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          // If the session is no longer valid,
          // clear the local authentication state.

          if (
            authError.name === "AuthSessionMissingError" ||
            authError.name === "AuthApiError" &&
              authError.status === 401
          ) {
            setSignedIn(false);
            setCurrentUserID(null);
            setEvents([]);
            setRSVPEvents([]);
            setError("");
            return;
          }

          throw authError;
        }

        if (!user) {
          setSignedIn(false);
          setCurrentUserID(null);
          setEvents([]);
          setRSVPEvents([]);
          setError("");
          return;
        }

        // ----------------------------------------
        // Signed-In User
        // ----------------------------------------

        setSignedIn(true);
        setCurrentUserID(user.id);

        // Fetch created and RSVP'd events separately.

        const [createdEvents, attendingEvents] =
          await Promise.all([
            getMyEvents(user.id),
            getMyUpcomingRSVPEvents(user.id),
          ]);

        setEvents(createdEvents);
        setRSVPEvents(attendingEvents);
      } catch (err) {
        console.error("Error loading user events:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your events."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // --------------------------------------------------
  // Refresh Whenever Screen Receives Focus
  // --------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      void fetchMyEvents();
    }, [fetchMyEvents])
  );

  // --------------------------------------------------
  // Update Upcoming Events When RSVP Changes
  // --------------------------------------------------

  useEffect(() => {
    if (!currentUserID) {
      return;
    }

    let active = true;
    let updateVersion = 0;

    const unsubscribe = subscribeToRSVPChanges(
      (eventID, userID, going) => {
        if (userID !== currentUserID) {
          return;
        }

        const version = ++updateVersion;

        // ----------------------------------------
        // RSVP Removed
        // ----------------------------------------

        if (!going) {
          setRSVPEvents((previous) =>
            previous.filter(
              (event) => event.eventID !== eventID
            )
          );

          return;
        }

        // ----------------------------------------
        // RSVP Added
        // ----------------------------------------

        void getMyUpcomingRSVPEvents(currentUserID)
          .then((result) => {
            if (active && version === updateVersion) {
              setRSVPEvents(result);
            }
          })
          .catch((err) => {
            console.error(
              "Unable to refresh RSVP events:",
              err
            );
          });
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [currentUserID]);

  // --------------------------------------------------
  // Filter Events by Search
  // --------------------------------------------------

  const query = search.trim().toLowerCase();

  function matchesSearch(event: EventRecord): boolean {
    if (!query) {
      return true;
    }

    return [
      event.eventTitle,
      event.eventDescription,
      event.eventLocation,
      event.status,
    ].some((value) =>
      (value ?? "").toLowerCase().includes(query)
    );
  }

  // Events created by the user.

  const filteredEvents = events.filter(matchesSearch);

  // Events the user RSVP'd to.

  const filteredRSVPEvents = rsvpEvents.filter(matchesSearch);

  // --------------------------------------------------
  // Organize Events into Sections
  // --------------------------------------------------

  const now = Date.now();

  // Upcoming Events: Events the user is attending.

  const upcomingEvents = filteredRSVPEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime).getTime() >= now
  );

  // Your Active Events: Upcoming events created by the user.

  const activeEvents = filteredEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime).getTime() >= now
  );

  // Your Drafted Events.

  const draftEvents = filteredEvents.filter(
    (event) => event.status === "drafted"
  );

  // Your Past Events.

  const pastEvents = filteredEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime).getTime() < now
  );

  // Other Events.

  const otherEvents = filteredEvents.filter(
    (event) =>
      !activeEvents.includes(event) &&
      !draftEvents.includes(event) &&
      !pastEvents.includes(event)
  );

  // --------------------------------------------------
  // Loading State
  // --------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
        />

        <Text style={styles.loadingText}>
          Loading your events...
        </Text>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // Main Screen
  // --------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void fetchMyEvents(true);
            }}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header */}

        <Text style={styles.header}>
          Events
        </Text>

        {/* ----------------------------------------
            Navigation Tabs
        ---------------------------------------- */}

        <View style={styles.tabs}>
          <Pressable
            style={styles.inactiveTab}
            onPress={() =>
              router.replace("/events/all_events")
            }
            accessibilityRole="button"
            accessibilityLabel="All Events"
          >
            <Text style={styles.inactiveTabText}>
              All Events
            </Text>
          </Pressable>

          <View style={styles.activeTab}>
            <Text style={styles.activeTabText}>
              My Events
            </Text>
          </View>
        </View>

        {/* ----------------------------------------
            Signed-Out State
        ---------------------------------------- */}

        {!signedIn && (
          <View style={styles.signedOutContainer}>
            <Text style={styles.signedOutMessage}>
              Log in to see your events.
            </Text>

            <Text style={styles.signedOutDescription}>
              View events you've created and events you're attending.
            </Text>

            <Pressable
              style={styles.loginButton}
              onPress={() =>
                router.push("/Login_Sign_Up/login")
              }
              accessibilityRole="button"
              accessibilityLabel="Log in to see your events"
            >
              <Text style={styles.loginButtonText}>
                Log In
              </Text>
            </Pressable>

            {!!error && (
              <Text style={styles.errorText}>
                {error}
              </Text>
            )}
          </View>
        )}

        {/* ----------------------------------------
            Signed-In Content
        ---------------------------------------- */}

        {signedIn && (
          <>
            {/* ----------------------------------------
                Search and Create Event Row
            ---------------------------------------- */}

            <View style={styles.searchAndCreateRow}>
              {/* Search Bar */}

              <View style={styles.searchWrapper}>
                <AppSearchInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search your events..."
                />
              </View>

              {/* Create Event Button */}

              <Pressable
                style={[
                  styles.primaryButton,
                  styles.createEventButton,
                ]}
                onPress={() =>
                  router.push("/events/create_event")
                }
                accessibilityRole="button"
                accessibilityLabel="Create a new event"
              >
                <Text style={styles.buttonText}>
                  + Create Event
                </Text>
              </Pressable>
            </View>

            {/* ----------------------------------------
                Database Errors
            ---------------------------------------- */}

            {!!error && (
              <View style={styles.message}>
                <Text style={styles.errorText}>
                  {error}
                </Text>

                <Pressable
                  onPress={() => {
                    void fetchMyEvents();
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.retryText}>
                    Retry
                  </Text>
                </Pressable>
              </View>
            )}

            {/* ----------------------------------------
                Empty State
            ---------------------------------------- */}

            {!error &&
              filteredEvents.length === 0 &&
              filteredRSVPEvents.length === 0 && (
                <View style={styles.message}>
                  <Text style={styles.emptyTitle}>
                    No events found
                  </Text>

                  <Text style={styles.emptyText}>
                    {events.length === 0 &&
                    rsvpEvents.length === 0
                      ? "You haven't created or RSVP'd to any events yet."
                      : "Try another search."}
                  </Text>
                </View>
              )}

            {/* ----------------------------------------
                Event Sections
            ---------------------------------------- */}

            {!error && (
              <>
                <EventSection
                  title="Upcoming Events"
                  data={upcomingEvents}
                  from="my_events"
                />

                <EventSection
                  title="Your Active Events"
                  data={activeEvents}
                  from="my_events"
                />

                <EventSection
                  title="Your Drafted Events"
                  data={draftEvents}
                  from="my_events"
                />

                <EventSection
                  title="Your Past Events"
                  data={pastEvents}
                  from="my_events"
                />

                <EventSection
                  title="Other Events"
                  data={otherEvents}
                  from="my_events"
                />

              </>
            )}
          </>
        )}

        <View style={styles.bottom} />
      </ScrollView>
    </SafeAreaView>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------

const styles = StyleSheet.create({
  // --------------------------------------------------
  // Page Layout
  // --------------------------------------------------

  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  scrollContent: {
    flexGrow: 1,
  },

  center: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.secondaryText,
  },

  // --------------------------------------------------
  // Header
  // --------------------------------------------------

  header: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.text,
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 18,
  },

  // --------------------------------------------------
  // Navigation Tabs
  // --------------------------------------------------

  tabs: {
    height: 52,
    flexDirection: "row",
    paddingHorizontal: 24,
    alignItems: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },

  activeTab: {
    height: "100%",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },

  activeTabText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },

  inactiveTab: {
    height: "100%",
    justifyContent: "center",
    marginRight: 25,
  },

  inactiveTabText: {
    color: "#53617A",
    fontSize: 14,
  },

  // --------------------------------------------------
  // Search and Create Event Row
  // --------------------------------------------------

  searchAndCreateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 16,
    gap: 10,
  },

  searchWrapper: {
    flex: 1,
    minWidth: 0,
  },

  createEventButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexShrink: 0,
  },

  // --------------------------------------------------
  // Shared Buttons
  // --------------------------------------------------

  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 9,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
  },

  // --------------------------------------------------
  // Signed-Out Screen
  // --------------------------------------------------

  signedOutContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 80,
    gap: 18,
  },

  signedOutMessage: {
    color: "#53617A",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },

  signedOutDescription: {
    color: theme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },

  loginButton: {
    backgroundColor: "#31988F",
    borderRadius: 8,
    paddingHorizontal: 30,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // Messages and Errors
  // --------------------------------------------------

  message: {
    padding: 24,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
  },

  emptyText: {
    fontSize: 13,
    color: theme.colors.secondaryText,
    marginTop: 8,
    textAlign: "center",
  },

  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },

  retryText: {
    color: theme.colors.primary,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // Bottom Spacing
  // --------------------------------------------------

  bottom: {
    height: 35,
  },
});


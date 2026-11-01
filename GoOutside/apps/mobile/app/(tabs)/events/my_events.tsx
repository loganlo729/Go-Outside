// React hooks
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

// UI components
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// Icons and safe areas
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

// Navigation hooks
import {
  useFocusEffect,
  useRouter,
} from "expo-router";

// Supabase client
import { supabase } from "../../../src/lib/supabase";

// Event sections
import EventSection from "../../../src/components/events/EventSection";

// App theme
import { theme } from "../../../src/constants/theme";

// Event fetching and RSVP updates
import {
  getMyEvents,
  getMyUpcomingRSVPEvents,
  subscribeToRSVPChanges,
} from "../../../src/services/events";

// Event type
import type {
  EventRecord,
} from "../../../src/types/event";


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

  const [currentUserID, setCurrentUserID] =
    useState<string | null>(null);

  const [signedIn, setSignedIn] = useState(false);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Fetch My Events
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
          data: sessionData,
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        // ----------------------------------------
        // Signed-Out User
        // ----------------------------------------

        if (!sessionData.session) {
          setSignedIn(false);
          setCurrentUserID(null);
          setEvents([]);
          setRSVPEvents([]);
          return;
        }

        // ----------------------------------------
        // Verify Current User
        // ----------------------------------------

        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          if (
            authError.name === "AuthSessionMissingError" ||
            authError.status === 401
          ) {
            setSignedIn(false);
            setCurrentUserID(null);
            setEvents([]);
            setRSVPEvents([]);
            return;
          }

          throw authError;
        }

        const user = authData.user;

        if (!user) {
          setSignedIn(false);
          setCurrentUserID(null);
          setEvents([]);
          setRSVPEvents([]);
          return;
        }

        // ----------------------------------------
        // Signed-In User
        // ----------------------------------------

        setSignedIn(true);
        setCurrentUserID(user.id);

        // Fetch created and RSVP'd events separately.

        const [created, attending] =
          await Promise.all([
            getMyEvents(user.id),
            getMyUpcomingRSVPEvents(user.id),
          ]);

        setEvents(created);
        setRSVPEvents(attending);
      } catch (err) {
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
  // Refresh When Screen Receives Focus
  // --------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      void fetchMyEvents();
    }, [fetchMyEvents])
  );

  // --------------------------------------------------
  // Synchronize RSVP Changes
  // --------------------------------------------------

  useEffect(() => {
    if (!currentUserID) {
      return;
    }

    let active = true;
    let version = 0;

    const unsubscribe = subscribeToRSVPChanges(
      (eventID, userID, going) => {
        if (userID !== currentUserID) {
          return;
        }

        const requestVersion = ++version;

        // ----------------------------------------
        // RSVP Cancelled
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
            if (
              active &&
              requestVersion === version
            ) {
              setRSVPEvents(result);
            }
          })
          .catch((err) => {
            console.error(
              "Unable to refresh RSVPs:",
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
  // Search Filtering
  // --------------------------------------------------

  const query = search.trim().toLowerCase();

  function matchesSearch(event: EventRecord): boolean {
    return (
      !query ||
      [
        event.eventTitle,
        event.eventDescription,
        event.eventLocation,
        event.status,
      ].some((value) =>
        (value ?? "").toLowerCase().includes(query)
      )
    );
  }

  const filteredEvents = events.filter(matchesSearch);
  const filteredRSVPEvents = rsvpEvents.filter(matchesSearch);

  // --------------------------------------------------
  // Organize Event Sections
  // --------------------------------------------------

  const now = Date.now();

  // Upcoming events the user is attending.

  const upcomingEvents = filteredRSVPEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime).getTime() >= now
  );

  // Upcoming events created by the user.

  const activeEvents = filteredEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime).getTime() >= now
  );

  // Drafts created by the user.

  const draftEvents = filteredEvents.filter(
    (event) =>
      event.status === "drafted"
  );

  // Past events created by the user.

  const pastEvents = filteredEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime).getTime() < now
  );

  // Other created events.

  const otherEvents = filteredEvents.filter(
    (event) =>
      !activeEvents.includes(event) &&
      !draftEvents.includes(event) &&
      !pastEvents.includes(event)
  );

  // --------------------------------------------------
  // Empty State
  // --------------------------------------------------

  const hasNoMatches =
    filteredEvents.length === 0 &&
    filteredRSVPEvents.length === 0;

  const hasNoEvents =
    events.length === 0 &&
    rsvpEvents.length === 0;

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              void fetchMyEvents(true)
            }
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* ----------------------------------------
            Dashboard Navigation
        ---------------------------------------- */}

        <View style={styles.tabs}>
          {/* All Events - Inactive */}

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

          {/* My Events - Active */}

          <View style={styles.activeTab}>
            <Text style={styles.activeTabText}>
              My Events
            </Text>
          </View>
        </View>

        {/* ----------------------------------------
            Page Heading
        ---------------------------------------- */}

        <Text style={styles.heading}>
          My Events
        </Text>

        {/* ----------------------------------------
            Loading State
        ---------------------------------------- */}

        {loading ? (
          <View style={styles.message}>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary}
            />

            <Text style={styles.messageText}>
              Loading your events...
            </Text>
          </View>
        ) : error ? (
          // ----------------------------------------
          // Error State
          // ----------------------------------------

          <View style={styles.message}>
            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              onPress={() =>
                void fetchMyEvents()
              }
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : !signedIn ? (
          // ----------------------------------------
          // Signed-Out State
          // ----------------------------------------

          <View style={styles.signedOutContainer}>
            <Text style={styles.signedOutTitle}>
              Log in to see your events.
            </Text>

            <Text style={styles.messageText}>
              View events you've created and events you're attending.
            </Text>

            <Pressable
              style={styles.loginButton}
              onPress={() =>
                router.push("/Login_Sign_Up/login")
              }
              accessibilityRole="button"
              accessibilityLabel="Log in"
            >
              <Text style={styles.buttonText}>
                Log In
              </Text>
            </Pressable>
          </View>
        ) : (
          // ----------------------------------------
          // Signed-In Content
          // ----------------------------------------

          <>
            {/* ----------------------------------------
                Search and Create Event Row
            ---------------------------------------- */}

            <View style={styles.searchAndCreateRow}>
              {/* Search Bar */}

              <View style={styles.searchField}>
                <Feather
                  name="search"
                  size={18}
                  color="#66748C"
                />

                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search your events..."
                  placeholderTextColor="#8996AA"
                  accessibilityLabel="Search your events"
                />
              </View>

              {/* Create Event Button */}

              <Pressable
                style={styles.createEventButton}
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
                Empty State
            ---------------------------------------- */}

            {hasNoMatches ? (
              <View style={styles.message}>
                <Text style={styles.emptyTitle}>
                  No events found
                </Text>

                <Text style={styles.messageText}>
                  {hasNoEvents
                    ? "You haven't created or RSVP'd to any events yet."
                    : "Try another search."}
                </Text>
              </View>
            ) : (
              // ----------------------------------------
              // Event Sections
              // ----------------------------------------

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
      </ScrollView>
    </SafeAreaView>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------

const styles = StyleSheet.create({
  // --------------------------------------------------
  // Page
  // --------------------------------------------------

  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 35,
  },

  // --------------------------------------------------
  // Navigation Tabs
  // --------------------------------------------------

  tabs: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  activeTab: {
    height: "100%",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#31988F",
    marginRight: 25,
  },

  activeTabText: {
    color: "#31988F",
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
  // Page Heading
  // --------------------------------------------------

  heading: {
    marginTop: 28,
    marginBottom: 16,
    marginHorizontal: 24,
    fontSize: 30,
    fontWeight: "800",
    color: theme.colors.text,
  },

  // --------------------------------------------------
  // Search and Create Event Row
  // --------------------------------------------------

  searchAndCreateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginBottom: 16,
    gap: 10,
  },

  searchField: {
    flex: 1,
    minWidth: 0,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: "#F1F4F8",
    borderWidth: 1,
    borderColor: "#E1E6EA",
  },

  searchInput: {
    flex: 1,
    height: "100%",
    marginLeft: 7,
    fontSize: 14,
    color: theme.colors.text,
    padding: 0,
  },

  createEventButton: {
    height: 52,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 9,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // Messages
  // --------------------------------------------------

  message: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 12,
  },

  messageText: {
    color: theme.colors.secondaryText,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },

  errorText: {
    color: theme.colors.error,
    textAlign: "center",
    fontSize: 13,
  },

  retryText: {
    color: theme.colors.primary,
    fontWeight: "700",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },

  // --------------------------------------------------
  // Signed-Out State
  // --------------------------------------------------

  signedOutContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 80,
    gap: 18,
  },

  signedOutTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#53617A",
    textAlign: "center",
  },

  loginButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
});

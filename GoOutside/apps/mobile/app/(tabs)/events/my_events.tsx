
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
  // Load Events Owned by Current User
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
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }
        
        if (!user) {
          setSignedIn(false);
          setCurrentUserID(null);

          setEvents([]);
          setRSVPEvents([]);

          return;
        }

        setSignedIn(true);
        setCurrentUserID(user.id);

        // Fetch created events and RSVP'd events separately.

        const [createdEvents, attendingEvents] =
          await Promise.all([
            getMyEvents(user.id),
            getMyUpcomingRSVPEvents(user.id),
          ]);

        setEvents(createdEvents);
        setRSVPEvents(attendingEvents);

        
      } catch (err) {
        console.error(
          "Error loading user events:",
          err
        );

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

      // Screen automatically reloads after returning
      // from the Create Event screen.
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

    const unsubscribe = subscribeToRSVPChanges(
      (eventID, userID, going) => {
        if (userID !== currentUserID) {
          return;
        }

        if (!going) {
          // Remove the event immediately when
          // the user cancels their RSVP.

          setRSVPEvents((previous) =>
            previous.filter(
              (event) => event.eventID !== eventID
            )
          );

          return;
        }

        // Reload upcoming RSVP events when
        // the user RSVPs to a new event.

        void getMyUpcomingRSVPEvents(currentUserID)
          .then((result) => {
            if (active) {
              setRSVPEvents(result);
            }
          })
          .catch((error) => {
            console.error(
              "Unable to refresh RSVP events:",
              error
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

  // Events created by the current user.

  const filteredEvents = events.filter(matchesSearch);

  // Events the current user RSVP'd to.

  const filteredRSVPEvents =
    rsvpEvents.filter(matchesSearch);


  // --------------------------------------------------
  // Organize Events into Sections
  // --------------------------------------------------

  const now = new Date();

  // Upcoming events that the user is RSVP'd to
  const upcomingEvents = filteredRSVPEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime) >= now
  );

  // Active events created by the user
  const activeEvents = filteredEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime) >= now
  );

  // Drafted events created by the user
  const draftEvents = filteredEvents.filter(
    (event) =>
      event.status.toLowerCase().includes("draft")
  );

  // Past events created by the user
  const pastEvents = filteredEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime) < now
  );

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchMyEvents(true)}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header */}

        <Text style={styles.header}>
          Events
        </Text>

        {/* Dashboard Navigation */}

        <View style={styles.tabs}>
          <Pressable
            style={styles.inactiveTab}
            onPress={() =>
              router.replace("/events/all_events")
            }
            accessibilityRole="button"
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
          <View style={styles.message}>
            <Text style={styles.emptyTitle}>
              Sign in to see your events
            </Text>

            <Text style={styles.emptyText}>
              Events you create will appear here.
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                router.push("/Login_Sign_Up/login")
              }
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>
                Log in
              </Text>
            </Pressable>
          </View>
        )}

        {/* ----------------------------------------
            Signed-In Content
        ---------------------------------------- */}

        {signedIn && (
          <>
            {/* Search Bar and Create Event Button */}
              <View style={styles.searchAndCreateRow}>
                {/* Search Bar - Left */}

                <View style={styles.searchWrapper}>
                  <AppSearchInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search your events..."
                  />
                </View>

                {/* Create Event Button - Right */}
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
            

            {/* Database Errors */}

            {!!error && (
              <View style={styles.message}>
                <Text style={styles.errorText}>
                  {error}
                </Text>

                <Pressable
                  onPress={() => fetchMyEvents()}
                  accessibilityRole="button"
                >
                  <Text style={styles.retryText}>
                    Retry
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Empty State */}

            {!error &&
              filteredEvents.length === 0 && 
              filteredRSVPEvents.length === 0 && (
                <View style={styles.message}>
                  <Text style={styles.emptyTitle}>
                    No events found
                  </Text>

                  <Text style={styles.emptyText}>
                    {events.length === 0 && rsvpEvents.length === 0
                      ? "You haven't created any events yet."
                      : "Try another search."}
                  </Text>
                </View>
              )}

            {/* Event Sections */}

            {!error && (
              <>
                <EventSection
                  title="Upcoming Events"
                  data={upcomingEvents}
                />

                <EventSection
                  title="Your Active Events"
                  data={activeEvents}
                />

                <EventSection
                  title="Your Drafted Events"
                  data={draftEvents}
                />

                <EventSection
                  title="Your Past Events"
                  data={pastEvents}
                />

                <EventSection
                  title="Other Events"
                  data={otherEvents}
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
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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

  // Header

  header: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.text,
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 18,
  },

  // Navigation Tabs

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

  // Create Event Button

  createEventRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 16,
  },

  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 9,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 0,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
  },

  // Messages
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

  // Bottom Spacing
  bottom: {
    height: 35,
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

});

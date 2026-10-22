
import React, {
  useCallback,
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
import { getMyEvents } from "../../../src/services/events";

import type {
  EventRecord,
} from "../../../src/types/event";

export default function MyEventsScreen() {
  const router = useRouter();

  const [events, setEvents] =
    useState<EventRecord[]>([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  // -----------------------------------------
  // Load events owned by current user
  // -----------------------------------------

  const fetchMyEvents = useCallback(async (
    isRefresh = false
  ) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      // Get verified user from Supabase Auth
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        setSignedIn(false);
        setEvents([]);
        return;
      }

      setSignedIn(true);

      const userEvents = await getMyEvents(user.id);

      setEvents(userEvents);
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
  }, []);

  // Refresh whenever this screen receives focus.
  // This also updates the screen after returning
  // from a future event-creation/editing screen.

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void fetchMyEvents();

      return () => {
        active = false;
        // Reserved for cancelling future requests.
      };
    }, [fetchMyEvents])
  );

  // -----------------------------------------
  // Search
  // -----------------------------------------

  const filteredEvents = events.filter((event) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return [
      event.eventTitle,
      event.eventDescription,
      event.eventLocation,
      event.status,
    ].some((value) =>
      (value ?? "").toLowerCase().includes(query)
    );
  });

  const now = new Date();

  const upcomingEvents = filteredEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime) >= now
  );

  const draftEvents = filteredEvents.filter(
    (event) =>
      event.status.toLowerCase().includes("draft")
  );

  const pastEvents = filteredEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime) < now
  );

  const otherEvents = filteredEvents.filter(
    (event) =>
      !upcomingEvents.includes(event) &&
      !draftEvents.includes(event) &&
      !pastEvents.includes(event)
  );

  // -----------------------------------------
  // Loading
  // -----------------------------------------

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

  // -----------------------------------------
  // Main screen
  // -----------------------------------------

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
        <Text style={styles.header}>
          Events
        </Text>

        {/* Dashboard navigation */}

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

        {/* Signed-out state */}

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
            >
              <Text style={styles.buttonText}>
                Log in
              </Text>
            </Pressable>
          </View>
        )}

        {/* Signed-in content */}

        {signedIn && (
          <>
            <AppSearchInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search your events..."
            />

            {!!error && (
              <View style={styles.message}>
                <Text style={styles.errorText}>
                  {error}
                </Text>

                <Pressable
                  onPress={() => fetchMyEvents()}
                >
                  <Text style={styles.retryText}>
                    Retry
                  </Text>
                </Pressable>
              </View>
            )}

            {!error &&
              filteredEvents.length === 0 && (
                <View style={styles.message}>
                  <Text style={styles.emptyTitle}>
                    No events found
                  </Text>

                  <Text style={styles.emptyText}>
                    {events.length === 0
                      ? "You haven't created any events yet."
                      : "Try another search."}
                  </Text>
                </View>
              )}

            {!error && (
              <>
                <EventSection
                  title="Upcoming Events"
                  data={upcomingEvents}
                />

                <EventSection
                  title="Drafts"
                  data={draftEvents}
                />

                <EventSection
                  title="Past Events"
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

  header: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.text,
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 18,
  },

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

  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 9,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 20,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  bottom: {
    height: 35,
  },
});

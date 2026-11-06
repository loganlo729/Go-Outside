
// React hooks
import React, {
  useCallback,
  useState,
} from "react";

// React Native components
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Navigation
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";

// Event components
import EventCard from "../../../../src/components/events/EventCard";

// Supabase client
import { supabase } from "../../../../src/lib/supabase";

// Event services
import {
  getMyEvents,
  getMyUpcomingRSVPEvents,
} from "../../../../src/services/events";

// Event type
import type {
  EventRecord,
} from "../../../../src/types/event";

// --------------------------------------------------
// Section Types
// --------------------------------------------------

type SectionID =
  | "upcoming"
  | "active"
  | "drafted"
  | "past"
  | "other";

// --------------------------------------------------
// My Events Collection Screen
// --------------------------------------------------

export default function MyEventCollectionScreen() {
  // --------------------------------------------------
  // Route Parameters
  // --------------------------------------------------

  const { sectionID } = useLocalSearchParams<{
    sectionID: string;
  }>();

  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [createdEvents, setCreatedEvents] =
    useState<EventRecord[]>([]);

  const [rsvpEvents, setRSVPEvents] =
    useState<EventRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  // --------------------------------------------------
  // Load User Events
  // --------------------------------------------------

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Get current user

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      // Signed-out user

      if (!user) {
        setSignedIn(false);
        setCreatedEvents([]);
        setRSVPEvents([]);
        return;
      }

      setSignedIn(true);

      // Fetch created and RSVP'd events

      const [created, attending] =
        await Promise.all([
          getMyEvents(user.id),
          getMyUpcomingRSVPEvents(user.id),
        ]);

      setCreatedEvents(created);
      setRSVPEvents(attending);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your events."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // --------------------------------------------------
  // Refresh When Screen Opens
  // --------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents])
  );

  // --------------------------------------------------
  // Organize Events
  // --------------------------------------------------

  const now = Date.now();

  // Upcoming RSVP'd events

  const upcomingEvents = rsvpEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime).getTime() >= now
  );

  // Active events created by user

  const activeEvents = createdEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime).getTime() >= now
  );

  // Drafted events

  const draftEvents = createdEvents.filter(
    (event) => event.status === "drafted"
  );

  // Past events

  const pastEvents = createdEvents.filter(
    (event) =>
      event.status === "publicActive" &&
      !!event.eventStartTime &&
      new Date(event.eventStartTime).getTime() < now
  );

  // Other events

  const otherEvents = createdEvents.filter(
    (event) =>
      !activeEvents.includes(event) &&
      !draftEvents.includes(event) &&
      !pastEvents.includes(event)
  );

  // --------------------------------------------------
  // Section Definitions
  // --------------------------------------------------

  const collections: Record<
    SectionID,
    {
      title: string;
      events: EventRecord[];
    }
  > = {
    upcoming: {
      title: "Upcoming Events",
      events: upcomingEvents,
    },

    active: {
      title: "Your Active Events",
      events: activeEvents,
    },

    drafted: {
      title: "Your Drafted Events",
      events: draftEvents,
    },

    past: {
      title: "Your Past Events",
      events: pastEvents,
    },

    other: {
      title: "Other Events",
      events: otherEvents,
    },
  };

  // --------------------------------------------------
  // Select Collection
  // --------------------------------------------------

  const validSection =
    typeof sectionID === "string" &&
    Object.prototype.hasOwnProperty.call(
      collections,
      sectionID
    );

  const selectedCollection = validSection
    ? collections[sectionID as SectionID]
    : null;

  const title =
    selectedCollection?.title ?? "My Events";

  const selectedEvents =
    selectedCollection?.events ?? [];

  // --------------------------------------------------
  // Back Navigation
  // --------------------------------------------------

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/events/my_events");
    }
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <View style={styles.container}>
      {/* Back Button */}

      <Pressable
        style={styles.backButton}
        onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel="Back to My Events"
      >
        <Text style={styles.backText}>
          ← Back to My Events
        </Text>
      </Pressable>

      {/* Section Title */}

      <Text style={styles.heading}>
        {title}
      </Text>

      {/* Loading State */}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#31988F"
          />

          <Text style={styles.message}>
            Loading events...
          </Text>
        </View>
      ) : error ? (
        /* Error State */

        <View style={styles.center}>
          <Text style={styles.error}>
            {error}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => void loadEvents()}
          >
            <Text style={styles.retryText}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : !signedIn ? (
        /* Signed-Out State */

        <View style={styles.center}>
          <Text style={styles.message}>
            Log in to see your events.
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.retryText}>
              Log In
            </Text>
          </Pressable>
        </View>
      ) : !selectedCollection ? (
        /* Invalid Section */

        <View style={styles.center}>
          <Text style={styles.message}>
            Event section not found.
          </Text>
        </View>
      ) : (
        /* Vertical Event List */

        <FlatList
          data={selectedEvents}
          keyExtractor={(event) => event.eventID}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              from="my_events"
              layout="horizontal"
            />
          )}
          ListEmptyComponent={
            <Text style={styles.message}>
              No events found in this section.
            </Text>
          }
        />
      )}
    </View>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------

const styles = StyleSheet.create({
  // --------------------------------------------------
  // Screen Container
  // --------------------------------------------------

  container: {
    flex: 1,
    backgroundColor: "#F7F9F5",
    paddingHorizontal: 18,
    paddingTop: 20,
  },

  // --------------------------------------------------
  // Back Navigation
  // --------------------------------------------------

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    marginBottom: 20,
  },

  backText: {
    color: "#3F6D3F",
    fontSize: 15,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // Page Heading
  // --------------------------------------------------

  heading: {
    color: "#18232B",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 20,
  },

  // --------------------------------------------------
  // Vertical Event List
  // --------------------------------------------------

  list: {
    paddingBottom: 32,
    gap: 14,
  },

  // --------------------------------------------------
  // Status Messages
  // --------------------------------------------------

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  message: {
    color: "#667085",
    fontSize: 15,
    textAlign: "center",
    marginTop: 14,
  },

  error: {
    color: "#B42318",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 16,
  },

  // --------------------------------------------------
  // Retry and Login Buttons
  // --------------------------------------------------

  retryButton: {
    backgroundColor: "#31988F",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },

  retryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

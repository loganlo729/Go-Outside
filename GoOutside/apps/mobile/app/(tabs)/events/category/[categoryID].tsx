
// React hooks
import { useEffect, useState } from "react";

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
  useLocalSearchParams,
} from "expo-router";

// Event components
import EventCard from "../../../../src/components/events/EventCard";

// Event services
import {
  getUpcomingEventsAndCategories,
} from "../../../../src/services/events";

// Event types
import type {
  EventRecord,
  CategoryRecord,
} from "../../../../src/types/event";

// --------------------------------------------------
// Category View All Screen
// --------------------------------------------------

export default function CategoryEventsScreen() {
  const { categoryID } = useLocalSearchParams<{
    categoryID: string;
  }>();


  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [categories, setCategories] =
    useState<CategoryRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Load Events
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      setLoading(true);
      setError("");

      try {
        const result =
          await getUpcomingEventsAndCategories();

        if (!active) return;

        setEvents(result.events);
        setCategories(result.categories);
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load events."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadEvents();

    return () => {
      active = false;
    };
  }, []);

  // --------------------------------------------------
  // Filter Category
  // --------------------------------------------------

  const isFeatured = categoryID === "featured";

  const category = categories.find(
    (item) => item.categoryID === categoryID
  );

  const title = isFeatured
    ? "Featured Events"
    : category?.categoryName ?? "Category Events";

  const matchingEvents = events.filter((event) =>
    isFeatured
      ? event.isFeatured
      : event.categoryID === categoryID
  );

  // --------------------------------------------------
  // Back Navigation
  // --------------------------------------------------

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/events/all_events");
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
      >
        <Text style={styles.backText}>
          ← Back to All Events
        </Text>
      </Pressable>

      {/* Heading */}

      <Text style={styles.heading}>
        {title}
      </Text>

      {/* Loading */}

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#31988F"
        />
      ) : error ? (
        <Text style={styles.message}>
          {error}
        </Text>
      ) : !isFeatured && !category ? (
        <Text style={styles.message}>
          Category not found.
        </Text>
      ) : matchingEvents.length === 0 ? (
        <Text style={styles.message}>
          No upcoming events in this category.
        </Text>   
      ) : (
        <FlatList
          data={matchingEvents}
          keyExtractor={(event) => event.eventID}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              from="all_events"
              layout="horizontal"
              returnTo={`/events/category/${encodeURIComponent(categoryID)}`}
            />
          )}
        />
      )}
    </View>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9F5",
    paddingHorizontal: 18,
    paddingTop: 20,
  },

  backButton: {
    alignSelf: "flex-start",
    marginBottom: 24,
    paddingVertical: 6,
  },

  backText: {
    color: "#3F6D3F",
    fontSize: 15,
    fontWeight: "700",
  },

  heading: {
    color: "#18232B",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 20,
  },

  // Vertical Event List
  list: {
    paddingBottom: 32,
    gap: 14,
  },

  message: {
    color: "#667085",
    fontSize: 15,
    marginTop: 20,
  },
});

// React hooks
import React, {
  useCallback,
  useMemo,
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
  View,
} from "react-native";

// Safe area
import { SafeAreaView } from "react-native-safe-area-context";

// Navigation hooks
import {
  useFocusEffect,
  useRouter,
} from "expo-router";

// Event components
import AppSearchInput from "../../../src/components/ui/AppSearchInput";
import EventFilters from "../../../src/components/events/EventFilters";
import EventSection from "../../../src/components/events/EventSection";

// App theme
import { theme } from "../../../src/constants/theme";

// Event fetching
import {
  getUpcomingEventsAndCategories,
} from "../../../src/services/events";

// Event and filter types
import type {
  CategoryRecord,
  DateFilter,
  EventRecord,
} from "../../../src/types/event";

// --------------------------------------------------
// All Events Screen
// --------------------------------------------------

export default function AllEventsScreen() {
  const router = useRouter();

  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);

  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]); // Changed from selectedCategory to selectedCategories to filter by multiple categories
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Add or remove selected categories
  function toggleCategory(categoryID: string) {
    setSelectedCategories((previous) =>
      previous.includes(categoryID)
        ? previous.filter((id) => id !== categoryID)
        : [...previous, categoryID]
    );
  }

  // Reset category filters
  function clearCategories() {
    setSelectedCategories([]);
  }

  // --------------------------------------------------
  // Fetch Upcoming Events and Categories
  // --------------------------------------------------

  const loadEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const result = await getUpcomingEventsAndCategories();

      setEvents(result.events);
      setCategories(result.categories);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load events."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // --------------------------------------------------
  // Refresh When Screen Receives Focus
  // --------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents])
  );

  // --------------------------------------------------
  // Filter Events
  // --------------------------------------------------

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const end = new Date(now);

    // Date ranges
    if (dateFilter === "twoWeeks") {
      end.setDate(end.getDate() + 14);
    } else if (dateFilter === "month") {
      end.setMonth(end.getMonth() + 1);
    }

    const query = search.trim().toLowerCase();

    return events.filter((event) => {
      // Search matching
      const matchesSearch =
        !query ||
        [
          event.eventTitle,
          event.eventDescription,
          event.eventLocation,
        ].some((value) =>
          (value ?? "").toLowerCase().includes(query)
        );

      // Category matching
      const matchesCategory =
        selectedCategories.length === 0 ||
        (
          event.categoryID !== null &&
          selectedCategories.includes(event.categoryID)
        );
        
      // Date matching.
      const startDate = event.eventStartTime
        ? new Date(event.eventStartTime)
        : null;

      const matchesDate =
        dateFilter === "all" ||
        (
          !!startDate &&
          startDate >= now &&
          startDate <= end
        );

      return (
        matchesSearch &&
        matchesCategory &&
        matchesDate
      );
    });
  }, [
    events,
    search,
    selectedCategories,
    dateFilter,
  ]);

  // --------------------------------------------------
  // Render
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
            onRefresh={() => void loadEvents(true)}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* ----------------------------------------
            Dashboard Navigation
        ---------------------------------------- */}

        <View style={styles.tabs}>
          {/* All Events - Active */}
          <View style={styles.activeTab}>
            <Text style={styles.activeTabText}>
              All Events
            </Text>
          </View>

          {/* My Events - Inactive */}

          <Pressable
            style={styles.inactiveTab}
            onPress={() =>
              router.replace("/events/my_events")
            }
            accessibilityRole="button"
            accessibilityLabel="My Events"
          >
            <Text style={styles.inactiveTabText}>
              My Events
            </Text>
          </Pressable>
        </View>

        {/* ----------------------------------------
            Page Heading
        ---------------------------------------- */}

        <Text style={styles.heading}>
          All Events
        </Text>

        {/* ----------------------------------------
            Search Bar
        ---------------------------------------- */}

        <AppSearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search all events..."
        />

        {/* ----------------------------------------
            Category and Date Filters
        ---------------------------------------- */}

        <EventFilters
          categories={categories}
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          onClearCategories={clearCategories}
          dateFilter={dateFilter}
          onSelectDate={setDateFilter}
        />

        {/* ----------------------------------------
            Event Sections
        ---------------------------------------- */}

        {loading ? (
          <View style={styles.message}>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary}
            />

            <Text style={styles.messageText}>
              Loading events...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.message}>
            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              onPress={() => void loadEvents()}
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View style={styles.message}>
            <Text style={styles.messageText}>
              No events found. Try adjusting your search or filters.
            </Text>
          </View>
        ) : (
          <>
            {/* Featured Events */}
            <EventSection
              title="Featured"
              data={filteredEvents.filter(
                (event) => event.isFeatured
              )}
            />

            {/* Category Event Sections */}

            {categories
              .filter(
                (category) =>
                  selectedCategories.length === 0 ||
                  selectedCategories.includes(category.categoryID)
              )
              .map((category) => (
                <EventSection
                  key={category.categoryID}
                  title={category.categoryName}
                  data={filteredEvents.filter(
                    (event) =>
                      event.categoryID === category.categoryID
                  )}
                />
              ))}
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
  // Page
  // --------------------------------------------------

  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  scrollContent: {
    paddingBottom: 30,
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
    fontSize: 14,
    fontWeight: "700",
    color: "#31988F",
  },

  inactiveTab: {
    height: "100%",
    justifyContent: "center",
    marginRight: 25,
  },

  inactiveTabText: {
    fontSize: 14,
    color: "#53617A",
  },

  // --------------------------------------------------
  // Heading
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
  // Messages
  // --------------------------------------------------

  message: {
    paddingHorizontal: 24,
    paddingVertical: 35,
    alignItems: "center",
    gap: 12,
  },

  messageText: {
    color: theme.colors.secondaryText,
    textAlign: "center",
    fontSize: 14,
  },

  errorText: {
    color: theme.colors.error,
    textAlign: "center",
    fontSize: 14,
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

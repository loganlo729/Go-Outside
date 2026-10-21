
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useRouter } from "expo-router";
import { supabase } from "../../../src/lib/supabase";

// --------------------------------------------------
// Constants
// --------------------------------------------------

const GREEN = "#31988F";
const DARK = "#202A23";
const PUBLISHED_STATUS = "publicActive";

// --------------------------------------------------
// Types
// --------------------------------------------------

type EventRecord = {
  eventID: string;
  userID: string;
  categoryID: string | null;
  eventTitle: string;
  eventDescription: string | null;
  eventStartTime: string | null;
  eventEndTime: string | null;
  eventLocation: string | null;
  eventCost: number | null;
  eventImageURL: string | null;
  isFeatured: boolean;
  status: string;
};

type CategoryRecord = {
  categoryID: string;
  categoryName: string;
};

type DateFilter = "all" | "twoWeeks" | "month";

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function formatEventDate(date: string | null) {
  if (!date) return "Date to be announced";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Date to be announced";
  }

  return parsed.toLocaleString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatEventCost(cost: number | null) {
  if (cost === null || cost === undefined) {
    return "Price unavailable";
  }

  const amount = Number(cost);

  if (!Number.isFinite(amount)) {
    return "Price unavailable";
  }

  if (amount === 0) return "Free";

  return `$${amount.toFixed(2)}`;
}

// --------------------------------------------------
// Event Card
// Defined OUTSIDE AllEventsScreen
// --------------------------------------------------

function EventCard({
  event,
}: {
  event: EventRecord;
}) {
  const hasImage =
    !!event.eventImageURL &&
    /^https:\/\//i.test(event.eventImageURL);

  return (
    <View style={styles.eventCard}>

      {/* Event image */}

      {hasImage ? (
        <Image
          source={{ uri: event.eventImageURL! }}
          style={styles.eventImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>
            GO OUTSIDE
          </Text>
        </View>
      )}

      {/* Card content */}

      <View style={styles.cardBody}>

        <Text style={styles.eventDate}>
          {formatEventDate(event.eventStartTime)}
        </Text>

        <Text
          style={styles.eventTitle}
          numberOfLines={2}
        >
          {event.eventTitle}
        </Text>

        <Text
          style={styles.eventLocation}
          numberOfLines={2}
        >
          {"⌖  "}
          {event.eventLocation || "Location TBD"}
        </Text>

        {/* Bottom card section */}

        <View style={styles.cardFooter}>
          <Text style={styles.eventPrice}>
            {formatEventCost(event.eventCost)}
          </Text>

          {event.isFeatured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>
                Featured
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// --------------------------------------------------
// Horizontal Event Section
// Defined OUTSIDE AllEventsScreen
// --------------------------------------------------

function EventSection({
  title,
  data,
}: {
  title: string;
  data: EventRecord[];
}) {
  if (data.length === 0) return null;

  return (
    <View style={styles.section}>

      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {data.map((event, index) => (
          <View
            key={event.eventID}
            style={[
              styles.cardWrapper,
              index === data.length - 1 && {
                marginRight: 0,
              },
            ]}
          >
            <EventCard event={event} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// --------------------------------------------------
// Main Events Dashboard
// --------------------------------------------------

export default function AllEventsScreen() {
  const router = useRouter();

  // Database data

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [categories, setCategories] =
    useState<CategoryRecord[]>([]);

  // Filters

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("all");

  const [dateFilter, setDateFilter] =
    useState<DateFilter>("all");

  // Screen states

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ------------------------------------------------
  // Fetch database records
  // ------------------------------------------------

  const fetchEvents = useCallback(async () => {
    try {
      setError("");

      const now = new Date().toISOString();

      const [eventsResponse, categoriesResponse] =
        await Promise.all([

          // Fetch active upcoming events

          supabase
            .from("Event")
            .select(`
              eventID,
              userID,
              categoryID,
              eventTitle,
              eventDescription,
              eventStartTime,
              eventEndTime,
              eventLocation,
              eventCost,
              eventImageURL,
              isFeatured,
              status
            `)
            .eq("status", PUBLISHED_STATUS)
            .gte("eventStartTime", now)
            .order("eventStartTime", {
              ascending: true,
            }),

          // Fetch categories

          supabase
            .from("Category")
            .select(`
              categoryID,
              categoryName
            `)
            .order("categoryName", {
              ascending: true,
            }),
        ]);

      if (eventsResponse.error) {
        throw eventsResponse.error;
      }

      if (categoriesResponse.error) {
        throw categoriesResponse.error;
      }

      setEvents(
        (eventsResponse.data ?? []) as EventRecord[]
      );

      setCategories(
        (categoriesResponse.data ?? []) as CategoryRecord[]
      );

    } catch (err) {
      console.error("Error loading events:", err);

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

  // ------------------------------------------------
  // Initial load
  // ------------------------------------------------

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ------------------------------------------------
  // Pull to refresh
  // ------------------------------------------------

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, [fetchEvents]);

  // ------------------------------------------------
  // Filter events
  // ------------------------------------------------

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events.filter((event) => {

      // Search matching

      const matchesSearch =
        query.length === 0 ||
        [
          event.eventTitle,
          event.eventDescription,
          event.eventLocation,
        ].some((value) =>
          (value ?? "")
            .toLowerCase()
            .includes(query)
        );

      // Category matching

      const matchesCategory =
        selectedCategory === "all" ||
        event.categoryID === selectedCategory;

      // Date matching

      let matchesDate = true;

      if (dateFilter !== "all") {
        if (!event.eventStartTime) {
          return false;
        }

        const eventDate = new Date(
          event.eventStartTime
        );

        const today = new Date();
        const deadline = new Date(today);

        if (dateFilter === "twoWeeks") {
          deadline.setDate(
            deadline.getDate() + 14
          );
        }

        if (dateFilter === "month") {
          deadline.setMonth(
            deadline.getMonth() + 1
          );
        }

        matchesDate =
          eventDate >= today &&
          eventDate <= deadline;
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesDate
      );
    });
  }, [
    events,
    search,
    selectedCategory,
    dateFilter,
  ]);

  // ------------------------------------------------
  // Featured events
  // ------------------------------------------------

  const featuredEvents = useMemo(() => {
    return filteredEvents.filter(
      (event) => event.isFeatured
    );
  }, [filteredEvents]);

  // ------------------------------------------------
  // Loading screen
  // ------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.centerScreen}>

        <ActivityIndicator
          size="large"
          color={GREEN}
        />

        <Text style={styles.loadingText}>
          Loading events...
        </Text>

      </SafeAreaView>
    );
  }

  // ------------------------------------------------
  // Dashboard
  // ------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        style={styles.mainScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GREEN}
          />
        }
      >

        {/* HEADER */}

        <View style={styles.header}>

          <Text style={styles.headerTitle}>
            Events
          </Text>

        </View>

        {/* SEARCH BAR */}

        <View style={styles.searchContainer}>

          <Text style={styles.searchIcon}>
            ⌕
          </Text>

          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search local events..."
            placeholderTextColor="#8390A1"
            autoCapitalize="none"
            returnKeyType="search"
          />

          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch("")}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Text style={styles.clearSearch}>
                ×
              </Text>
            </Pressable>
          )}

        </View>

        {/* ALL EVENTS / MY EVENTS TABS */}

        <View style={styles.tabs}>

          <View style={styles.activeTab}>
            <Text style={styles.activeTabText}>
              All Events
            </Text>
          </View>

          <Pressable
            style={styles.inactiveTab}
            onPress={() =>
              router.push(
                "/events_dashboard/my_events"
              )
            }
          >
            <Text style={styles.inactiveTabText}>
              My Events
            </Text>
          </Pressable>

        </View>

        {/* CATEGORY FILTERS */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >

          {/* All categories */}

          <Pressable
            onPress={() =>
              setSelectedCategory("all")
            }
            style={[
              styles.filterChip,
              selectedCategory === "all" &&
                styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                selectedCategory === "all" &&
                  styles.filterTextActive,
              ]}
            >
              All Categories
            </Text>
          </Pressable>

          {/* Dynamic category filters */}

          {categories.map((category) => (
            <Pressable
              key={category.categoryID}
              onPress={() =>
                setSelectedCategory(
                  category.categoryID
                )
              }
              style={[
                styles.filterChip,
                selectedCategory ===
                  category.categoryID &&
                  styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedCategory ===
                    category.categoryID &&
                    styles.filterTextActive,
                ]}
              >
                {category.categoryName}
              </Text>
            </Pressable>
          ))}

        </ScrollView>

        {/* DATE FILTERS */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateFilters}
        >

          <Pressable
            onPress={() =>
              setDateFilter("all")
            }
            style={[
              styles.filterChip,
              dateFilter === "all" &&
                styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                dateFilter === "all" &&
                  styles.filterTextActive,
              ]}
            >
              Any Date
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              setDateFilter("twoWeeks")
            }
            style={[
              styles.filterChip,
              dateFilter === "twoWeeks" &&
                styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                dateFilter === "twoWeeks" &&
                  styles.filterTextActive,
              ]}
            >
              Within 2 Weeks
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              setDateFilter("month")
            }
            style={[
              styles.filterChip,
              dateFilter === "month" &&
                styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                dateFilter === "month" &&
                  styles.filterTextActive,
              ]}
            >
              Within 1 Month
            </Text>
          </Pressable>

        </ScrollView>

        {/* DATABASE ERROR */}

        {error.length > 0 && (
          <View style={styles.messageContainer}>

            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable onPress={fetchEvents}>
              <Text style={styles.retryText}>
                Retry
              </Text>
            </Pressable>

          </View>
        )}

        {/* EMPTY STATE */}

        {!error &&
          filteredEvents.length === 0 && (
            <View style={styles.messageContainer}>

              <Text style={styles.emptyTitle}>
                No events found
              </Text>

              <Text style={styles.emptyDescription}>
                Try adjusting your search or filters.
              </Text>

            </View>
          )}

        {/* FEATURED SECTION */}

        <EventSection
          title="Featured"
          data={featuredEvents}
        />

        {/* DYNAMIC CATEGORY SECTIONS */}

        {categories
          .filter(
            (category) =>
              selectedCategory === "all" ||
              selectedCategory ===
                category.categoryID
          )
          .map((category) => {

            const categoryEvents =
              filteredEvents.filter(
                (event) =>
                  event.categoryID ===
                  category.categoryID
              );

            return (
              <EventSection
                key={category.categoryID}
                title={category.categoryName}
                data={categoryEvents}
              />
            );
          })}

        <View style={styles.bottomSpacing} />

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
    backgroundColor: "#FFFFFF",
  },

  mainScroll: {
    flex: 1,
  },

  centerScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#667085",
    fontSize: 14,
  },

  // Header

  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 18,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: DARK,
  },

  // Search

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginBottom: 20,
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: "#F1F4F8",
    borderRadius: 9,
  },

  searchIcon: {
    fontSize: 25,
    color: "#53617A",
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: DARK,
  },

  clearSearch: {
    fontSize: 24,
    color: "#667085",
    paddingHorizontal: 5,
  },

  // Tabs

  tabs: {
    height: 52,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E1E6EA",
    flexDirection: "row",
    paddingHorizontal: 24,
    alignItems: "center",
  },

  activeTab: {
    height: "100%",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: GREEN,
    marginRight: 25,
  },

  activeTabText: {
    color: GREEN,
    fontWeight: "700",
    fontSize: 14,
  },

  inactiveTab: {
    height: "100%",
    justifyContent: "center",
  },

  inactiveTabText: {
    color: "#53617A",
    fontSize: 14,
  },

  // Filters

  filtersContainer: {
    maxHeight: 58,
    marginTop: 8,
  },

  filtersContent: {
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 8,
  },

  dateFilters: {
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },

  filterChip: {
    borderWidth: 1,
    borderColor: "#DEE4EB",
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },

  filterChipActive: {
    backgroundColor: "#E8F6F4",
    borderColor: GREEN,
  },

  filterText: {
    fontSize: 12,
    color: "#42516B",
  },

  filterTextActive: {
    fontWeight: "700",
    color: GREEN,
  },

  // Sections

  section: {
    marginTop: 24,
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#18232B",
    paddingHorizontal: 24,
    marginBottom: 14,
  },

  horizontalList: {
    paddingHorizontal: 24,
    paddingBottom: 5,
  },

  cardWrapper: {
    marginRight: 14,
  },

  // Event cards

  eventCard: {
    width: 260,
    borderWidth: 1,
    borderColor: "#E0E6EB",
    backgroundColor: "#FFFFFF",
    borderRadius: 11,
    overflow: "hidden",
  },

  eventImage: {
    width: "100%",
    height: 150,
    backgroundColor: "#E8EDF0",
  },

  imagePlaceholder: {
    width: "100%",
    height: 150,
    backgroundColor: "#DFEDEA",
    justifyContent: "center",
    alignItems: "center",
  },

  placeholderText: {
    fontSize: 16,
    fontWeight: "700",
    color: GREEN,
    letterSpacing: 2,
  },

  cardBody: {
    padding: 13,
    minHeight: 143,
  },

  eventDate: {
    fontSize: 11,
    color: GREEN,
    fontWeight: "600",
    marginBottom: 9,
  },

  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 10,
  },

  eventLocation: {
    fontSize: 12,
    color: "#8290A4",
    lineHeight: 18,
  },

  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#E5E9EE",
    marginTop: 13,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  eventPrice: {
    color: GREEN,
    fontWeight: "700",
    fontSize: 12,
  },

  featuredBadge: {
    backgroundColor: "#D7EFEB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },

  featuredBadgeText: {
    color: "#207E75",
    fontSize: 10,
    fontWeight: "700",
  },

  // Empty / Error states

  messageContainer: {
    padding: 24,
    alignItems: "center",
  },

  errorText: {
    color: "#B42318",
    marginBottom: 12,
    textAlign: "center",
    fontSize: 13,
  },

  retryText: {
    color: GREEN,
    fontWeight: "700",
    fontSize: 14,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },

  emptyDescription: {
    fontSize: 13,
    color: "#667085",
    marginTop: 8,
    textAlign: "center",
  },

  bottomSpacing: {
    height: 35,
  },

});

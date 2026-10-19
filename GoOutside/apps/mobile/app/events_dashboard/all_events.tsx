import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Screen from "../../src/components/Screen";
import { supabase } from "../../src/lib/supabase";

const categories = [
  "All Categories",
  "Social",
  "Community",
  "Sports",
  "Food",
  "Music",
  "Outdoors",
  "Arts & Crafts",
  "Volunteering",
  "Networking",
];

type EventRow = {
  eventID: string;
  userID: string;
  categoryID: string | null;
  eventTitle: string;
  eventDescription: string | null;
  eventStartTime: string;
  eventEndTime: string;
  eventLocation: string;
  eventCost: number | null;
  status: string | null;
  eventImageURL: string | null;
  isFeatured: boolean;
};

type DisplayEvent = {
  id: string;
  title: string;
  date: string;
  location: string;
  host: string;
  attendees: number;
  category: string;
  featured: boolean;
  image: string | null;
};

export default function All_Events() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All Events");
  const [selectedCategory, setSelectedCategory] =
    useState("All Categories");
  const [selectedDate, setSelectedDate] =
    useState("Within 2 Weeks");
  const [selectedDistance, setSelectedDistance] =
    useState("Within 15 miles");
  const [goingEvents, setGoingEvents] = useState<string[]>([]);

  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState("");

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    setEventsError("");

    try {
      const { data, error } = await supabase
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
          status,
          eventImageURL,
          isFeatured
        `)
        .order("eventStartTime", { ascending: true });

      if (error) throw error;

      const formattedEvents: DisplayEvent[] = (
        (data ?? []) as EventRow[]
      ).map((event) => ({
        id: event.eventID,
        title: event.eventTitle,
        date: new Date(event.eventStartTime).toLocaleString(
          undefined,
          {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }
        ),
        location: event.eventLocation,
        host: "Host information unavailable",
        attendees: 0,
        category: "Uncategorized",
        featured: event.isFeatured,
        image: event.eventImageURL,
      }));

      setEvents(formattedEvents);
    } catch (error) {
      setEventsError(
        error instanceof Error
          ? error.message
          : "Unable to load events."
      );
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents])
  );

  const filteredEvents = events.filter((event) => {
  const matchesSearch =
    event.title.toLowerCase().includes(search.toLowerCase()) ||
    event.location.toLowerCase().includes(search.toLowerCase()) ||
    event.host.toLowerCase().includes(search.toLowerCase());

    return matchesSearch;
  });

  const featuredEvents = filteredEvents.filter(
    (event) => event.featured
  );

  const communityEvents = filteredEvents.filter(
    (event) => !event.featured
  );

  function toggleGoing(eventId: string) {
    setGoingEvents((previous) =>
      previous.includes(eventId)
        ? previous.filter((id) => id !== eventId)
        : [...previous, eventId]
    );
  }

  function renderEventCard(event: (typeof events)[number]) {
    const isGoing = goingEvents.includes(event.id);

    return (
      <View key={event.id} style={styles.eventCard}>
        <Image
          source={{ uri: event.image ?? "https://via.placeholder.com/294x166" }}
          style={styles.eventImage}
          resizeMode="cover"
        />

        <View style={styles.eventDetails}>
          <Text style={styles.eventDate}>{event.date}</Text>

          <Text style={styles.eventTitle} numberOfLines={1}>
            {event.title}
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>◎</Text>
            <Text style={styles.infoText} numberOfLines={1}>
              {event.location}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>♙</Text>
            <Text style={styles.infoText} numberOfLines={1}>
              Host: {event.host}
            </Text>
          </View>
        </View>

        <View style={styles.eventFooter}>
          <View style={styles.attending}>
            <Text style={styles.attendingIcon}>♧</Text>
            <Text style={styles.attendingText}>
              {event.attendees +
                (isGoing ? 1 : 0)} attending
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.goingButton,
              isGoing && styles.goingButtonActive,
            ]}
            onPress={() => toggleGoing(event.id)}
            activeOpacity={0.75}
          >
            <Text style={styles.goingButtonText}>
              {isGoing ? "Going ✓" : "Going"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderEventSection(
    title: string,
    events: DisplayEvent[]
  ) {
    return (
      <View style={styles.eventSection}>
        <Text style={styles.sectionTitle}>{title}</Text>

        {events.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventList}
          >
            {events.map((event) => renderEventCard(event))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyText}>
            No events found. Try changing your filters.
          </Text>
        )}
      </View>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Events</Text>

          <TouchableOpacity
            style={styles.postButton}
            onPress={() => router.push("/create-event")}
            activeOpacity={0.8}
          >
            <Text style={styles.postButtonText}>Post Event</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>⌕</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search local events..."
            placeholderTextColor="#64748B"
            value={search}
            onChangeText={setSearch}
          />

          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {["All Events", "My Events"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Horizontally scrollable filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterList}
        >
          <View style={styles.filterGroup}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.filterChip,
                    selectedCategory === category &&
                      styles.selectedFilterChip,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selectedCategory === category &&
                        styles.selectedFilterText,
                    ]}
                  >
                    {category}
                  </Text>
                  <Text style={styles.chevron}>⌄</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity
            style={styles.filterChip}
            onPress={() =>
              setSelectedDate((current) =>
                current === "Within 2 Weeks"
                  ? "Any Time"
                  : "Within 2 Weeks"
              )
            }
          >
            <Text style={styles.filterText}>{selectedDate}</Text>
            <Text style={styles.chevron}>⌄</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterChip}
            onPress={() =>
              setSelectedDistance((current) =>
                current === "Within 15 miles"
                  ? "Any Distance"
                  : "Within 15 miles"
              )
            }
          >
            <Text style={styles.filterText}>
              {selectedDistance}
            </Text>
            <Text style={styles.chevron}>⌄</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Event sections */}
        <ScrollView
          style={styles.mainScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.mainContent}
        >
          {activeTab === "All Events" ? (
            <>
              {renderEventSection("Featured", featuredEvents)}
              {renderEventSection(
                "Social & Community",
                communityEvents
              )}
            </>
          ) : (
            <View>
              <Text style={styles.sectionTitle}>My Events</Text>
              {renderEventSection(
                "Going",
                filteredEvents.filter((event) =>
                  goingEvents.includes(event.id)
                )
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  pageTitle: {
    fontSize: 29,
    fontWeight: "800",
    color: "#171E32",
  },

  postButton: {
    backgroundColor: "#329C90",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 11,
  },

  postButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F3F8",
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 45,
    borderRadius: 11,
  },

  searchIcon: {
    fontSize: 25,
    color: "#475569",
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#172033",
  },

  clearSearch: {
    fontSize: 18,
    color: "#64748B",
    paddingLeft: 8,
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E0E6EF",
    paddingHorizontal: 8,
  },

  tab: {
    paddingHorizontal: 13,
    paddingVertical: 17,
    marginRight: 3,
  },

  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: "#329C90",
  },

  tabText: {
    fontSize: 15,
    color: "#475569",
  },

  activeTabText: {
    color: "#329C90",
    fontWeight: "800",
  },

  filterScroll: {
    flexGrow: 0,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  filterList: {
    paddingHorizontal: 8,
    paddingVertical: 13,
    alignItems: "center",
    gap: 9,
  },

  filterGroup: {
    flexShrink: 0,
  },

  categoryList: {
    gap: 8,
  },

  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D8E0EC",
    borderRadius: 22,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
    gap: 6,
  },

  selectedFilterChip: {
    backgroundColor: "#E4F4F0",
    borderColor: "#329C90",
  },

  filterText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "500",
  },

  selectedFilterText: {
    color: "#258A80",
    fontWeight: "700",
  },

  chevron: {
    color: "#475569",
    fontSize: 15,
  },

  mainScroll: {
    flex: 1,
  },

  mainContent: {
    paddingTop: 26,
    paddingBottom: 35,
  },

  eventSection: {
    marginBottom: 66,
  },

  sectionTitle: {
    fontSize: 31,
    fontWeight: "800",
    color: "#171E32",
    marginHorizontal: 17,
    marginBottom: 15,
  },

  eventList: {
    paddingHorizontal: 16,
    gap: 22,
    paddingBottom: 3,
  },

  eventCard: {
    width: 294,
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#DFE6F0",
    overflow: "hidden",
  },

  eventImage: {
    width: "100%",
    height: 166,
    backgroundColor: "#E2E8F0",
  },

  eventDetails: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },

  eventDate: {
    color: "#279F94",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 11,
  },

  eventTitle: {
    color: "#171E32",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },

  infoIcon: {
    color: "#91A2BE",
    fontSize: 20,
    fontWeight: "700",
    width: 23,
  },

  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#52617A",
  },

  eventFooter: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#EDF0F5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  attending: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },

  attendingIcon: {
    color: "#329C90",
    fontSize: 18,
    fontWeight: "800",
    marginRight: 5,
  },

  attendingText: {
    color: "#329C90",
    fontSize: 13,
    fontWeight: "700",
  },

  goingButton: {
    backgroundColor: "#C6E9DF",
    borderWidth: 1,
    borderColor: "#329C90",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },

  goingButtonActive: {
    backgroundColor: "#329C90",
  },

  goingButtonText: {
    color: "#258A80",
    fontSize: 13,
    fontWeight: "700",
  },

  emptyText: {
    color: "#64748B",
    fontSize: 14,
    marginHorizontal: 17,
    marginTop: 5,
  },
});


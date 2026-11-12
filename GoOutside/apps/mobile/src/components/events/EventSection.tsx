// React
import React from "react";

// Navigation
import { router, type Href } from "expo-router";

// UI components
import {
  ScrollView,
  StyleSheet,
  Pressable,
  Text,
  View,
} from "react-native";

// App theme
import { theme } from "../../constants/theme";

// Event type
import type { EventRecord } from "../../types/event";

// Event card component
import EventCard from "./EventCard";

// --------------------------------------------------
// Event Section Props
// --------------------------------------------------

type EventSectionProps = {
  title: string;
  data: EventRecord[];
  from?: "all_events" | "my_events";
  viewAllHref?: string;
};

// --------------------------------------------------
// Event Section Component
// --------------------------------------------------

export default function EventSection({
  title,
  data,
  from = "all_events",
  viewAllHref,
}: EventSectionProps) {
  // Don't display sections without events.

  if (data.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      {/* Section Header */}

      <View style={styles.sectionHeader}>
        <Text style={styles.title}>
          {title}
        </Text>

        {/* View All Button */}

        {viewAllHref && (
          <Pressable
            style={styles.viewAllButton}
            onPress={() =>
              router.push(viewAllHref as Href)
            }
            accessibilityRole="button"
            accessibilityLabel={`View all ${title} events`}
          >
            <Text style={styles.viewAllText}>
              View All →
            </Text>
          </Pressable>
        )}
      </View>

      {/* Horizontally Scrollable Event Cards */}

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {data.map((event, index) => (
          <View
            key={event.eventID}
            style={
              index === data.length - 1
                ? undefined
                : styles.cardWrapper
            }
          >
            <EventCard
              event={event}
              from={from}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------

const styles = StyleSheet.create({
  // --------------------------------------------------
  // Section Container
  // --------------------------------------------------

  section: {
    marginTop: 24,
    marginBottom: 0,
    marginHorizontal: 16,
    paddingVertical: 18,

    backgroundColor: "hsl(134, 25%, 80%)",
    borderColor: "hsl(134, 32%, 29%)",
    borderWidth: 2,
    borderRadius: 18,
  },

  // --------------------------------------------------
  // Section Header
  // --------------------------------------------------

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  // --------------------------------------------------
  // Section Title
  // --------------------------------------------------

  title: {
    flexShrink: 1,
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text,
  },

  // --------------------------------------------------
  // View All Button
  // --------------------------------------------------

  viewAllButton: {
    flexShrink: 0,
    backgroundColor: "#E8F6F4",
    borderColor: "#8FBF91",
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  viewAllText: {
    color: "#207E75",
    fontSize: 13,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // Horizontal Event List
  // --------------------------------------------------

  list: {
    paddingHorizontal: 16,
    paddingBottom: 5,
  },

  // --------------------------------------------------
  // Card Spacing
  // --------------------------------------------------

  cardWrapper: {
    marginRight: 14,
  },
});

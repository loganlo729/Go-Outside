
import React from "react";

import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { theme } from "../../constants/theme";

import type { EventRecord } from "../../types/event";

import EventCard from "./EventCard";

// --------------------------------------------------
// Event Section Props
// --------------------------------------------------

type EventSectionProps = {
  title: string;
  data: EventRecord[];
  from?: "all_events" | "my_events";
};

// --------------------------------------------------
// Event Section Component
// --------------------------------------------------

export default function EventSection({
  title,
  data,
  from = "all_events",
}: EventSectionProps) {
  // Don't display sections without events.

  if (data.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      {/* Section Title */}

      <Text style={styles.title}>
        {title}
      </Text>

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
    marginBottom: 18,
  },

  // --------------------------------------------------
  // Section Title
  // --------------------------------------------------

  title: {
    fontSize: 25,
    fontWeight: "800",
    color: theme.colors.text,
    paddingHorizontal: 24,
    marginBottom: 14,
  },

  // --------------------------------------------------
  // Horizontal Event List
  // --------------------------------------------------

  list: {
    paddingHorizontal: 24,
    paddingBottom: 5,
  },

  // --------------------------------------------------
  // Card Spacing
  // --------------------------------------------------

  cardWrapper: {
    marginRight: 14,
  },
});

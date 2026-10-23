
import React from "react";

import {
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { theme } from "../../constants/theme";

import type { EventRecord } from "../../types/event";

import {
  formatEventCost,
  formatEventDate,
} from "../../utils/eventFormat";

// --------------------------------------------------
// Title Formatting
// --------------------------------------------------

function shortTitle(title: string | null) {
  const text = title || "Untitled Event";

  return text.length > 22
    ? `${text.slice(0, 22)}...`
    : text;
}

// --------------------------------------------------
// Event Card
// --------------------------------------------------

export default function EventCard({
  event,
}: {
  event: EventRecord;
}) {
  const hasImage = !!event.eventImageURL?.startsWith(
    "https://"
  );

  return (
    <View style={styles.card}>
      {/* Event Image */}

      {hasImage ? (
        <Image
          source={{ uri: event.eventImageURL! }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            GO OUTSIDE
          </Text>
        </View>
      )}

      {/* Event Information */}

      <View style={styles.body}>
        {/* Date */}

        <Text style={styles.date}>
          {formatEventDate(event.eventStartTime)}
        </Text>

        {/* Title */}

        <Text
          style={styles.title}
          numberOfLines={2}
        >
          {shortTitle(event.eventTitle)}
        </Text>

        {/* Location */}

        <Text
          style={styles.location}
          numberOfLines={2}
        >
          ⌖ {event.eventLocation || "Location TBD"}
        </Text>

        {/* Cost and Featured Badge */}

        <View style={styles.footer}>
          <Text style={styles.price}>
            {formatEventCost(event.eventCost)}
          </Text>

          {event.isFeatured && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
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
// Styles
// --------------------------------------------------

const styles = StyleSheet.create({
  card: {
    width: 260,
    borderWidth: 1,
    borderColor: "#E0E6EB",
    backgroundColor: theme.colors.background,
    borderRadius: 11,
    overflow: "hidden",
  },

  image: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#E8EDF0",
  },

  placeholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#DFEDEA",
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderText: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.primary,
    letterSpacing: 2,
  },

  body: {
    padding: 13,
    minHeight: 143,
  },

  date: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: "600",
    marginBottom: 9,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 10,
  },

  location: {
    fontSize: 12,
    color: "#8290A4",
    lineHeight: 18,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E5E9EE",
    marginTop: 13,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  price: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },

  badge: {
    backgroundColor: "#D7EFEB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },

  badgeText: {
    color: "#207E75",
    fontSize: 10,
    fontWeight: "700",
  },
});

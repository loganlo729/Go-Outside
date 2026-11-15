import React from "react";

import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type {
  CommunityRecord,
} from "../../services/communities";

// --------------------------------------------------
// Props
// --------------------------------------------------

type Props = {
  title: string;
  data: CommunityRecord[];
};

// --------------------------------------------------
// Community Section
// --------------------------------------------------

export default function CommunitySection({
  title,
  data,
}: Props) {
  // Don't render empty sections.
  if (data.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      {/* Section Title */}

      <View style={styles.header}>
        <Text style={styles.title}>
          {title}
        </Text>
      </View>

      {/* Community Placeholders */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {data.map((community) => (
          <View
            key={community.communityID}
            style={styles.card}
          >
            {/* Image Placeholder */}

            <View style={styles.imagePlaceholder} />

            {/* Community Information */}

            <View style={styles.cardContent}>
              <Text
                style={styles.communityTitle}
                numberOfLines={2}
              >
                {community.communityTitle}
              </Text>

              <Text
                style={styles.location}
                numberOfLines={1}
              >
                {community.communityLocation ||
                  "Location TBD"}
              </Text>

              <View style={styles.accessBadge}>
                <Text style={styles.accessText}>
                  {community.accessType === "public"
                    ? "Public"
                    : community.allowJoinRequests &&
                        community.allowInviteCodes
                      ? "Request / Invite"
                      : community.allowJoinRequests
                        ? "Request Access"
                        : "Invite Only"}
                </Text>
              </View>
            </View>
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
  section: {
    marginHorizontal: 16,
    marginTop: 22,
    paddingVertical: 20,
    borderWidth: 1.5,
    borderColor: "#4B744B",
    borderRadius: 18,
    backgroundColor: "#C7DDC9",
  },

  header: {
    paddingHorizontal: 18,
    marginBottom: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#18232B",
  },

  rail: {
    gap: 14,
    paddingHorizontal: 18,
    paddingBottom: 4,
  },

  card: {
    width: 245,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DCE5DF",
  },

  imagePlaceholder: {
    height: 135,
    backgroundColor: "#E3EAE3",
  },

  cardContent: {
    padding: 14,
    gap: 9,
  },

  communityTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#18232B",
  },

  location: {
    color: "#718079",
    fontSize: 13,
  },

  accessBadge: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 7,
    backgroundColor: "#E3F3EB",
  },

  accessText: {
    color: "#3E8178",
    fontWeight: "700",
    fontSize: 12,
  },
});
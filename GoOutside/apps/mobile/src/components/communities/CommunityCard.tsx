// React Native
import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Expo Router
import { useRouter } from "expo-router";

// Icons
import { Ionicons } from "@expo/vector-icons";

// Types
import type {
  CommunityOrigin,
  CommunityRecord,
} from "../../types/community";

// ==================================================
// Props
// ==================================================

type Props = {
  community: CommunityRecord;
  from?: CommunityOrigin;
};

// ==================================================
// Helpers
// ==================================================

function formatTitle(
  title: string | null,
  maxLength = 30
): string {
  if (!title) {
    return "Untitled Community";
  }

  return title.length > maxLength
    ? `${title.slice(0, maxLength)}...`
    : title;
}

function getAccessLabel(
  community: CommunityRecord
): string {
  if (community.accessType === "public") {
    return "Public";
  }

  if (
    community.allowJoinRequests &&
    community.allowInviteCodes
  ) {
    return "Request / Invite";
  }

  if (community.allowJoinRequests) {
    return "Request Access";
  }

  return "Invite Only";
}

// ==================================================
// Component
// ==================================================

export default function CommunityCard({
  community,
  from = "all_communities",
}: Props) {
  const router = useRouter();

  const communityTitle =
    community.communityTitle ||
    "Untitled Community";

  function openCommunity() {
    router.push({
      pathname: "/communities/[communityID]",
      params: {
        communityID: community.communityID,
        from,
      },
    });
  }

  return (
    <Pressable
      style={styles.card}
      onPress={openCommunity}
    >
      {/* Community Image */}

      {community.communityImageURL ? (
        <Image
          source={{
            uri: community.communityImageURL,
          }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>
            GO OUTSIDE
          </Text>
        </View>
      )}

      {/* Community Information */}

      <View style={styles.content}>
        <Text
          style={styles.title}
          numberOfLines={2}
        >
          {formatTitle(communityTitle)}
        </Text>

        <View style={styles.locationRow}>
          <Ionicons
            name="location-outline"
            size={13}
            color="#748379"
          />

          <Text
            style={styles.location}
            numberOfLines={1}
          >
            {community.locationName ||
              community.stateCode ||
              "Location not set"}
          </Text>
        </View>

        <Text
          style={styles.owner}
          numberOfLines={1}
        >
          Owned by:{" "}
          <Text style={styles.ownerName}>
            {community.ownerName || "Unknown"}
          </Text>
        </Text>

        {/* Footer */}

        <View style={styles.footer}>
          <View
            style={[
              styles.badge,
              community.accessType === "private" &&
                styles.privateBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                community.accessType === "private" &&
                  styles.privateBadgeText,
              ]}
            >
              {getAccessLabel(community)}
            </Text>
          </View>

          {community.status === "drafted" && (
            <View style={styles.draftBadge}>
              <Text style={styles.draftText}>
                Draft
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ==================================================
// Styles
// ==================================================

const styles = StyleSheet.create({
  card: {
    width: 240,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE5DF",
    borderRadius: 14,
    overflow: "hidden",
  },

  image: {
    width: "100%",
    height: 135,
    backgroundColor: "#E3EAE3",
  },

  imagePlaceholder: {
    height: 135,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E3EAE3",
  },

  placeholderText: {
    color: "#4C7A45",
    fontSize: 17,
    fontWeight: "800",
  },

  content: {
    padding: 12,
    gap: 9,
  },

  title: {
    color: "#18232B",
    fontSize: 17,
    fontWeight: "800",
    minHeight: 40,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  location: {
    flex: 1,
    color: "#748379",
    fontSize: 12,
  },

  owner: {
    color: "#718079",
    fontSize: 12,
  },

  ownerName: {
    color: "#263C2C",
    fontWeight: "700",
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E3EAE3",
  },

  badge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: "#D7EFEB",
  },

  badgeText: {
    color: "#207E75",
    fontSize: 11,
    fontWeight: "700",
  },

  privateBadge: {
    backgroundColor: "#E9E6F3",
  },

  privateBadgeText: {
    color: "#64548B",
  },

  draftBadge: {
    backgroundColor: "#E8E9E6",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 7,
  },

  draftText: {
    color: "#5B645A",
    fontSize: 11,
    fontWeight: "700",
  },
});
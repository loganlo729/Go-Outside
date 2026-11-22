// React Native
import React from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Navigation
import { useRouter } from "expo-router";

// Components
import CommunityCard from "./CommunityCard";

// Types
import type {
  CommunityOrigin,
  CommunityRecord,
} from "../../types/community";

// ==================================================
// Props
// ==================================================

type Props = {
  title: string;
  communities: CommunityRecord[];
  from?: CommunityOrigin;
  viewAllCategoryID?: string;
};

// ==================================================
// Component
// ==================================================

export default function CommunitySection({
  title,
  communities,
  from = "all_communities",
  viewAllCategoryID,
}: Props) {
  const router = useRouter();

  if (communities.length === 0) {
    return null;
  }

  function handleViewAll() {
    if (!viewAllCategoryID) {
      return;
    }

    router.push({
      pathname: "/communities/category/[categoryID]",
      params: {
        categoryID: viewAllCategoryID,
        from,
      },
    });
  }

  return (
    <View style={styles.section}>
      {/* Section Header */}

      <View style={styles.header}>
        <Text style={styles.title}>
          {title}
        </Text>

        {viewAllCategoryID && (
          <Pressable
            style={styles.viewAllButton}
            onPress={handleViewAll}
          >
            <Text style={styles.viewAllText}>
              View All →
            </Text>
          </Pressable>
        )}
      </View>

      {/* Community Carousel */}

      <FlatList
        data={communities}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.communityID}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <CommunityCard
            community={item}
            from={from}
          />
        )}
      />
    </View>
  );
}

// ==================================================
// Styles
// ==================================================

const styles = StyleSheet.create({
  section: {
    marginTop: 22,
    marginHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: "#C7DDC9",
    borderWidth: 1,
    borderColor: "#4B744B",
    borderRadius: 16,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 12,
  },

  title: {
    flex: 1,
    color: "#18232B",
    fontSize: 20,
    fontWeight: "800",
  },

  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#E9F5EF",
    borderWidth: 1,
    borderColor: "#B4CFBA",
    borderRadius: 9,
  },

  viewAllText: {
    color: "#3D857E",
    fontSize: 12,
    fontWeight: "700",
  },

  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
});
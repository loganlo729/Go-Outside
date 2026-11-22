// React Native
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Navigation
import { useRouter } from "expo-router";

// Types
import type {
  CommunityOrigin,
} from "../../types/community";

// ==================================================
// Props
// ==================================================

type Props = {
  active: CommunityOrigin;
};

// ==================================================
// Component
// ==================================================

export default function CommunitiesNav({
  active,
}: Props) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.tab,
          active === "all_communities" &&
            styles.activeTab,
        ]}
        onPress={() =>
          router.replace(
            "/communities/all_communities"
          )
        }
      >
        <Text
          style={[
            styles.tabText,
            active === "all_communities" &&
              styles.activeText,
          ]}
        >
          All Communities
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.tab,
          active === "my_communities" &&
            styles.activeTab,
        ]}
        onPress={() =>
          router.replace(
            "/communities/my_communities"
          )
        }
      >
        <Text
          style={[
            styles.tabText,
            active === "my_communities" &&
              styles.activeText,
          ]}
        >
          My Communities
        </Text>
      </Pressable>
    </View>
  );
}

// ==================================================
// Styles
// ==================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8E3",
    paddingHorizontal: 16,
  },

  tab: {
    paddingVertical: 18,
    marginRight: 24,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },

  activeTab: {
    borderBottomColor: "#46988E",
  },

  tabText: {
    color: "#52627C",
    fontSize: 14,
    fontWeight: "500",
  },

  activeText: {
    color: "#46988E",
    fontWeight: "800",
  },
});
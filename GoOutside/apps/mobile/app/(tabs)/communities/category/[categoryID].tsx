import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

// Components
import CommunityCard from "../../../../src/components/communities/CommunityCard";

// Services
import {
  getCommunityCategories,
  getPublishedCommunities,
} from "../../../../src/services/communities";

// Types
import type {
  CommunityRecord,
} from "../../../../src/types/community";

// ==================================================
// Component
// ==================================================

export default function CommunityCategoryScreen() {
  const router = useRouter();

  const { categoryID } = useLocalSearchParams<{
    categoryID: string;
  }>();

  const [communities, setCommunities] =
    useState<CommunityRecord[]>([]);

  const [categoryName, setCategoryName] =
    useState("Communities");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==================================================
  // Load
  // ==================================================

  const load = useCallback(async () => {
    try {
      const [communityData, categories] =
        await Promise.all([
          getPublishedCommunities(),
          getCommunityCategories(),
        ]);

      setCommunities(
        communityData.filter(
          (community) =>
            community.categoryID === categoryID
        )
      );

      const category = categories.find(
        (item) =>
          item.categoryID === categoryID
      );

      setCategoryName(
        category?.categoryName ?? "Communities"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load communities."
      );
    } finally {
      setLoading(false);
    }
  }, [categoryID]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  // ==================================================
  // Search
  // ==================================================

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return communities.filter(
      (community) =>
        !query ||
        [
          community.communityTitle,
          community.communityDescription,
          community.locationName,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query)
        )
    );
  }, [communities, search]);

  // ==================================================
  // Render
  // ==================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(
                "/communities/all_communities"
              );
            }
          }}
        >
          <Text style={styles.backText}>
            ← Back to Communities
          </Text>
        </Pressable>

        <Text style={styles.heading}>
          {categoryName}
        </Text>

        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search communities..."
          placeholderTextColor="#8D97A6"
        />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#46988E"
          style={{ marginTop: 40 }}
        />
      ) : error ? (
        <Text style={styles.message}>
          {error}
        </Text>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={(item) =>
            item.communityID
          }
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <CommunityCard
                community={item}
                from="all_communities"
              />
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.message}>
              No communities found.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ==================================================
// Styles
// ==================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#C7DDC9",
  },

  header: {
    padding: 16,
    backgroundColor: "#F6F8F3",
  },

  backText: {
    color: "#3F6D3F",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 20,
  },

  heading: {
    color: "#18232B",
    fontSize: 27,
    fontWeight: "800",
    marginBottom: 18,
  },

  search: {
    height: 46,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE5DF",
    borderRadius: 10,
    fontSize: 14,
    color: "#18232B",
  },

  list: {
    padding: 12,
    paddingBottom: 32,
  },

  row: {
    gap: 10,
    marginBottom: 12,
  },

  cardWrapper: {
    flex: 1,
    minWidth: 0,
  },

  message: {
    marginTop: 40,
    textAlign: "center",
    color: "#63715F",
    fontSize: 14,
  },
});
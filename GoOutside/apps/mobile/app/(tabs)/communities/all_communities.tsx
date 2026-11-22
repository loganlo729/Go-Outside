import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useFocusEffect,
} from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

// Components
import CommunitiesNav from "../../../src/components/communities/CommunitiesNav";
import CommunityFilter from "../../../src/components/communities/CommunityFilters";
import CommunitySection from "../../../src/components/communities/CommunitySection";

// Services
import {
  getCommunityCategories,
  getPublishedCommunities,
} from "../../../src/services/communities";

// Types
import type {
  CommunityCategory,
  CommunityRecord,
} from "../../../src/types/community";

// ==================================================
// Component
// ==================================================

export default function AllCommunitiesScreen() {
  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [communities, setCommunities] =
    useState<CommunityRecord[]>([]);

  const [categories, setCategories] =
    useState<CommunityCategory[]>([]);

  const [search, setSearch] = useState("");

  const [
    selectedCategories,
    setSelectedCategories,
  ] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ==================================================
  // Load Communities
  // ==================================================

  const load = useCallback(async () => {
    setError("");

    try {
      const [
        communityData,
        categoryData,
      ] = await Promise.all([
        getPublishedCommunities(),
        getCommunityCategories(),
      ]);

      setCommunities(communityData);
      setCategories(categoryData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load communities."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  // ==================================================
  // Refresh
  // ==================================================

  function handleRefresh() {
    setRefreshing(true);
    void load();
  }

  // ==================================================
  // Category Filters
  // ==================================================

  function toggleCategory(categoryID: string) {
    setSelectedCategories((previous) =>
      previous.includes(categoryID)
        ? previous.filter(
            (id) => id !== categoryID
          )
        : [...previous, categoryID]
    );
  }

  // ==================================================
  // Filter Communities
  // ==================================================

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return communities.filter((community) => {
      const matchesSearch =
        !query ||
        [
          community.communityTitle,
          community.communityDescription,
          community.ownerName,
          community.locationName,
          community.stateCode,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query)
        );

      const matchesCategory =
        selectedCategories.length === 0 ||
        (
          community.categoryID !== null &&
          selectedCategories.includes(
            community.categoryID
          )
        );

      return (
        community.status === "publicActive" &&
        matchesSearch &&
        matchesCategory
      );
    });
  }, [
    communities,
    search,
    selectedCategories,
  ]);

  // ==================================================
  // Render
  // ==================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <CommunitiesNav active="all_communities" />

      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* Header */}

        <Text style={styles.heading}>
          All Communities
        </Text>

        {/* Search */}

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.search}
            placeholder="Search all communities..."
            placeholderTextColor="#8D97A6"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Category Filter */}

        <CommunityFilter
          categories={categories}
          selectedCategories={
            selectedCategories
          }
          onToggleCategory={toggleCategory}
          onClearCategories={() =>
            setSelectedCategories([])
          }
        />

        {/* Loading / Error / Empty */}

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#46988E"
            style={styles.loading}
          />
        ) : error ? (
          <Text style={styles.message}>
            {error}
          </Text>
        ) : filtered.length === 0 ? (
          <Text style={styles.message}>
            No communities found. Try adjusting
            your search or filters.
          </Text>
        ) : (
          categories.map((category) => {
            const sectionCommunities =
              filtered.filter(
                (community) =>
                  community.categoryID ===
                  category.categoryID
              );

            if (!sectionCommunities.length) {
              return null;
            }

            return (
              <CommunitySection
                key={category.categoryID}
                title={category.categoryName}
                communities={sectionCommunities}
                viewAllCategoryID={
                  category.categoryID
                }
              />
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================================================
// Styles
// ==================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F8F3",
  },

  scroll: {
    flex: 1,
  },

  heading: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 20,
    color: "#18232B",
    fontSize: 28,
    fontWeight: "800",
  },

  searchContainer: {
    marginHorizontal: 16,
  },

  search: {
    height: 48,
    paddingHorizontal: 15,
    backgroundColor: "#F1F3F8",
    borderWidth: 1,
    borderColor: "#E2E8EF",
    borderRadius: 10,
    fontSize: 14,
    color: "#18232B",
  },

  loading: {
    marginTop: 45,
  },

  message: {
    marginTop: 45,
    marginHorizontal: 24,
    color: "#718079",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
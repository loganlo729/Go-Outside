import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  useFocusEffect,
  useRouter,
} from "expo-router";

// Components
import AppSearchInput from "../../../src/components/ui/AppSearchInput";

import CommunityFilters from "../../../src/components/communities/CommunityFilters";

import CommunitySection from "../../../src/components/communities/CommunitySection";

// Supabase service
import {
  getCommunitiesAndCategories,
} from "../../../src/services/communities";

// Types
import type {
  CommunityRecord,
  CommunityCategory,
} from "../../../src/services/communities";

// Theme
import { theme } from "../../../src/constants/theme";

// ==================================================
// All Communities Screen
// ==================================================

export default function AllCommunitiesScreen() {
  const router = useRouter();

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

  // --------------------------------------------------
  // Category Selection
  // --------------------------------------------------

  function toggleCategory(categoryID: string) {
    setSelectedCategories((previous) =>
      previous.includes(categoryID)
        ? previous.filter(
            (id) => id !== categoryID
          )
        : [...previous, categoryID]
    );
  }

  function clearCategories() {
    setSelectedCategories([]);
  }

  // --------------------------------------------------
  // Load Communities
  // --------------------------------------------------

  const loadCommunities = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const result =
          await getCommunitiesAndCategories();

        setCommunities(result.communities);
        setCategories(result.categories);
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
    },
    []
  );

  // Reload when screen receives focus.
  useFocusEffect(
    useCallback(() => {
      void loadCommunities();
    }, [loadCommunities])
  );

  // --------------------------------------------------
  // Filter Communities
  // --------------------------------------------------

  const filteredCommunities = useMemo(() => {
    const query = search.trim().toLowerCase();

    return communities.filter((community) => {
      const matchesSearch =
        !query ||
        [
          community.communityTitle,
          community.communityDescription,
          community.communityLocation,
        ].some((value) =>
          (value ?? "")
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
        matchesSearch &&
        matchesCategory
      );
    });
  }, [
    communities,
    search,
    selectedCategories,
  ]);

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              void loadCommunities(true)
            }
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Dashboard Navigation */}

        <View style={styles.tabs}>
          <View style={styles.activeTab}>
            <Text style={styles.activeTabText}>
              All Communities
            </Text>
          </View>

          <Pressable
            style={styles.inactiveTab}
            onPress={() =>
              router.replace(
                "/communities/my_communities"
              )
            }
            accessibilityRole="button"
          >
            <Text style={styles.inactiveTabText}>
              My Communities
            </Text>
          </Pressable>
        </View>

        {/* Heading */}

        <Text style={styles.heading}>
          All Communities
        </Text>

        {/* Search */}

        <AppSearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search all communities..."
        />

        {/* Categories */}

        <CommunityFilters
          categories={categories}
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          onClearCategories={clearCategories}
        />

        {/* Community Sections */}

        {loading ? (
          <View style={styles.message}>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary}
            />

            <Text style={styles.messageText}>
              Loading communities...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.message}>
            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              onPress={() =>
                void loadCommunities()
              }
            >
              <Text style={styles.retryText}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : filteredCommunities.length === 0 ? (
          <View style={styles.message}>
            <Text style={styles.messageText}>
              No communities found. Try adjusting
              your search or filters.
            </Text>
          </View>
        ) : (
          <>
            {categories
              .filter(
                (category) =>
                  selectedCategories.length === 0 ||
                  selectedCategories.includes(
                    category.categoryID
                  )
              )
              .map((category) => (
                <CommunitySection
                  key={category.categoryID}
                  title={category.categoryName}
                  data={filteredCommunities.filter(
                    (community) =>
                      community.categoryID ===
                      category.categoryID
                  )}
                />
              ))}
          </>
        )}

        <View style={styles.bottom} />
      </ScrollView>
    </SafeAreaView>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  scrollContent: {
    paddingBottom: 30,
  },

  tabs: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  activeTab: {
    height: "100%",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#31988F",
    marginRight: 25,
  },

  activeTabText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#31988F",
  },

  inactiveTab: {
    height: "100%",
    justifyContent: "center",
    marginRight: 25,
  },

  inactiveTabText: {
    fontSize: 14,
    color: "#53617A",
  },

  heading: {
    marginTop: 28,
    marginBottom: 16,
    marginHorizontal: 24,
    fontSize: 30,
    fontWeight: "800",
    color: theme.colors.text,
  },

  message: {
    paddingHorizontal: 24,
    paddingVertical: 35,
    alignItems: "center",
    gap: 12,
  },

  messageText: {
    color: theme.colors.secondaryText,
    textAlign: "center",
    fontSize: 14,
  },

  errorText: {
    color: theme.colors.error,
    textAlign: "center",
    fontSize: 14,
  },

  retryText: {
    color: theme.colors.primary,
    fontWeight: "700",
  },

  bottom: {
    height: 35,
  },
});
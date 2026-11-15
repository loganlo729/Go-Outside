// ==================================================
// MY COMMUNITIES SCREEN
// ==================================================

// React
import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

// React Native
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// Icons
import { Feather } from "@expo/vector-icons";

// Safe Area
import { SafeAreaView } from "react-native-safe-area-context";

// Navigation
import {
  useFocusEffect,
  useRouter,
} from "expo-router";

// Supabase
import { supabase } from "../../../src/lib/supabase";

// Community Services
import {
  getJoinedCommunities,
  getOwnedCommunities,
} from "../../../src/services/communities";

// Types
import type {
  CommunityRecord,
} from "../../../src/services/communities";

// Community Sections
import CommunitySection from "../../../src/components/communities/CommunitySection";

// Theme
import { theme } from "../../../src/constants/theme";

// ==================================================
// MY COMMUNITIES
// ==================================================

export default function MyCommunitiesScreen() {
  const router = useRouter();

  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [ownedCommunities, setOwnedCommunities] =
    useState<CommunityRecord[]>([]);

  const [joinedCommunities, setJoinedCommunities] =
    useState<CommunityRecord[]>([]);

  const [signedIn, setSignedIn] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  // --------------------------------------------------
  // Fetch My Communities
  // --------------------------------------------------

  const fetchMyCommunities = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        // ----------------------------------------
        // Get Authenticated User
        // ----------------------------------------

        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          if (
            authError.name === "AuthSessionMissingError" ||
            authError.status === 401
          ) {
            setSignedIn(false);
            setOwnedCommunities([]);
            setJoinedCommunities([]);
            return;
          }

          throw authError;
        }

        const user = authData.user;

        // ----------------------------------------
        // No User
        // ----------------------------------------

        if (!user) {
          setSignedIn(false);
          setOwnedCommunities([]);
          setJoinedCommunities([]);
          return;
        }

        // ----------------------------------------
        // Signed-In User
        // ----------------------------------------

        setSignedIn(true);

        // Fetch communities owned and joined.
        const [owned, joined] =
          await Promise.all([
            getOwnedCommunities(user.id),
            getJoinedCommunities(user.id),
          ]);

        setOwnedCommunities(owned);
        setJoinedCommunities(joined);
      } catch (err) {
        console.error(
          "Error loading my communities:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your communities."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // --------------------------------------------------
  // Refresh When Screen Receives Focus
  // --------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      void fetchMyCommunities();
    }, [fetchMyCommunities])
  );

  // --------------------------------------------------
  // Search Filtering
  // --------------------------------------------------

  const query = search.trim().toLowerCase();

  function matchesSearch(
    community: CommunityRecord
  ): boolean {
    return (
      !query ||
      [
        community.communityTitle,
        community.communityDescription,
        community.communityLocation,
      ].some((value) =>
        (value ?? "")
          .toLowerCase()
          .includes(query)
      )
    );
  }

  // --------------------------------------------------
  // Organize Community Sections
  // --------------------------------------------------

  const joined = useMemo(
    () =>
      joinedCommunities.filter(matchesSearch),
    [joinedCommunities, query]
  );

  // Published communities created by the user.
  const owned = useMemo(
    () =>
      ownedCommunities.filter(
        (community) =>
          community.status === "publicActive" &&
          matchesSearch(community)
      ),
    [ownedCommunities, query]
  );

  // Draft communities created by the user.
  const drafted = useMemo(
    () =>
      ownedCommunities.filter(
        (community) =>
          community.status === "drafted" &&
          matchesSearch(community)
      ),
    [ownedCommunities, query]
  );

  // --------------------------------------------------
  // Empty State
  // --------------------------------------------------

  const hasNoCommunities =
    ownedCommunities.length === 0 &&
    joinedCommunities.length === 0;

  const hasNoMatches =
    joined.length === 0 &&
    owned.length === 0 &&
    drafted.length === 0;

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              void fetchMyCommunities(true)
            }
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* ----------------------------------------
            Dashboard Navigation
        ---------------------------------------- */}

        <View style={styles.tabs}>
          {/* All Communities - Inactive */}

          <Pressable
            style={styles.inactiveTab}
            onPress={() =>
              router.replace(
                "/communities/all_communities"
              )
            }
            accessibilityRole="button"
            accessibilityLabel="All Communities"
          >
            <Text style={styles.inactiveTabText}>
              All Communities
            </Text>
          </Pressable>

          {/* My Communities - Active */}

          <View style={styles.activeTab}>
            <Text style={styles.activeTabText}>
              My Communities
            </Text>
          </View>
        </View>

        {/* ----------------------------------------
            Page Heading
        ---------------------------------------- */}

        <Text style={styles.heading}>
          My Communities
        </Text>

        {/* ----------------------------------------
            Loading State
        ---------------------------------------- */}

        {loading ? (
          <View style={styles.message}>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary}
            />

            <Text style={styles.messageText}>
              Loading your communities...
            </Text>
          </View>
        ) : error ? (
          /* ----------------------------------------
              Error State
          ---------------------------------------- */

          <View style={styles.message}>
            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              onPress={() =>
                void fetchMyCommunities()
              }
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : !signedIn ? (
          /* ----------------------------------------
              Signed-Out State
          ---------------------------------------- */

          <View style={styles.signedOutContainer}>
            <Text style={styles.signedOutTitle}>
              Log in to see your communities.
            </Text>

            <Text style={styles.messageText}>
              View communities you've joined,
              created, and saved as drafts.
            </Text>

            <Pressable
              style={styles.loginButton}
              onPress={() =>
                router.push(
                  "/login_sign_up/login"
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Log in"
            >
              <Text style={styles.buttonText}>
                Log In
              </Text>
            </Pressable>
          </View>
        ) : (
          /* ----------------------------------------
              Signed-In Content
          ---------------------------------------- */

          <>
            {/* ----------------------------------------
                Search and Create Community
            ---------------------------------------- */}

            <View style={styles.searchAndCreateRow}>
              {/* Search Bar */}

              <View style={styles.searchField}>
                <Feather
                  name="search"
                  size={18}
                  color="#66748C"
                />

                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search your communities..."
                  placeholderTextColor="#8996AA"
                  accessibilityLabel="Search your communities"
                />
              </View>

              {/* Create Community Button */}

              <Pressable
                style={styles.createCommunityButton}
                onPress={() =>
                  router.push(
                    "/communities/create_community" as never
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Create a new community"
              >
                <Text style={styles.buttonText}>
                  + Create Community
                </Text>
              </Pressable>
            </View>

            {/* ----------------------------------------
                Empty State
            ---------------------------------------- */}

            {hasNoMatches ? (
              <View style={styles.message}>
                <Text style={styles.emptyTitle}>
                  No communities found
                </Text>

                <Text style={styles.messageText}>
                  {hasNoCommunities
                    ? "You haven't joined or created any communities yet."
                    : "Try another search."}
                </Text>
              </View>
            ) : (
              /* ----------------------------------------
                  Community Sections
              ---------------------------------------- */

              <>
                {/* Joined Communities */}

                <CommunitySection
                  title="Joined Communities"
                  data={joined}
                />

                {/* Owned Communities */}

                <CommunitySection
                  title="Owned Communities"
                  data={owned}
                />

                {/* Drafted Communities */}

                <CommunitySection
                  title="Drafted Communities"
                  data={drafted}
                />
              </>
            )}
          </>
        )}

        <View style={styles.bottom} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  // --------------------------------------------------
  // Page
  // --------------------------------------------------

  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 35,
  },

  // --------------------------------------------------
  // Navigation Tabs
  // --------------------------------------------------

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
    color: "#31988F",
    fontSize: 14,
    fontWeight: "700",
  },

  inactiveTab: {
    height: "100%",
    justifyContent: "center",
    marginRight: 25,
  },

  inactiveTabText: {
    color: "#53617A",
    fontSize: 14,
  },

  // --------------------------------------------------
  // Page Heading
  // --------------------------------------------------

  heading: {
    marginTop: 28,
    marginBottom: 16,
    marginHorizontal: 24,
    fontSize: 30,
    fontWeight: "800",
    color: theme.colors.text,
  },

  // --------------------------------------------------
  // Search and Create Community
  // --------------------------------------------------

  searchAndCreateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginBottom: 16,
    gap: 10,
  },

  searchField: {
    flex: 1,
    minWidth: 0,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: "#F1F4F8",
    borderWidth: 1,
    borderColor: "#E1E6EA",
  },

  searchInput: {
    flex: 1,
    height: "100%",
    marginLeft: 7,
    fontSize: 14,
    color: theme.colors.text,
    padding: 0,
  },

  // --------------------------------------------------
  // Create Community Button
  // --------------------------------------------------

  createCommunityButton: {
    minHeight: 52,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 9,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // --------------------------------------------------
  // Messages
  // --------------------------------------------------

  message: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 12,
  },

  messageText: {
    color: theme.colors.secondaryText,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },

  errorText: {
    color: theme.colors.error,
    textAlign: "center",
    fontSize: 13,
  },

  retryText: {
    color: theme.colors.primary,
    fontWeight: "700",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },

  // --------------------------------------------------
  // Signed-Out State
  // --------------------------------------------------

  signedOutContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 80,
    gap: 18,
  },

  signedOutTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#53617A",
    textAlign: "center",
  },

  loginButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
  },

  // --------------------------------------------------
  // Bottom Spacing
  // --------------------------------------------------

  bottom: {
    height: 35,
  },
});
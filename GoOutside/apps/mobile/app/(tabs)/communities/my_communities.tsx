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
  TextInput,
  View,
} from "react-native";

import {
  useFocusEffect,
  useRouter,
} from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

// Components
import CommunitiesNav from "../../../src/components/communities/CommunitiesNav";
import CommunitySection from "../../../src/components/communities/CommunitySection";

// Services
import {
  getCommunityUserID,
  getMyCommunities,
} from "../../../src/services/communities";

// Types
import type {
  CommunityRecord,
} from "../../../src/types/community";

// ==================================================
// Component
// ==================================================

export default function MyCommunitiesScreen() {
  const router = useRouter();

  // ==================================================
  // State
  // ==================================================

  const [owned, setOwned] =
    useState<CommunityRecord[]>([]);

  const [joined, setJoined] =
    useState<CommunityRecord[]>([]);

  const [search, setSearch] = useState("");

  const [signedIn, setSignedIn] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ==================================================
  // Load
  // ==================================================

  const load = useCallback(async () => {
    setError("");

    try {
      const userID = await getCommunityUserID();

      setSignedIn(!!userID);

      if (!userID) {
        setOwned([]);
        setJoined([]);
        return;
      }

      const result = await getMyCommunities();

      setOwned(result.owned);
      setJoined(result.joined);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your communities."
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
  // Search
  // ==================================================

  const matchesSearch = useCallback(
    (community: CommunityRecord) => {
      const query = search.trim().toLowerCase();

      if (!query) {
        return true;
      }

      return [
        community.communityTitle,
        community.communityDescription,
        community.locationName,
        community.ownerName,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query)
      );
    },
    [search]
  );

  // ==================================================
  // Group Communities
  // ==================================================

  const joinedCommunities = useMemo(
    () => joined.filter(matchesSearch),
    [joined, matchesSearch]
  );

  const ownedCommunities = useMemo(
    () =>
      owned.filter(
        (community) =>
          community.status === "publicActive" &&
          matchesSearch(community)
      ),
    [owned, matchesSearch]
  );

  const draftedCommunities = useMemo(
    () =>
      owned.filter(
        (community) =>
          community.status === "drafted" &&
          matchesSearch(community)
      ),
    [owned, matchesSearch]
  );

  const hasCommunities =
    joinedCommunities.length > 0 ||
    ownedCommunities.length > 0 ||
    draftedCommunities.length > 0;

  // ==================================================
  // Render
  // ==================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <CommunitiesNav active="my_communities" />

      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        <Text style={styles.heading}>
          My Communities
        </Text>

        {/* Search */}

        <View style={styles.actions}>
          <TextInput
            style={styles.search}
            placeholder="Search your communities..."
            placeholderTextColor="#8D97A6"
            value={search}
            onChangeText={setSearch}
          />

          <Pressable
            style={styles.createButton}
            onPress={() =>
              router.push(
                "/communities/create_community"
              )
            }
          >
            <Text style={styles.createText}>
              + Create Community
            </Text>
          </Pressable>
        </View>

        {/* Content */}

        {loading ? (
          <ActivityIndicator
            color="#46988E"
            size="large"
            style={styles.loading}
          />
        ) : error ? (
          <Text style={styles.message}>
            {error}
          </Text>
        ) : !signedIn ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              Sign in to view your communities
            </Text>

            <Text style={styles.emptyDescription}>
              Your joined and created communities
              will appear here once you sign in.
            </Text>
          </View>
        ) : !hasCommunities ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              No communities found
            </Text>

            <Text style={styles.emptyDescription}>
              {search
                ? "Try adjusting your search."
                : "You haven't joined or created any communities yet."}
            </Text>
          </View>
        ) : (
          <>
            <CommunitySection
              title="Joined Communities"
              communities={joinedCommunities}
              from="my_communities"
            />

            <CommunitySection
              title="Owned Communities"
              communities={ownedCommunities}
              from="my_communities"
            />

            <CommunitySection
              title="Drafted Communities"
              communities={draftedCommunities}
              from="my_communities"
            />
          </>
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
    marginBottom: 18,
    color: "#18232B",
    fontSize: 28,
    fontWeight: "800",
  },

  actions: {
    marginHorizontal: 16,
    gap: 12,
  },

  search: {
    height: 48,
    paddingHorizontal: 15,
    backgroundColor: "#F1F3F8",
    borderWidth: 1,
    borderColor: "#E2E8EF",
    borderRadius: 10,
    color: "#18232B",
    fontSize: 14,
  },

  createButton: {
    alignSelf: "flex-end",
    backgroundColor: "#46988E",
    borderRadius: 9,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  createText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  loading: {
    marginTop: 45,
  },

  message: {
    marginHorizontal: 24,
    marginTop: 45,
    textAlign: "center",
    color: "#718079",
    fontSize: 14,
  },

  emptyState: {
    paddingHorizontal: 24,
    paddingVertical: 55,
    alignItems: "center",
    gap: 12,
  },

  emptyTitle: {
    color: "#18232B",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },

  emptyDescription: {
    color: "#77839A",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
});
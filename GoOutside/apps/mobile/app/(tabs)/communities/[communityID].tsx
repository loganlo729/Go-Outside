import React, {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";


import CommunitiesNav from "../../../src/components/communities/CommunitiesNav";

// Services
import {
  getCommunityByID,
} from "../../../src/services/communities";

import {
  getCommunityMembership,
  joinCommunity,
  leaveCommunity,
  requestToJoinCommunity,
  type CommunityMembershipStatus,
} from "../../../src/services/communityMembership";

// Types
import type {
  CommunityRecord,
} from "../../../src/types/community";

// ==================================================
// Helpers
// ==================================================

function formatCreatedDate(
  value: string | null
): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ==================================================
// Component
// ==================================================

export default function CommunityDetailsScreen() {
  const router = useRouter();

  const { communityID, from } =
    useLocalSearchParams<{
      communityID: string;
      from?: string;
    }>();

  const origin =
    from === "my_communities"
      ? "my_communities"
      : "all_communities";

  const backPath =
    origin === "my_communities"
      ? "/communities/my_communities"
      : "/communities/all_communities";

  // ==================================================
  // State
  // ==================================================

  const [community, setCommunity] =
    useState<CommunityRecord | null>(null);

  const [membershipStatus, setMembershipStatus] =
    useState<CommunityMembershipStatus>("loggedOut");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] = useState("");

  // ==================================================
  // Load Community
  // ==================================================

  const load = useCallback(async () => {
    setError("");

    try {
      const record = await getCommunityByID(
        communityID
      );

      setCommunity(record);

      if (record) {
        const membership =
          await getCommunityMembership(
            record.communityID,
            record.ownerID
          );

        setMembershipStatus(
          membership.status
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load community."
      );
    } finally {
      setLoading(false);
    }
  }, [communityID]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  // ==================================================
  // Back Navigation
  // ==================================================

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(backPath);
    }
  }

  // ==================================================
  // Membership Actions
  // ==================================================

  async function handleMembershipAction() {
    if (!community || actionLoading) {
      return;
    }

    if (membershipStatus === "loggedOut") {
      Alert.alert(
        "Sign In Required",
        "Please sign in to join this community."
      );
      return;
    }

    if (
      membershipStatus === "owner" ||
      membershipStatus === "pending"
    ) {
      return;
    }

    // ----------------------------------------
    // Confirm Leave
    // ----------------------------------------

    if (membershipStatus === "member") {
      Alert.alert(
        "Leave Community",
        "Are you sure you want to leave this community?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Leave",
            style: "destructive",
            onPress: () => {
              void performMembershipAction("leave");
            },
          },
        ]
      );

      return;
    }

    // ----------------------------------------
    // Public Community
    // ----------------------------------------

    if (community.accessType === "public") {
      void performMembershipAction("join");
      return;
    }

    // ----------------------------------------
    // Private Community
    // ----------------------------------------

    if (community.allowJoinRequests) {
      void performMembershipAction("request");
    }
  }

  async function performMembershipAction(
    action: "join" | "leave" | "request"
  ) {
    if (!community) return;

    setActionLoading(true);

    try {
      switch (action) {
        case "join":
          await joinCommunity(
            community.communityID
          );
          break;

        case "leave":
          await leaveCommunity(
            community.communityID
          );
          break;

        case "request":
          await requestToJoinCommunity(
            community.communityID
          );
          break;
      }

      const updated =
        await getCommunityMembership(
          community.communityID,
          community.ownerID
        );

      setMembershipStatus(updated.status);
    } catch (err) {
      Alert.alert(
        "Unable to Update Membership",
        err instanceof Error
          ? err.message
          : "Please try again."
      );
    } finally {
      setActionLoading(false);
    }
  }

  // ==================================================
  // Membership Button Label
  // ==================================================

  function getMembershipLabel(): string {
    if (!community) return "";

    if (membershipStatus === "owner") {
      return "Community Owner";
    }

    if (membershipStatus === "member") {
      return "Leave Community";
    }

    if (membershipStatus === "pending") {
      return "Request Pending";
    }

    if (community.accessType === "public") {
      return "Join Community";
    }

    if (community.allowJoinRequests) {
      return "Request to Join";
    }

    if (community.allowInviteCodes) {
      return "Invite Code Required";
    }

    return "Membership Closed";
  }

  // ==================================================
  // Render
  // ==================================================

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#46988E"
        />
      </View>
    );
  }

  if (error || !community) {
    return (
      <SafeAreaView style={styles.center}>
        <CommunitiesNav active={origin} />
        <Text style={styles.error}>
          {error || "Community not found."}
        </Text>

        <Pressable onPress={handleBack}>
          <Text style={styles.backText}>
            ← Back to Communities
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isPrivate =
    community.accessType === "private";

  const isDraft =
    community.status === "drafted";

  const membershipDisabled =
    actionLoading ||
    membershipStatus === "owner" ||
    membershipStatus === "pending" ||
    (
      isPrivate &&
      !community.allowJoinRequests &&
      membershipStatus !== "member"
    );

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {/* ----------------------------------------
            Back
        ---------------------------------------- */}

        <Pressable
          onPress={handleBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>
            ← Back to Communities
          </Text>
        </Pressable>

        {/* ----------------------------------------
            Community Image
        ---------------------------------------- */}

        {community.communityImageURL ? (
          <Image
            source={{
              uri: community.communityImageURL,
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.placeholderText}>
              GO OUTSIDE
            </Text>
          </View>
        )}

        {/* ----------------------------------------
            Community Header
        ---------------------------------------- */}

        <View style={styles.header}>
          <Text style={styles.title}>
            {community.communityTitle ||
              "Untitled Community"}
          </Text>

          <Text style={styles.owner}>
            Owned by:{" "}
            <Text style={styles.ownerName}>
              {community.ownerName || "Unknown"}
            </Text>
          </Text>

          <View style={styles.badges}>
            <View
              style={[
                styles.badge,
                isPrivate && styles.privateBadge,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  isPrivate &&
                    styles.privateBadgeText,
                ]}
              >
                {isPrivate
                  ? "Private"
                  : "Public"}
              </Text>
            </View>

            {isDraft && (
              <View style={styles.draftBadge}>
                <Text style={styles.draftText}>
                  Draft
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ----------------------------------------
            About This Community
        ---------------------------------------- */}

        <View style={styles.descriptionCard}>
          <Text style={styles.sectionTitle}>
            About This Community
          </Text>

          <Text style={styles.description}>
            {community.communityDescription ||
              "No description has been provided."}
          </Text>
        </View>

        {/* ----------------------------------------
            Community Information
        ---------------------------------------- */}

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>
            Community Information
          </Text>

          <InfoRow
            label="Location"
            value={
              community.locationName ||
              "Not selected"
            }
          />

          <InfoRow
            label="Category"
            value={
              community.categoryName ||
              "Uncategorized"
            }
          />

          <InfoRow
            label="Created"
            value={formatCreatedDate(
              community.createdAt
            )}
            last
          />
        </View>

        {/* ----------------------------------------
            Membership
        ---------------------------------------- */}

        {!isDraft && (
          <Pressable
            style={[
              styles.membershipButton,
              membershipStatus === "member" &&
                styles.leaveButton,
              membershipDisabled &&
                styles.disabledButton,
            ]}
            disabled={membershipDisabled}
            onPress={() =>
              void handleMembershipAction()
            }
          >
            {actionLoading ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={[
                  styles.membershipText,
                  membershipStatus === "member" &&
                    styles.leaveText,
                ]}
              >
                {getMembershipLabel()}
              </Text>
            )}
          </Pressable>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================================================
// Info Row
// ==================================================

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        last && styles.lastInfoRow,
      ]}
    >
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
        {value}
      </Text>
    </View>
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

  content: {
    padding: 16,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F8F3",
    padding: 24,
    gap: 18,
  },

  backButton: {
    marginBottom: 18,
  },

  backText: {
    color: "#3F6D3F",
    fontSize: 14,
    fontWeight: "700",
  },

  heroImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: "#E5EDE4",
  },

  heroPlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 14,
    backgroundColor: "#E5EDE4",
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderText: {
    color: "#31988F",
    fontSize: 24,
    fontWeight: "800",
  },

  header: {
    marginTop: 20,
    marginBottom: 22,
  },

  title: {
    color: "#203326",
    fontSize: 27,
    fontWeight: "800",
    lineHeight: 33,
  },

  owner: {
    color: "#63715F",
    fontSize: 14,
    marginTop: 9,
  },

  ownerName: {
    color: "#263C2C",
    fontWeight: "700",
  },

  badges: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },

  badge: {
    backgroundColor: "#D7EFEB",
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  badgeText: {
    color: "#207E75",
    fontSize: 12,
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
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  draftText: {
    color: "#5B645A",
    fontSize: 12,
    fontWeight: "700",
  },

  descriptionCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: "#DCE6D8",
    borderLeftColor: "#4C7A45",
    borderRadius: 12,
    padding: 19,
    marginBottom: 16,
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE6D8",
    borderRadius: 12,
    padding: 19,
  },

  sectionTitle: {
    color: "#2F6136",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 14,
  },

  description: {
    color: "#425246",
    fontSize: 14,
    lineHeight: 23,
  },

  infoRow: {
    flexDirection: "row",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EEE5",
    gap: 12,
  },

  lastInfoRow: {
    borderBottomWidth: 0,
  },

  infoLabel: {
    width: 90,
    color: "#638060",
    fontSize: 12,
    fontWeight: "700",
  },

  infoValue: {
    flex: 1,
    color: "#263C2C",
    fontSize: 13,
    fontWeight: "700",
  },

  membershipButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4C7A45",
    borderRadius: 10,
    minHeight: 48,
    marginTop: 20,
    padding: 12,
  },

  membershipText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  leaveButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#B42318",
  },

  leaveText: {
    color: "#B42318",
  },

  disabledButton: {
    opacity: 0.55,
  },

  error: {
    color: "#B42318",
    fontSize: 14,
    textAlign: "center",
  },
});
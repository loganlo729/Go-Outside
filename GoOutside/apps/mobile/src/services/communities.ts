import { supabase } from "../lib/supabase";

// --------------------------------------------------
// Types
// --------------------------------------------------

export type CommunityRecord = {
  communityID: string;
  creatorID: string;
  categoryID: string | null;
  communityTitle: string;
  communityDescription: string | null;
  communityImage: string | null;
  communityLocation: string | null;
  status: "drafted" | "publicActive";
  accessType: "public" | "private";
  allowJoinRequests: boolean;
  allowInviteCodes: boolean;
};

export type CommunityCategory = {
  categoryID: string;
  categoryName: string;
};

// --------------------------------------------------
// Get Published Communities and Categories
// --------------------------------------------------

export async function getCommunitiesAndCategories() {
  const [
    communitiesResult,
    categoriesResult,
  ] = await Promise.all([
    supabase
      .from("Community")
      .select("*")
      .eq("status", "publicActive"),

    supabase
      .from("Category")
      .select("categoryID, categoryName")
      .order("categoryName"),
  ]);

  if (communitiesResult.error) {
    throw communitiesResult.error;
  }

  if (categoriesResult.error) {
    throw categoriesResult.error;
  }

  return {
    communities: (
      communitiesResult.data ?? []
    ) as CommunityRecord[],

    categories: (
      categoriesResult.data ?? []
    ) as CommunityCategory[],
  };
}

// --------------------------------------------------
// Get Communities Created by a User
// --------------------------------------------------

export async function getOwnedCommunities(
  userID: string
): Promise<CommunityRecord[]> {
  const { data, error } = await supabase
    .from("Community")
    .select("*")
    .eq("creatorID", userID);

  if (error) {
    throw error;
  }

  return (data ?? []) as CommunityRecord[];
}

// --------------------------------------------------
// Get Communities Joined by a User
// --------------------------------------------------

export async function getJoinedCommunities(
  userID: string
): Promise<CommunityRecord[]> {
  const { data: memberships, error } =
    await supabase
      .from("CommunityMember")
      .select("communityID")
      .eq("userID", userID);

  if (error) {
    throw error;
  }

  const communityIDs = (
    memberships ?? []
  ).map((membership) => membership.communityID);

  if (communityIDs.length === 0) {
    return [];
  }

  const { data, error: communitiesError } =
    await supabase
      .from("Community")
      .select("*")
      .in("communityID", communityIDs)
      .eq("status", "publicActive");

  if (communitiesError) {
    throw communitiesError;
  }

  return (data ?? []) as CommunityRecord[];
}
// Supabase
import { supabase } from "../lib/supabase";

// ==================================================
// Types
// ==================================================

export type CommunityMembershipStatus =
  | "loggedOut"
  | "owner"
  | "member"
  | "pending"
  | "notJoined";

export type CommunityMembershipInfo = {
  userID: string | null;
  status: CommunityMembershipStatus;
};

// ==================================================
// Authentication
// ==================================================

async function requireUserID(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error("You must be signed in.");
  }

  return user.id;
}

// ==================================================
// Get Membership
// ==================================================

export async function getCommunityMembership(
  communityID: string,
  ownerID: string
): Promise<CommunityMembershipInfo> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    return {
      userID: null,
      status: "loggedOut",
    };
  }

  if (user.id === ownerID) {
    return {
      userID: user.id,
      status: "owner",
    };
  }

  const { data: membership, error: memberError } =
    await supabase
      .from("CommunityMember")
      .select("communityID")
      .eq("communityID", communityID)
      .eq("userID", user.id)
      .maybeSingle();

  if (memberError) {
    throw new Error(memberError.message);
  }

  if (membership) {
    return {
      userID: user.id,
      status: "member",
    };
  }

  const { data: requests, error: requestError } =
    await supabase
      .from("CommunityJoinRequest")
      .select("requestID")
      .eq("communityID", communityID)
      .eq("userID", user.id)
      .eq("status", "pending")
      .limit(1);

  if (requestError) {
    throw new Error(requestError.message);
  }

  if (requests && requests.length > 0) {
    return {
      userID: user.id,
      status: "pending",
    };
  }

  return {
    userID: user.id,
    status: "notJoined",
  };
}

// ==================================================
// Join Public Community
// ==================================================

export async function joinCommunity(
  communityID: string
): Promise<void> {
  const userID = await requireUserID();

  const { error } = await supabase
    .from("CommunityMember")
    .insert({
      communityID,
      userID,
    });

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
}

// ==================================================
// Leave Community
// ==================================================

export async function leaveCommunity(
  communityID: string
): Promise<void> {
  const userID = await requireUserID();

  const { error } = await supabase
    .from("CommunityMember")
    .delete()
    .eq("communityID", communityID)
    .eq("userID", userID);

  if (error) {
    throw new Error(error.message);
  }
}

// ==================================================
// Request to Join
// ==================================================

export async function requestToJoinCommunity(
  communityID: string
): Promise<void> {
  const userID = await requireUserID();

  const { data: pending, error: checkError } =
    await supabase
      .from("CommunityJoinRequest")
      .select("requestID")
      .eq("communityID", communityID)
      .eq("userID", userID)
      .eq("status", "pending")
      .limit(1);

  if (checkError) {
    throw new Error(checkError.message);
  }

  if (pending?.length) {
    return;
  }

  const { error } = await supabase
    .from("CommunityJoinRequest")
    .insert({
      communityID,
      userID,
      status: "pending",
    });

  if (error) {
    throw new Error(error.message);
  }
}
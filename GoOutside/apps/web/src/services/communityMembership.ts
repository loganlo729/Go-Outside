// Supabase
import { getSupabaseClient } from "../lib/supabase/client";

// ==================================================
// Community Membership Service
// ==================================================

// --------------------------------------------------
// Types
// --------------------------------------------------

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

export type CommunityJoinRequestStatus =
  | "pending"
  | "approved"
  | "rejected";

// --------------------------------------------------
// Get Authenticated User
// --------------------------------------------------

export async function getCommunityUserID():
  Promise<string | null> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  return user?.id ?? null;
}

// --------------------------------------------------
// Require Authentication
// --------------------------------------------------

async function requireCommunityUserID():
  Promise<string> {
  const userID = await getCommunityUserID();

  if (!userID) {
    throw new Error(
      "You must be logged in to perform this action."
    );
  }

  return userID;
}

// ==================================================
// Get Membership Status
// ==================================================

export async function getCommunityMembership(
  communityID: string,
  ownerID: string
): Promise<CommunityMembershipInfo> {
  const supabase = getSupabaseClient();

  // ----------------------------------------
  // Authentication
  // ----------------------------------------

  const userID = await getCommunityUserID();

  if (!userID) {
    return {
      userID: null,
      status: "loggedOut",
    };
  }

  // ----------------------------------------
  // Community Owner
  // ----------------------------------------

  if (userID === ownerID) {
    return {
      userID,
      status: "owner",
    };
  }

  // ----------------------------------------
  // Check Membership
  // ----------------------------------------

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("CommunityMember")
    .select("communityID")
    .eq("communityID", communityID)
    .eq("userID", userID)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (membership) {
    return {
      userID,
      status: "member",
    };
  }

  // ----------------------------------------
  // Check Pending Join Requests
  // ----------------------------------------

  const {
    data: requests,
    error: requestError,
  } = await supabase
    .from("CommunityJoinRequest")
    .select("requestID")
    .eq("communityID", communityID)
    .eq("userID", userID)
    .eq("status", "pending")
    .limit(1);

  if (requestError) {
    throw new Error(requestError.message);
  }

  if (requests && requests.length > 0) {
    return {
      userID,
      status: "pending",
    };
  }

  // ----------------------------------------
  // Not Joined
  // ----------------------------------------

  return {
    userID,
    status: "notJoined",
  };
}

// ==================================================
// Join Public Community
// ==================================================

export async function joinCommunity(
  communityID: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const userID = await requireCommunityUserID();

  // ----------------------------------------
  // Create Membership
  // ----------------------------------------

  const { error } = await supabase
    .from("CommunityMember")
    .insert({
      communityID,
      userID,
    });

  if (error) {
    // A duplicate membership means the user
    // has already joined this community.

    if (error.code === "23505") {
      return;
    }

    throw new Error(error.message);
  }
}

// ==================================================
// Leave Community
// ==================================================

export async function leaveCommunity(
  communityID: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const userID = await requireCommunityUserID();

  // ----------------------------------------
  // Remove Membership
  // ----------------------------------------

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
// Request to Join Community
// ==================================================

export async function requestToJoinCommunity(
  communityID: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const userID = await requireCommunityUserID();

  // ----------------------------------------
  // Check Existing Pending Request
  // ----------------------------------------

  const {
    data: existingRequests,
    error: checkError,
  } = await supabase
    .from("CommunityJoinRequest")
    .select("requestID")
    .eq("communityID", communityID)
    .eq("userID", userID)
    .eq("status", "pending")
    .limit(1);

  if (checkError) {
    throw new Error(checkError.message);
  }

  if (existingRequests && existingRequests.length > 0) {
    return;
  }

  // ----------------------------------------
  // Submit Join Request
  // ----------------------------------------

  const { error } = await supabase
    .from("CommunityJoinRequest")
    .insert({
      communityID,
      userID,
      status: "pending",
    });

  if (error) {
    // Handle duplicate requests.

    if (error.code === "23505") {
      throw new Error(
        "A request for this community already exists."
      );
    }

    throw new Error(error.message);
  }
}
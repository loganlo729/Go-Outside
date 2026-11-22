// ==================================================
// Community Types
// ==================================================

export type CommunityStatus =
  | "drafted"
  | "publicActive";

export type CommunityAccessType =
  | "public"
  | "private";

export type CommunityOrigin =
  | "all_communities"
  | "my_communities";

// --------------------------------------------------
// Community Record
// --------------------------------------------------

export type CommunityRecord = {
  communityID: string;
  ownerID: string;

  communityTitle: string | null;
  communityDescription: string | null;

  categoryID: string | null;

  stateCode: string | null;
  locationID: number | null;

  communityImageURL: string | null;

  accessType: CommunityAccessType;

  allowJoinRequests: boolean;
  allowInviteCodes: boolean;

  status: CommunityStatus;

  createdAt: string | null;

  // Populated by the mobile service.
  ownerName?: string;
  categoryName?: string;
  locationName?: string;
};

// --------------------------------------------------
// Category
// --------------------------------------------------

export type CommunityCategory = {
  categoryID: string;
  categoryName: string;
};

// --------------------------------------------------
// State
// --------------------------------------------------

export type CommunityState = {
  stateCode: string;
  stateName: string;
};

// --------------------------------------------------
// Location
// --------------------------------------------------

export type CommunityLocation = {
  id: number;
  locationName: string;
  stateCode: string;
};

// --------------------------------------------------
// Create Community
// --------------------------------------------------

export type CreateCommunityInput = {
  communityTitle: string;
  communityDescription: string | null;

  categoryID: string | null;

  stateCode: string | null;
  locationID: number | null;

  accessType: CommunityAccessType;

  allowJoinRequests: boolean;
  allowInviteCodes: boolean;

  status: CommunityStatus;
};
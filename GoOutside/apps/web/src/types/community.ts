export type CommunityStatus =
  | "drafted"
  | "publicActive";

export type CommunityAccessType =
  | "public"
  | "private";

export type CommunityRecord = {
  communityID: string;
  creatorID: string;
  categoryID: string | null;
  conversationID: string | null;

  communityTitle: string;
  communityDescription: string | null;
  communityImage: string | null;
  communityLocation: string | null;

  status: CommunityStatus;
  accessType: CommunityAccessType;

  allowJoinRequests: boolean;
  allowInviteCodes: boolean;

  createdAt?: string;
  updatedAt?: string;
};

export type CommunityCategoryRecord = {
  categoryID: string;
  categoryName: string;
};

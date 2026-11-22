// Supabase
import { supabase } from "../lib/supabase";

// Image upload
import { decode } from "base64-arraybuffer";

// UUID generation
import * as Crypto from "expo-crypto";

// Types
import type {
  CommunityCategory,
  CommunityLocation,
  CommunityRecord,
  CommunityState,
  CreateCommunityInput,
} from "../types/community";

// ==================================================
// Constants
// ==================================================

const COMMUNITY_FIELDS = [
  "communityID",
  "ownerID",
  "communityTitle",
  "communityDescription",
  "categoryID",
  "stateCode",
  "locationID",
  "communityImageURL",
  "accessType",
  "allowJoinRequests",
  "allowInviteCodes",
  "status",
  "createdAt",
].join(",");

const COMMUNITY_IMAGE_BUCKET = "communities";

// --------------------------------------------------
// Image Type
// --------------------------------------------------

export type CommunityImage = {
  uri: string;
  base64: string;
  mimeType: string;
  size: number;
};

// ==================================================
// Authentication
// ==================================================

export async function getCommunityUserID():
  Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  return user?.id ?? null;
}

// ==================================================
// Attach Community Display Information
// ==================================================

async function enrichCommunities(
  communities: CommunityRecord[]
): Promise<CommunityRecord[]> {
  if (communities.length === 0) {
    return [];
  }

  // ----------------------------------------
  // Collect IDs
  // ----------------------------------------

  const ownerIDs = [
    ...new Set(communities.map((c) => c.ownerID)),
  ];

  const categoryIDs = [
    ...new Set(
      communities
        .map((c) => c.categoryID)
        .filter((id): id is string => !!id)
    ),
  ];

  const stateCodes = [
    ...new Set(
      communities
        .map((c) => c.stateCode)
        .filter((code): code is string => !!code)
    ),
  ];

  const locationIDs = [
    ...new Set(
      communities
        .map((c) => c.locationID)
        .filter((id): id is number => id !== null)
    ),
  ];

  // ----------------------------------------
  // Fetch Related Records
  // ----------------------------------------

  const [
    ownersResult,
    categoriesResult,
    statesResult,
    locationsResult,
  ] = await Promise.all([
    supabase
      .from("Profile")
      .select("userID, displayName")
      .in("userID", ownerIDs),

    categoryIDs.length
      ? supabase
          .from("Category")
          .select("categoryID, categoryName")
          .in("categoryID", categoryIDs)
      : Promise.resolve({ data: [], error: null }),

    stateCodes.length
      ? supabase
          .from("State")
          .select("stateCode, stateName")
          .in("stateCode", stateCodes)
      : Promise.resolve({ data: [], error: null }),

    locationIDs.length
      ? supabase
          .from("Location")
          .select("id, locationName, stateCode")
          .in("id", locationIDs)
      : Promise.resolve({ data: [], error: null }),
  ]);

  // Related lookup failures should not hide the
  // communities themselves.

  for (const result of [
    ownersResult,
    categoriesResult,
    statesResult,
    locationsResult,
  ]) {
    if (result.error) {
      console.warn(
        "Community related-data lookup failed:",
        result.error.message
      );
    }
  }

  // ----------------------------------------
  // Lookup Maps
  // ----------------------------------------

  const ownerMap = new Map(
    (ownersResult.data ?? []).map((owner) => [
      owner.userID,
      owner.displayName,
    ])
  );

  const categoryMap = new Map(
    (categoriesResult.data ?? []).map((category) => [
      category.categoryID,
      category.categoryName,
    ])
  );

  const stateMap = new Map(
    (statesResult.data ?? []).map((state) => [
      state.stateCode,
      state.stateName,
    ])
  );

  const locationMap = new Map(
    (locationsResult.data ?? []).map((location) => [
      location.id,
      location,
    ])
  );

  // ----------------------------------------
  // Return Enriched Records
  // ----------------------------------------

  return communities.map((community) => {
    const stateName = community.stateCode
      ? stateMap.get(community.stateCode) ??
        community.stateCode
      : "Location not set";

    const city = community.locationID
      ? locationMap.get(community.locationID)
      : null;

    const validCity =
      city &&
      city.stateCode === community.stateCode
        ? city
        : null;

    return {
      ...community,

      ownerName:
        ownerMap.get(community.ownerID) ??
        "Unknown",

      categoryName: community.categoryID
        ? categoryMap.get(community.categoryID) ??
          "Uncategorized"
        : "Uncategorized",

      locationName: validCity
        ? `${validCity.locationName}, ${stateName}`
        : stateName,
    };
  });
}

// ==================================================
// Get Categories
// ==================================================

export async function getCommunityCategories():
  Promise<CommunityCategory[]> {
  const { data, error } = await supabase
    .from("Category")
    .select("categoryID, categoryName")
    .order("categoryName");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CommunityCategory[];
}

// ==================================================
// Get Published Communities
// ==================================================

export async function getPublishedCommunities():
  Promise<CommunityRecord[]> {
  const { data, error } = await supabase
    .from("Community")
    .select(COMMUNITY_FIELDS)
    .eq("status", "publicActive")
    .order("createdAt", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return enrichCommunities(
    (data ?? []) as unknown as CommunityRecord[]
  );
}

// ==================================================
// Get Community by ID
// ==================================================

export async function getCommunityByID(
  communityID: string
): Promise<CommunityRecord | null> {
  const { data, error } = await supabase
    .from("Community")
    .select(COMMUNITY_FIELDS)
    .eq("communityID", communityID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const enriched = await enrichCommunities([
    data as unknown as CommunityRecord,
  ]);

  return enriched[0] ?? null;
}

// ==================================================
// Get My Communities
// ==================================================

export async function getMyCommunities(): Promise<{
  owned: CommunityRecord[];
  joined: CommunityRecord[];
}> {
  const userID = await getCommunityUserID();

  if (!userID) {
    return {
      owned: [],
      joined: [],
    };
  }

  // ----------------------------------------
  // Owned Communities
  // ----------------------------------------

  const { data: ownedData, error: ownedError } =
    await supabase
      .from("Community")
      .select(COMMUNITY_FIELDS)
      .eq("ownerID", userID)
      .order("createdAt", {
        ascending: false,
      });

  if (ownedError) {
    throw new Error(ownedError.message);
  }

  // ----------------------------------------
  // Joined Memberships
  // ----------------------------------------

  const {
    data: memberships,
    error: membershipError,
  } = await supabase
    .from("CommunityMember")
    .select("communityID")
    .eq("userID", userID);

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const joinedIDs = [
    ...new Set(
      (memberships ?? []).map((m) => m.communityID)
    ),
  ];

  let joinedData: CommunityRecord[] = [];

  if (joinedIDs.length > 0) {
    const { data, error } = await supabase
      .from("Community")
      .select(COMMUNITY_FIELDS)
      .in("communityID", joinedIDs);

    if (error) {
      throw new Error(error.message);
    }

    joinedData =
      (data ?? []) as unknown as CommunityRecord[];
  }

  const owned =
    (ownedData ?? []) as unknown as CommunityRecord[];

  // Exclude owned communities from the joined section.
  const joined = joinedData.filter(
    (community) => community.ownerID !== userID
  );

  const [enrichedOwned, enrichedJoined] =
    await Promise.all([
      enrichCommunities(owned),
      enrichCommunities(joined),
    ]);

  return {
    owned: enrichedOwned,
    joined: enrichedJoined,
  };
}

// ==================================================
// States
// ==================================================

export async function getCommunityStates():
  Promise<CommunityState[]> {
  const { data, error } = await supabase
    .from("State")
    .select("stateCode, stateName")
    .order("stateName");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CommunityState[];
}

// ==================================================
// Search Cities
// ==================================================

export async function searchCommunityLocations(
  stateCode: string,
  query: string
): Promise<CommunityLocation[]> {
  const search = query.trim();

  if (!stateCode || search.length < 2) {
    return [];
  }

  const { data, error } = await supabase
    .from("Location")
    .select("id, locationName, stateCode")
    .eq("stateCode", stateCode)
    .in("localityType", ["city", "town"])
    .ilike("locationName", `${search}%`)
    .order("locationName")
    .limit(15);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CommunityLocation[];
}

// ==================================================
// Create Community
// ==================================================

export async function createCommunity(
  input: CreateCommunityInput,
  image?: CommunityImage | null
): Promise<string> {
  const userID = await getCommunityUserID();

  if (!userID) {
    throw new Error(
      "You must be signed in to create a community."
    );
  }

  const communityID = Crypto.randomUUID();

  let communityImageURL: string | null = null;
  let uploadedImagePath: string | null = null;

  // ----------------------------------------
  // Upload Image
  // ----------------------------------------

  if (image) {
    const imagePath =
      `${userID}/${communityID}/community.jpg`;

    const { error: uploadError } =
      await supabase.storage
        .from(COMMUNITY_IMAGE_BUCKET)
        .upload(
          imagePath,
          decode(image.base64),
          {
            contentType: image.mimeType,
            upsert: false,
          }
        );

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    uploadedImagePath = imagePath;

    const { data } = supabase.storage
      .from(COMMUNITY_IMAGE_BUCKET)
      .getPublicUrl(imagePath);

    communityImageURL = data.publicUrl;
  }

  // ----------------------------------------
  // Insert Community
  // ----------------------------------------

  const { error } = await supabase
    .from("Community")
    .insert({
      communityID,
      ownerID: userID,

      ...input,

      communityImageURL,
    });

  if (error) {
    // Clean up the uploaded image on failure.
    if (uploadedImagePath) {
      const { error: cleanupError } =
        await supabase.storage
          .from(COMMUNITY_IMAGE_BUCKET)
          .remove([uploadedImagePath]);

      if (cleanupError) {
        console.warn(
          "Image cleanup failed:",
          cleanupError.message
        );
      }
    }

    throw new Error(error.message);
  }

  return communityID;
}
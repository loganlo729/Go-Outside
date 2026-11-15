// ==================================================
// Community Services
// ==================================================

// Types
import type {
  CommunityRecord,
  CommunityCategoryRecord,
} from "../types/community";

// Supabase client
import { getSupabaseClient } from "../lib/supabase/client";

// ==================================================
// Get Published Communities
// ==================================================

export async function getCommunities(): Promise<CommunityRecord[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("Community")
    .select("*")
    .eq("status", "publicActive")
    .order("createdAt", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Failed to fetch communities:",
      error
    );

    throw new Error(error.message);
  }

  return (data ?? []) as CommunityRecord[];
}

// ==================================================
// Get Community Categories
// ==================================================

export async function getCommunityCategories(): Promise<CommunityCategoryRecord[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("Category")
    .select("categoryID, categoryName")
    .order("categoryName", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Failed to fetch community categories:",
      error
    );

    throw new Error(error.message);
  }

  return (data ?? []) as CommunityCategoryRecord[];
}
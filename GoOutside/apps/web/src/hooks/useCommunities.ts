"use client";

// React hooks
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// Types
import type {
  CommunityRecord,
  CommunityCategoryRecord,
} from "../types/community";

// Supabase services
import {
  getCommunities,
  getCommunityCategories,
} from "../services/communities";

// --------------------------------------------------
// Communities Hook
// --------------------------------------------------

export function useCommunities() {
  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [communities, setCommunities] =
    useState<CommunityRecord[]>([]);

  const [categories, setCategories] =
    useState<CommunityCategoryRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const mountedRef = useRef(true);

  // --------------------------------------------------
  // Load Communities
  // --------------------------------------------------

  const loadCommunities = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const [
          communityData,
          categoryData,
        ] = await Promise.all([
          getCommunities(),
          getCommunityCategories(),
        ]);

        if (!mountedRef.current) {
          return;
        }

        setCommunities(communityData);
        setCategories(categoryData);
      } catch (err) {
        if (!mountedRef.current) {
          return;
        }

        console.error(
          "Error loading communities:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load communities."
        );
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    []
  );

  // --------------------------------------------------
  // Initial Load
  // --------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;

    void loadCommunities();

    return () => {
      mountedRef.current = false;
    };
  }, [loadCommunities]);

  // --------------------------------------------------
  // Refresh
  // --------------------------------------------------

  const refresh = useCallback(async () => {
    await loadCommunities(true);
  }, [loadCommunities]);

  // --------------------------------------------------
  // Retry
  // --------------------------------------------------

  const retry = useCallback(async () => {
    await loadCommunities();
  }, [loadCommunities]);

  // --------------------------------------------------
  // Return
  // --------------------------------------------------

  return {
    communities,
    categories,
    loading,
    refreshing,
    error,
    refresh,
    retry,
  };
}
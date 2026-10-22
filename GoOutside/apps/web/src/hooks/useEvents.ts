
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { getUpcomingEventsAndCategories } from "../services/events";

import type {
  CategoryRecord,
  EventRecord,
} from "../types/event";

export function useEvents() {
  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const requestNumber = useRef(0);

  // --------------------------------------------------
  // Fetch Events and Categories
  // --------------------------------------------------

  const reload = useCallback(async (refresh = false) => {
    const currentRequest = ++requestNumber.current;

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const result = await getUpcomingEventsAndCategories();

      // Ignore results from outdated requests
      if (currentRequest !== requestNumber.current) {
        return;
      }

      setEvents(result.events);
      setCategories(result.categories);
    } catch (e) {
      if (currentRequest !== requestNumber.current) {
        return;
      }

      setError(
        e instanceof Error
          ? e.message
          : "Unable to load events"
      );
    } finally {
      if (currentRequest === requestNumber.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // --------------------------------------------------
  // Initial Load and Cleanup
  // --------------------------------------------------

  useEffect(() => {
    void reload();

    return () => {
      requestNumber.current++;
    };
  }, [reload]);

  // --------------------------------------------------
  // Return Hook Values
  // --------------------------------------------------

  return {
    events,
    categories,
    loading,
    refreshing,
    error,
    refresh: () => void reload(true),
    retry: () => void reload(),
  };
}

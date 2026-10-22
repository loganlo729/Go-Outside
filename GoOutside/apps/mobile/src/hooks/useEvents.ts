
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
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [categories, setCategories] =
    useState<CategoryRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const mounted = useRef(true);
  const latestRequest = useRef(0);

  const reload = useCallback(async (isRefresh = false) => {
    const requestId = ++latestRequest.current;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const result = await getUpcomingEventsAndCategories();

      if (
        !mounted.current ||
        requestId !== latestRequest.current
      ) {
        return;
      }

      setEvents(result.events);
      setCategories(result.categories);

    } catch (cause) {
      if (
        !mounted.current ||
        requestId !== latestRequest.current
      ) {
        return;
      }

      console.error("Unable to load events:", cause);

      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load events."
      );

    } finally {
      if (
        mounted.current &&
        requestId === latestRequest.current
      ) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    void reload();

    return () => {
      mounted.current = false;
      latestRequest.current += 1;
    };
  }, [reload]);

  const refresh = useCallback(() => {
    void reload(true);
  }, [reload]);

  const retry = useCallback(() => {
    void reload();
  }, [reload]);

  return {
    events,
    categories,
    loading,
    refreshing,
    error,
    refresh,
    retry,
  };
}

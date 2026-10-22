
import { getSupabaseClient } from "../lib/supabase/client";

import type {
  CategoryRecord,
  EventRecord,
} from "../types/event";

// --------------------------------------------------
// Event Query Fields
// --------------------------------------------------

const fields =
  "eventID,userID,categoryID,eventTitle,eventDescription,eventStartTime,eventEndTime,eventLocation,eventCost,eventImageURL,isFeatured,status";

// --------------------------------------------------
// Supabase Client
// --------------------------------------------------

export function eventClient() {
  return getSupabaseClient();
}

// --------------------------------------------------
// Fetch Upcoming Public Events and Categories
// --------------------------------------------------

export async function getUpcomingEventsAndCategories(): Promise<{
  events: EventRecord[];
  categories: CategoryRecord[];
}> {
  const client = eventClient();

  const [eventsResult, categoriesResult] = await Promise.all([
    client
      .from("Event")
      .select(fields)
      .eq("status", "publicActive")
      .gte("eventStartTime", new Date().toISOString())
      .order("eventStartTime", { ascending: true }),

    client
      .from("Category")
      .select("categoryID,categoryName")
      .order("categoryName", { ascending: true }),
  ]);

  // Check for query errors
  if (eventsResult.error) {
    throw eventsResult.error;
  }

  if (categoriesResult.error) {
    throw categoriesResult.error;
  }

  return {
    events: (eventsResult.data ?? []) as unknown as EventRecord[],
    categories: (categoriesResult.data ?? []) as CategoryRecord[],
  };
}

// --------------------------------------------------
// Fetch Events Created by the Current User
// --------------------------------------------------

export async function getMyEvents(
  userID: string
): Promise<EventRecord[]> {
  const { data, error } = await eventClient()
    .from("Event")
    .select(fields)
    .eq("userID", userID)
    .order("eventStartTime", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as EventRecord[];
}


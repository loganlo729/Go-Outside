
import { getSupabaseClient } from "../lib/supabase/client";

import type {
  CategoryRecord,
  EventRecord,
} from "../types/event";

// Event Query Fields
const fields =
  "eventID,userID,categoryID,eventTitle,eventDescription,eventStartTime,eventEndTime,eventLocation,eventCost,eventImageURL,isFeatured,status";

// Supabase Client
export function eventClient() {
  return getSupabaseClient();
}


// Fetch Upcoming Public Events and Categories
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

// Fetch Events Created by the Current User
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


// Create Event Types
export interface CreateEventInput {
  eventTitle: string | null;
  categoryID: string | null;
  eventDescription: string | null;
  eventStartTime: string | null;
  eventEndTime: string | null;
  eventLocation: string | null;
  eventCost: number;
  isFeatured: boolean;
  status: "drafted" | "publicActive";
}

// Fetch Available Categories
export async function getEventCategories() {
  const { data, error } = await eventClient()
    .from("Category")
    .select("categoryID, categoryName")
    .order("categoryName", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as CategoryRecord[];
}

// Create an Event
export async function createEvent(input: CreateEventInput) {
  const client = eventClient();

  // Get the currently authenticated user.
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("You must be logged in to create an event.");
  }

  // Insert the event into Supabase.
  const { data, error } = await client
    .from("Event")
    .insert({
      userID: user.id,

      eventTitle: input.eventTitle,
      categoryID: input.categoryID,
      eventDescription: input.eventDescription,

      eventStartTime: input.eventStartTime,
      eventEndTime: input.eventEndTime,

      eventLocation: input.eventLocation,
      eventCost: input.eventCost,

      isFeatured: input.isFeatured,
      eventImageURL: null,

      status: input.status,
    })
    .select("eventID")
    .single();

  if (error) {
    console.error("Error creating event:", error);

    throw new Error(
      `${error.message}${error.details ? ` — ${error.details}` : ""}`
    );
  }

  return data;
}


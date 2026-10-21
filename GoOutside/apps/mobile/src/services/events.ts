import { supabase } from "../lib/supabase";
import type { CategoryRecord, EventRecord } from "../types/event";

const PUBLISHED_STATUS = "publicActive";

export async function getUpcomingEventsAndCategories(): Promise<{
  events: EventRecord[];
  categories: CategoryRecord[];
}> {
  const [eventsResponse, categoriesResponse] = await Promise.all([
    supabase
      .from("Event")
      .select("eventID,userID,categoryID,eventTitle,eventDescription,eventStartTime,eventEndTime,eventLocation,eventCost,eventImageURL,isFeatured,status")
      .eq("status", PUBLISHED_STATUS)
      .gte("eventStartTime", new Date().toISOString())
      .order("eventStartTime", { ascending: true }),
    supabase
      .from("Category")
      .select("categoryID,categoryName")
      .order("categoryName", { ascending: true }),
  ]);

  if (eventsResponse.error) throw eventsResponse.error;
  if (categoriesResponse.error) throw categoriesResponse.error;

  return {
    events: (eventsResponse.data ?? []) as EventRecord[],
    categories: (categoriesResponse.data ?? []) as CategoryRecord[],
  };
}
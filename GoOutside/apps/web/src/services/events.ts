
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
      .order("eventStartTime", {
        ascending: true,
      }),

    client
      .from("Category")
      .select("categoryID,categoryName")
      .order("categoryName", {
        ascending: true,
      }),
  ]);

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
    .order("eventStartTime", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as EventRecord[];
}

// --------------------------------------------------
// Create Event Types
// --------------------------------------------------

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

// --------------------------------------------------
// Fetch Available Categories
// --------------------------------------------------

export async function getEventCategories(): Promise<
  CategoryRecord[]
> {
  const { data, error } = await eventClient()
    .from("Category")
    .select("categoryID,categoryName")
    .order("categoryName", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as CategoryRecord[];
}

// --------------------------------------------------
// Event Image Configuration
// --------------------------------------------------

export const EVENT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

export const EVENT_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp";

const EVENT_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// --------------------------------------------------
// Validate Selected Image
// --------------------------------------------------

export function validateEventImage(
  file: File
): string | null {
  if (!(file.type in EVENT_IMAGE_EXTENSIONS)) {
    return "Please select a JPG, PNG, or WebP image.";
  }

  if (file.size > EVENT_IMAGE_MAX_SIZE) {
    return "The image must be 5 MB or smaller.";
  }

  if (file.size === 0) {
    return "The selected image is empty.";
  }

  return null;
}

// --------------------------------------------------
// Create Event with Optional Photo
// --------------------------------------------------

export async function createEvent(
  input: CreateEventInput,
  photo?: File | null
) {
  const client = eventClient();

  // ----------------------------------------
  // Verify Authenticated User
  // ----------------------------------------

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error(
      "You must be logged in to create an event."
    );
  }

  // ----------------------------------------
  // Validate Photo
  // ----------------------------------------

  if (photo) {
    const validationError = validateEventImage(photo);

    if (validationError) {
      throw new Error(validationError);
    }
  }

  let imageURL: string | null = null;
  let uploadedPath: string | null = null;

  // ----------------------------------------
  // Upload Photo to Supabase Storage
  // ----------------------------------------

  if (photo) {
    const extension = EVENT_IMAGE_EXTENSIONS[photo.type];

    const fileName = `${crypto.randomUUID()}.${extension}`;

    const storagePath = `${user.id}/${fileName}`;

    const { data, error: uploadError } = await client.storage
      .from("events")
      .upload(storagePath, photo, {
        cacheControl: "3600",
        contentType: photo.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `Unable to upload event photo: ${uploadError.message}`
      );
    }

    uploadedPath = data.path;

    // Retrieve Public Image URL

    const { data: publicURL } = client.storage
      .from("events")
      .getPublicUrl(data.path);

    imageURL = publicURL.publicUrl;
  }

  // ----------------------------------------
  // Insert Event into Database
  // ----------------------------------------

  const { data: event, error: insertError } = await client
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
      eventImageURL: imageURL,

      status: input.status,
    })
    .select("eventID")
    .single();

  // ----------------------------------------
  // Clean Up Image if Event Insert Fails
  // ----------------------------------------

  if (insertError) {
    if (uploadedPath) {
      const { error: cleanupError } = await client.storage
        .from("events")
        .remove([uploadedPath]);

      if (cleanupError) {
        console.error(
          "Unable to clean up unused event image:",
          cleanupError
        );
      }
    }

    console.error("Error creating event:", insertError);

    throw new Error(
      `${insertError.message}${
        insertError.details
          ? ` — ${insertError.details}`
          : ""
      }`
    );
  }

  return event;
}

// ==================================================
// RSVP FUNCTIONALITY
// ==================================================

// --------------------------------------------------
// Get Current User's RSVP Status
// --------------------------------------------------

export async function getEventRSVP(
  eventID: string,
  userID: string
): Promise<boolean> {
  const { data, error } = await eventClient()
    .from("RSVP")
    .select("rsvpStatus")
    .eq("eventID", eventID)
    .eq("userID", userID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.rsvpStatus === "going";
}

// --------------------------------------------------
// RSVP to an Event
// --------------------------------------------------

export async function addEventRSVP(
  eventID: string,
  userID: string
): Promise<void> {
  const { error } = await eventClient()
    .from("RSVP")
    .upsert(
      {
        userID,
        eventID,
        rsvpStatus: "going",
      },
      {
        onConflict: "userID,eventID",
      }
    );

  if (error) {
    throw error;
  }
}



// --------------------------------------------------
// Cancel RSVP - Delete Record from Database
// --------------------------------------------------
export async function removeEventRSVP(
  eventID: string,
  userID: string
): Promise<void> {
  const { data, error } = await eventClient()
    .from("RSVP")
    .delete()
    .eq("eventID", eventID)
    .eq("userID", userID)
    .select("rsvpID");

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(
      "RSVP could not be deleted. Check your database permissions."
    );
  }
}


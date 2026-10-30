
import { getSupabaseClient } from "../lib/supabase/client";

import type {
  CategoryRecord,
  EventRecord,
} from "../types/event";

// ==================================================
// EVENT CONFIGURATION
// ==================================================

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

// ==================================================
// EVENT FETCHING
// ==================================================

// --------------------------------------------------
// Fetch Upcoming Public Events and Categories
// --------------------------------------------------

export async function getUpcomingEventsAndCategories(): Promise<{
  events: EventRecord[];
  categories: CategoryRecord[];
}> {
  const client = eventClient();

  const [eventsResult, categoriesResult] =
    await Promise.all([
      client
        .from("Event")
        .select(fields)
        .eq("status", "publicActive")
        .gte(
          "eventStartTime",
          new Date().toISOString()
        )
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
// Fetch Available Event Categories
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

// ==================================================
// EVENT CREATION
// ==================================================

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
  // Validate Selected Photo
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

    // Store each user's images in their own folder.

    const storagePath = `${user.id}/${fileName}`;

    const { data, error: uploadError } =
      await client.storage
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

    // Retrieve the uploaded image's public URL.

    const { data: publicURL } = client.storage
      .from("events")
      .getPublicUrl(data.path);

    imageURL = publicURL.publicUrl;
  }

  // ----------------------------------------
  // Insert Event into Database
  // ----------------------------------------

  const { data: event, error: insertError } =
    await client
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
  // Handle Failed Database Insert
  // ----------------------------------------

  if (insertError) {
    // Remove any uploaded image if the insert fails.

    if (uploadedPath) {
      const { error: cleanupError } =
        await client.storage
          .from("events")
          .remove([uploadedPath]);

      if (cleanupError) {
        console.error(
          "Unable to clean up unused event image:",
          cleanupError
        );
      }
    }

    console.error(
      "Error creating event:",
      insertError
    );

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
// RSVP Change Notifications
// --------------------------------------------------

// An event may appear in multiple sections.
//
// For example:
// - Featured Events
// - Upcoming Events
// - Your Active Events
//
// These listeners synchronize RSVP changes across
// mounted components within the same browser session.

type RSVPListener = (
  eventID: string,
  userID: string,
  going: boolean
) => void;

const rsvpListeners = new Set<RSVPListener>();

// --------------------------------------------------
// Subscribe to RSVP Changes
// --------------------------------------------------

export function subscribeToRSVPChanges(
  listener: RSVPListener
): () => void {
  rsvpListeners.add(listener);

  // Return an unsubscribe function for useEffect.

  return () => {
    rsvpListeners.delete(listener);
  };
}

// --------------------------------------------------
// Notify Subscribers
// --------------------------------------------------

function notifyRSVPChange(
  eventID: string,
  userID: string,
  going: boolean
): void {
  rsvpListeners.forEach((listener) => {
    listener(eventID, userID, going);
  });
}

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

  // Return true only if the user is attending.

  return data?.rsvpStatus === "going";
}

// --------------------------------------------------
// Get Upcoming Events the User Has RSVP'd To
// --------------------------------------------------

export async function getMyUpcomingRSVPEvents(
  userID: string
): Promise<EventRecord[]> {
  const client = eventClient();

  // ----------------------------------------
  // Fetch the User's Active RSVP Records
  // ----------------------------------------

  const { data: rsvps, error: rsvpError } = await client
    .from("RSVP")
    .select("eventID")
    .eq("userID", userID)
    .eq("rsvpStatus", "going");

  if (rsvpError) {
    throw rsvpError;
  }

  // ----------------------------------------
  // Collect Unique Event IDs
  // ----------------------------------------

  const eventIDs = [
    ...new Set(
      (rsvps ?? []).map((rsvp) => rsvp.eventID)
    ),
  ];

  // No active RSVPs means no upcoming events.

  if (eventIDs.length === 0) {
    return [];
  }

  // ----------------------------------------
  // Fetch Matching Upcoming Published Events
  // ----------------------------------------

  const { data, error } = await client
    .from("Event")
    .select(fields)
    .in("eventID", eventIDs)
    .eq("status", "publicActive")
    .gte(
      "eventStartTime",
      new Date().toISOString()
    )
    .order("eventStartTime", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as EventRecord[];
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
        eventID,
        userID,
        rsvpStatus: "going",
      },
      {
        onConflict: "userID,eventID",
      }
    );

  if (error) {
    throw error;
  }

  // Update other cards and pages after success.

  notifyRSVPChange(
    eventID,
    userID,
    true
  );
}

// --------------------------------------------------
// Cancel RSVP - Delete Database Record
// --------------------------------------------------

export async function removeEventRSVP(
  eventID: string,
  userID: string
): Promise<void> {
  // Delete only the RSVP record matching this
  // authenticated user and event.
  const { data, error } = await eventClient()
    .from("RSVP")
    .delete()
    .eq("eventID", eventID)
    .eq("userID", userID)
    .select("rsvpID");

  if (error) {
    throw error;
  }

  // Verify a record was actually deleted.
  if (!data || data.length === 0) {
    throw new Error(
      "RSVP could not be deleted. Check database permissions."
    );
  }

  // Update other cards and pages after success.

  notifyRSVPChange(
    eventID,
    userID,
    false
  );
}




// --------------------------------------------------
// Get a Single Event by ID
// --------------------------------------------------


export async function getEventByID(
  eventID: string
): Promise<EventRecord | null> {
  if (!eventID) {
    throw new Error("Missing event ID in the URL.");
  }

  const { data, error } = await eventClient()
    .from("Event")
    .select(fields)
    .eq("eventID", eventID)
    .maybeSingle();

  if (error) {
    console.error("Event lookup failed:", {
      eventID,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    throw new Error(
      `Failed to fetch event: ${error.message}`
    );
  }

  return data as EventRecord | null;
}



import { decode } from "base64-arraybuffer";
import * as Crypto from "expo-crypto";

import { supabase } from "../lib/supabase";

import type {
  CategoryRecord,
  EventRecord,
} from "../types/event";

import { MAX_IMAGE_BYTES } from "../utils/eventValidation";

// --------------------------------------------------
// Constants
// --------------------------------------------------

const FIELDS =
  "eventID,userID,categoryID,eventTitle,eventDescription,eventStartTime,eventEndTime,eventLocation,eventCost,eventImageURL,isFeatured,status";

// --------------------------------------------------
// Types
// --------------------------------------------------

export type EventImage = {
  base64: string;
  uri: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  size: number;
};

export type CreateEventInput = {
  eventTitle: string | null;
  categoryID: string | null;
  eventDescription: string | null;
  eventStartTime: string | null;
  eventEndTime: string | null;
  eventLocation: string | null;
  eventCost: number;
  isFeatured: boolean;
  status: "drafted" | "publicActive";
};

// --------------------------------------------------
// Fetch Event Categories
// --------------------------------------------------

export async function getEventCategories(): Promise<
  CategoryRecord[]
> {
  const { data, error } = await supabase
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
// Fetch Upcoming Events and Categories
// --------------------------------------------------

export async function getUpcomingEventsAndCategories(): Promise<{
  events: EventRecord[];
  categories: CategoryRecord[];
}> {
  const [eventsResponse, categoriesResponse] =
    await Promise.all([
      supabase
        .from("Event")
        .select(FIELDS)
        .eq("status", "publicActive")
        .gte(
          "eventStartTime",
          new Date().toISOString()
        )
        .order("eventStartTime", {
          ascending: true,
        }),

      supabase
        .from("Category")
        .select("categoryID,categoryName")
        .order("categoryName", {
          ascending: true,
        }),
    ]);

  if (eventsResponse.error) {
    throw eventsResponse.error;
  }

  if (categoriesResponse.error) {
    throw categoriesResponse.error;
  }

  return {
    events: (eventsResponse.data ?? []) as EventRecord[],
    categories: (categoriesResponse.data ?? []) as CategoryRecord[],
  };
}

// --------------------------------------------------
// Fetch Events Created by Current User
// --------------------------------------------------

export async function getMyEvents(
  userID: string
): Promise<EventRecord[]> {
  const { data, error } = await supabase
    .from("Event")
    .select(FIELDS)
    .eq("userID", userID)
    .order("eventStartTime", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as EventRecord[];
}

// --------------------------------------------------
// Create Event with Optional Photo
// --------------------------------------------------

export async function createEvent(
  input: CreateEventInput,
  photo: EventImage | null = null
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error(
      "Please sign in to create an event."
    );
  }

  let uploadedPath: string | null = null;
  let imageURL: string | null = null;

  // Validate and upload photo.

  if (photo) {
    const validMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !validMimeTypes.includes(photo.mimeType) ||
      !photo.base64 ||
      photo.size < 1 ||
      photo.size > MAX_IMAGE_BYTES
    ) {
      throw new Error(
        "Select a JPG, PNG, or WebP image up to 5 MB."
      );
    }

    const extension =
      photo.mimeType === "image/jpeg"
        ? "jpg"
        : photo.mimeType === "image/png"
          ? "png"
          : "webp";

    const path = `${user.id}/${Crypto.randomUUID()}.${extension}`;

    const { data, error } = await supabase.storage
      .from("events")
      .upload(path, decode(photo.base64), {
        contentType: photo.mimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    uploadedPath = data.path;

    imageURL = supabase.storage
      .from("events")
      .getPublicUrl(data.path).data.publicUrl;
  }

  // Save event in database.

  const { data, error } = await supabase
    .from("Event")
    .insert({
      userID: user.id,
      ...input,
      eventImageURL: imageURL,
    })
    .select("eventID")
    .single();

  // Clean up uploaded image if insert fails.

  if (error) {
    if (uploadedPath) {
      const cleanup = await supabase.storage
        .from("events")
        .remove([uploadedPath]);

      if (cleanup.error) {
        console.error(
          "Event image cleanup failed:",
          cleanup.error
        );
      }
    }

    throw error;
  }

  return data;
}

// ==================================================
// RSVP FUNCTIONS
// ==================================================

// --------------------------------------------------
// Notify Multiple Cards of RSVP Changes
// --------------------------------------------------

// An event may appear in both Featured and its category.
// This keeps both displayed cards synchronized.

type RSVPListener = (
  eventID: string,
  userID: string,
  going: boolean
) => void;

const rsvpListeners = new Set<RSVPListener>();

export function subscribeToRSVPChanges(
  listener: RSVPListener
): () => void {
  rsvpListeners.add(listener);

  return () => {
    rsvpListeners.delete(listener);
  };
}

function notifyRSVPChange(
  eventID: string,
  userID: string,
  going: boolean
) {
  rsvpListeners.forEach((listener) => {
    listener(eventID, userID, going);
  });
}

// --------------------------------------------------
// Check Whether User Has RSVP'd
// --------------------------------------------------

export async function getEventRSVP(
  eventID: string,
  userID: string
): Promise<boolean> {
  const { data, error } = await supabase
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
// RSVP to Event
// --------------------------------------------------

export async function addEventRSVP(
  eventID: string,
  userID: string
): Promise<void> {
  const { error } = await supabase
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

  notifyRSVPChange(eventID, userID, true);
}

// --------------------------------------------------
// Cancel RSVP - Delete Database Record
// --------------------------------------------------

export async function removeEventRSVP(
  eventID: string,
  userID: string
): Promise<void> {
  const { data, error } = await supabase
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
      "Unable to remove RSVP. Check your database permissions."
    );
  }

  notifyRSVPChange(eventID, userID, false);
}



// --------------------------------------------------
// Get Upcoming Events the User RSVP'd To
// --------------------------------------------------

export async function getMyUpcomingRSVPEvents(
  userID: string
): Promise<EventRecord[]> {
  // Get active RSVP records for this user.

  const { data: rsvps, error: rsvpError } = await supabase
    .from("RSVP")
    .select("eventID")
    .eq("userID", userID)
    .eq("rsvpStatus", "going");

  if (rsvpError) {
    throw rsvpError;
  }

  const eventIDs = [
    ...new Set(
      (rsvps ?? []).map((rsvp) => rsvp.eventID)
    ),
  ];

  if (eventIDs.length === 0) {
    return [];
  }

  // Fetch the corresponding upcoming published events.

  const { data, error } = await supabase
    .from("Event")
    .select(FIELDS)
    .in("eventID", eventIDs)
    .eq("status", "publicActive")
    .gte("eventStartTime", new Date().toISOString())
    .order("eventStartTime", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as EventRecord[];
}




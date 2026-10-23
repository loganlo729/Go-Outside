
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
// Get Event Categories
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
// Get Upcoming Events and Categories
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
// Get Events Owned by Current User
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
// Create Event
// --------------------------------------------------

export async function createEvent(
  input: CreateEventInput,
  photo: EventImage | null = null
) {
  // ----------------------------------------
  // Verify Current User
  // ----------------------------------------

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

  // ----------------------------------------
  // Validate and Upload Event Photo
  // ----------------------------------------

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

    // Determine file extension

    const extension =
      photo.mimeType === "image/jpeg"
        ? "jpg"
        : photo.mimeType === "image/png"
          ? "png"
          : "webp";

    // Generate unique storage path

    const path = `${user.id}/${Crypto.randomUUID()}.${extension}`;

    // Upload photo to Supabase Storage

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

    // Retrieve public image URL

    imageURL = supabase.storage
      .from("events")
      .getPublicUrl(data.path).data.publicUrl;
  }

  // ----------------------------------------
  // Insert Event into Database
  // ----------------------------------------

  const { data, error } = await supabase
    .from("Event")
    .insert({
      userID: user.id,
      ...input,
      eventImageURL: imageURL,
    })
    .select("eventID")
    .single();

  // ----------------------------------------
  // Clean Up Image if Event Insert Fails
  // ----------------------------------------

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

  // ----------------------------------------
  // Return Created Event
  // ----------------------------------------

  return data;
}


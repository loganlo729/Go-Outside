
import { decode } from "base64-arraybuffer";
import * as Crypto from "expo-crypto";

import { supabase } from "../lib/supabase";
import type { EventImage } from "./events";
import type { EventRecord } from "../types/event";
import { MAX_IMAGE_BYTES } from "../utils/eventValidation";

// --------------------------------------------------
// Types and Constants
// --------------------------------------------------

const BUCKET = "events";

export type EventDraftInput = {
  eventTitle: string | null;
  categoryID: string | null;
  eventDescription: string | null;
  eventStartTime: string | null;
  eventEndTime: string | null;
  eventLocation: string | null;
  eventCost: number;
  isFeatured: boolean;
};

// --------------------------------------------------
// Authenticated User
// --------------------------------------------------

async function requireUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  if (!user) {
    throw new Error("You must be signed in.");
  }

  return user;
}

// --------------------------------------------------
// Verify Event Ownership and Status
// --------------------------------------------------

async function requireOwnedEvent(
  eventID: string,
  expectedStatus: "drafted" | "publicActive"
) {
  const user = await requireUser();

  const { data, error } = await supabase
    .from("Event")
    .select("eventID,userID,status,eventImageURL")
    .eq("eventID", eventID)
    .eq("userID", user.id)
    .eq("status", expectedStatus)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "Event not found, status changed, or you do not own this event."
    );
  }

  return { user, event: data };
}

// --------------------------------------------------
// Validate Photo
// --------------------------------------------------

function validatePhoto(photo: EventImage) {
  const types = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (
    !types.includes(photo.mimeType) ||
    !photo.base64 ||
    photo.size < 1 ||
    photo.size > MAX_IMAGE_BYTES
  ) {
    throw new Error(
      "Choose a JPG, PNG, or WebP image no larger than 5 MB."
    );
  }
}

// --------------------------------------------------
// Extract Owned Image Storage Path
// --------------------------------------------------

function getOwnedImagePath(
  imageURL: string | null,
  userID: string
): string | null {
  if (!imageURL) return null;

  try {
    const bucketURL = new URL(
      supabase.storage
        .from(BUCKET)
        .getPublicUrl("").data.publicUrl
    );

    const imageURLObject = new URL(imageURL);

    if (
      bucketURL.origin !== imageURLObject.origin
    ) {
      return null;
    }

    const prefix =
      bucketURL.pathname.replace(/\/+$/, "") + "/";

    if (
      !imageURLObject.pathname.startsWith(prefix)
    ) {
      return null;
    }

    const path = decodeURIComponent(
      imageURLObject.pathname.slice(prefix.length)
    );

    if (!path.startsWith(`${userID}/`)) {
      return null;
    }

    if (
      path
        .split("/")
        .some(
          (segment) =>
            segment === "." || segment === ".."
        )
    ) {
      return null;
    }

    return path;
  } catch {
    return null;
  }
}

// --------------------------------------------------
// Clean Up Storage Image
// --------------------------------------------------

async function cleanupImage(path: string) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path]);

  if (error) {
    console.warn(
      "Event image cleanup failed:",
      error.message
    );
  }
}

// --------------------------------------------------
// Update an Existing Draft
// --------------------------------------------------

export async function updateMobileEvent(
  eventID: string,
  input: EventDraftInput,
  photo: EventImage | null = null,
  removeExistingImage = false
) {
  const { user, event } = await requireOwnedEvent(
    eventID,
    "drafted"
  );

  const oldURL: string | null =
    event.eventImageURL ?? null;

  let newURL: string | null =
    removeExistingImage ? null : oldURL;

  let uploadedPath: string | null = null;

  // Upload a replacement image if selected.

  if (photo) {
    validatePhoto(photo);

    const extension =
      photo.mimeType === "image/png"
        ? "png"
        : photo.mimeType === "image/webp"
          ? "webp"
          : "jpg";

    const path =
      `${user.id}/${Crypto.randomUUID()}.${extension}`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, decode(photo.base64), {
        contentType: photo.mimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(
        `Unable to upload photo: ${error.message}`
      );
    }

    uploadedPath = data.path;

    newURL = supabase.storage
      .from(BUCKET)
      .getPublicUrl(data.path).data.publicUrl;
  }

  // Update the existing database record.

  let updatedEvent: { eventID: string };

  try {
    const { data, error } = await supabase
      .from("Event")
      .update({
        ...input,
        status: "drafted",
        eventImageURL: newURL,
      })
      .eq("eventID", eventID)
      .eq("userID", user.id)
      .eq("status", "drafted")
      .select("eventID")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(
        "Draft was not updated. Check ownership and permissions."
      );
    }

    updatedEvent = data;
  } catch (error) {
    // Avoid leaving an unused replacement image.
    if (uploadedPath) {
      await cleanupImage(uploadedPath);
    }

    throw error;
  }

  // Clean up the previous image only after
  // the database update succeeds.

  if (oldURL && oldURL !== newURL) {
    const oldPath = getOwnedImagePath(
      oldURL,
      user.id
    );

    if (oldPath) {
      await cleanupImage(oldPath);
    }
  }

  return updatedEvent;
}

// --------------------------------------------------
// Publish an Existing Draft
// --------------------------------------------------

export async function publishMobileEvent(
  eventID: string
) {
  const { user } = await requireOwnedEvent(
    eventID,
    "drafted"
  );

  // Retrieve the latest saved fields.

  const { data: event, error: readError } =
    await supabase
      .from("Event")
      .select(
        "eventTitle,categoryID,eventDescription,eventStartTime,eventEndTime,eventLocation,eventCost,eventImageURL"
      )
      .eq("eventID", eventID)
      .eq("userID", user.id)
      .eq("status", "drafted")
      .maybeSingle();

  if (readError) throw readError;

  if (!event) {
    throw new Error("Draft not found.");
  }

  // Required fields.

  if (
    !event.eventTitle?.trim() ||
    !event.categoryID ||
    !event.eventDescription?.trim() ||
    !event.eventLocation?.trim() ||
    !event.eventImageURL
  ) {
    throw new Error(
      "Complete the event title, category, description, location, and photo before publishing."
    );
  }

  // Dates.

  const start = Date.parse(
    event.eventStartTime || ""
  );

  const end = Date.parse(
    event.eventEndTime || ""
  );

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start <= Date.now() ||
    end <= start
  ) {
    throw new Error(
      "The event must have valid future start and end times."
    );
  }

  // Cost.

  if (
    event.eventCost == null ||
    !Number.isFinite(Number(event.eventCost)) ||
    Number(event.eventCost) < 0
  ) {
    throw new Error("Enter a valid event cost.");
  }

  // Publish.

  const { data, error } = await supabase
    .from("Event")
    .update({
      status: "publicActive",
    })
    .eq("eventID", eventID)
    .eq("userID", user.id)
    .eq("status", "drafted")
    .select("eventID")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "Unable to publish this draft."
    );
  }

  return data;
}

// --------------------------------------------------
// Cancel a Published Event
// --------------------------------------------------

export async function cancelMobileEvent(
  eventID: string
) {
  const { user } = await requireOwnedEvent(
    eventID,
    "publicActive"
  );

  const { data, error } = await supabase
    .from("Event")
    .update({
      status: "drafted",
    })
    .eq("eventID", eventID)
    .eq("userID", user.id)
    .eq("status", "publicActive")
    .select("eventID")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "Unable to cancel this event."
    );
  }

  return data;
}

// --------------------------------------------------
// Permanently Delete an Owned Draft
// --------------------------------------------------

export async function deleteMobileDraft(
  eventID: string
) {
  const { user, event } = await requireOwnedEvent(
    eventID,
    "drafted"
  );

  const { data, error } = await supabase
    .from("Event")
    .delete()
    .eq("eventID", eventID)
    .eq("userID", user.id)
    .eq("status", "drafted")
    .select("eventID")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "Unable to delete this draft."
    );
  }

  // Clean up the image after successful deletion.

  const imagePath = getOwnedImagePath(
    event.eventImageURL ?? null,
    user.id
  );

  if (imagePath) {
    await cleanupImage(imagePath);
  }

  return data;
}

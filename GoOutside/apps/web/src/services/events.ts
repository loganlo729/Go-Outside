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

// --------------------------------------------------
// Get a Single Event by ID
// --------------------------------------------------

export async function getEventByID(
  eventID: string
): Promise<EventRecord | null> {
  if (!eventID) {
    throw new Error(
      "Missing event ID in the URL."
    );
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

export const EVENT_IMAGE_MAX_SIZE =
  5 * 1024 * 1024;

export const EVENT_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp";

const EVENT_IMAGE_EXTENSIONS: Record<
  string,
  string
> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const EVENT_IMAGE_BUCKET = "events";

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

// ==================================================
// EVENT IMAGE STORAGE HELPERS
// ==================================================

// --------------------------------------------------
// Upload Event Image
// --------------------------------------------------

async function uploadEventImage(
  photo: File,
  userID: string
): Promise<{
  imageURL: string;
  storagePath: string;
}> {
  const client = eventClient();

  // --------------------------------------------------
  // Validate Image
  // --------------------------------------------------

  const validationError =
    validateEventImage(photo);

  if (validationError) {
    throw new Error(validationError);
  }

  // --------------------------------------------------
  // Generate Unique Storage Path
  // --------------------------------------------------

  const extension =
    EVENT_IMAGE_EXTENSIONS[photo.type];

  const fileName =
    `${crypto.randomUUID()}.${extension}`;

  // Store each user's images in their own folder.

  const storagePath =
    `${userID}/${fileName}`;

  // --------------------------------------------------
  // Upload to Supabase Storage
  // --------------------------------------------------

  const { data, error: uploadError } =
    await client.storage
      .from(EVENT_IMAGE_BUCKET)
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

  // --------------------------------------------------
  // Get Public Image URL
  // --------------------------------------------------

  const { data: publicURL } =
    client.storage
      .from(EVENT_IMAGE_BUCKET)
      .getPublicUrl(data.path);

  return {
    imageURL: publicURL.publicUrl,
    storagePath: data.path,
  };
}

// --------------------------------------------------
// Get Owned Storage Path from Image URL
// --------------------------------------------------

function getOwnedEventImagePath(
  imageURL: string | null,
  userID: string
): string | null {
  if (!imageURL) {
    return null;
  }

  try {
    const client = eventClient();

    // Get the public URL for the storage bucket.

    const { data } =
      client.storage
        .from(EVENT_IMAGE_BUCKET)
        .getPublicUrl("");

    const bucketURL = new URL(data.publicUrl);
    const imageURLObject = new URL(imageURL);

    // Only recognize URLs from our Supabase project.

    if (
      imageURLObject.origin !==
      bucketURL.origin
    ) {
      return null;
    }

    // Normalize the bucket URL path.

    const bucketPrefix =
      bucketURL.pathname.replace(/\/+$/, "") + "/";

    if (
      !imageURLObject.pathname.startsWith(
        bucketPrefix
      )
    ) {
      return null;
    }

    // Extract the actual storage path.

    const storagePath = decodeURIComponent(
      imageURLObject.pathname.slice(
        bucketPrefix.length
      )
    );

    // Only allow cleanup inside this user's folder.

    if (
      !storagePath.startsWith(`${userID}/`)
    ) {
      return null;
    }

    // Reject unexpected path traversal segments.

    if (
      storagePath
        .split("/")
        .some(
          (segment) =>
            segment === "." ||
            segment === ".."
        )
    ) {
      return null;
    }

    return storagePath;
  } catch {
    return null;
  }
}

// --------------------------------------------------
// Remove Image from Supabase Storage
// --------------------------------------------------

async function removeEventImage(
  storagePath: string
): Promise<void> {
  const client = eventClient();

  const { error } = await client.storage
    .from(EVENT_IMAGE_BUCKET)
    .remove([storagePath]);

  if (error) {
    throw new Error(
      `Unable to remove event image: ${error.message}`
    );
  }
}

// --------------------------------------------------
// Safely Clean Up an Image
// --------------------------------------------------

async function cleanupEventImage(
  storagePath: string
): Promise<void> {
  try {
    await removeEventImage(storagePath);
  } catch (cleanupError) {
    console.error(
      "Unable to clean up event image:",
      cleanupError
    );
  }
}

// ==================================================
// CREATE EVENT
// ==================================================

// --------------------------------------------------
// Create Event with Optional Photo
// --------------------------------------------------

export async function createEvent(
  input: CreateEventInput,
  photo?: File | null
) {
  const client = eventClient();

  // --------------------------------------------------
  // Verify Authenticated User
  // --------------------------------------------------

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

  // --------------------------------------------------
  // Validate Photo
  // --------------------------------------------------

  if (photo) {
    const validationError =
      validateEventImage(photo);

    if (validationError) {
      throw new Error(validationError);
    }
  }

  let imageURL: string | null = null;
  let uploadedPath: string | null = null;

  // --------------------------------------------------
  // Upload Event Photo
  // --------------------------------------------------

  if (photo) {
    const uploaded = await uploadEventImage(
      photo,
      user.id
    );

    imageURL = uploaded.imageURL;
    uploadedPath = uploaded.storagePath;
  }

  // --------------------------------------------------
  // Insert Event into Database
  // --------------------------------------------------

  let event: {
    eventID: string;
  } | null = null;

  try {
    const {
      data,
      error: insertError,
    } = await client
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

    if (insertError) {
      throw insertError;
    }

    event = data;
  } catch (insertError) {
    // --------------------------------------------------
    // Clean Up Uploaded Image on Failure
    // --------------------------------------------------

    if (uploadedPath) {
      await cleanupEventImage(uploadedPath);
    }

    console.error(
      "Error creating event:",
      insertError
    );

    throw new Error(
      insertError instanceof Error
        ? insertError.message
        : "Unable to create event."
    );
  }

  return event;
}

// ==================================================
// EVENT UPDATING
// ==================================================

// --------------------------------------------------
// Update Event Options
// --------------------------------------------------

export interface UpdateEventOptions {
  photo?: File | null;
  removeExistingImage?: boolean;
}

// --------------------------------------------------
// Update Existing Draft Event
// --------------------------------------------------

export async function updateEvent(
  eventID: string,
  input: CreateEventInput,
  options: UpdateEventOptions = {}
) {
  const client = eventClient();

  const {
    photo = null,
    removeExistingImage = false,
  } = options;

  // --------------------------------------------------
  // Validate Event ID
  // --------------------------------------------------

  if (!eventID) {
    throw new Error(
      "Missing event ID."
    );
  }

  // --------------------------------------------------
  // Only Draft Events Can Be Edited
  // --------------------------------------------------

  if (input.status !== "drafted") {
    throw new Error(
      "Only draft events can be edited."
    );
  }

  // --------------------------------------------------
  // Verify Authenticated User
  // --------------------------------------------------

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error(
      "You must be logged in to edit an event."
    );
  }

  // --------------------------------------------------
  // Verify Ownership and Draft Status
  // --------------------------------------------------

  const {
    data: existingEvent,
    error: fetchError,
  } = await client
    .from("Event")
    .select(
      "eventID,userID,status,eventImageURL"
    )
    .eq("eventID", eventID)
    .eq("userID", user.id)
    .eq("status", "drafted")
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!existingEvent) {
    throw new Error(
      "Draft not found, or you do not have permission to edit it."
    );
  }

  // --------------------------------------------------
  // Validate Replacement Photo
  // --------------------------------------------------

  if (photo) {
    const validationError =
      validateEventImage(photo);

    if (validationError) {
      throw new Error(validationError);
    }
  }

  // --------------------------------------------------
  // Get Existing Image
  // --------------------------------------------------

  const oldImageURL: string | null =
    existingEvent.eventImageURL ?? null;

  let newImageURL: string | null =
    oldImageURL;

  let uploadedPath: string | null = null;

  // --------------------------------------------------
  // Upload Replacement Image
  // --------------------------------------------------

  if (photo) {
    const uploaded = await uploadEventImage(
      photo,
      user.id
    );

    newImageURL = uploaded.imageURL;
    uploadedPath = uploaded.storagePath;
  } else if (removeExistingImage) {
    // Clear the existing image reference.

    newImageURL = null;
  }

  // --------------------------------------------------
  // Update Existing Event Record
  // --------------------------------------------------

  let updatedEvent: {
    eventID: string;
  } | null = null;

  try {
    const {
      data,
      error: updateError,
    } = await client
      .from("Event")
      .update({
        eventTitle: input.eventTitle,
        categoryID: input.categoryID,
        eventDescription: input.eventDescription,

        eventStartTime: input.eventStartTime,
        eventEndTime: input.eventEndTime,

        eventLocation: input.eventLocation,
        eventCost: input.eventCost,

        isFeatured: input.isFeatured,

        // Preserve drafted status.
        status: "drafted",

        // Keep, replace, or remove the photo.
        eventImageURL: newImageURL,
      })
      .eq("eventID", eventID)
      .eq("userID", user.id)
      .eq("status", "drafted")
      .select("eventID")
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    if (!data) {
      throw new Error(
        "Unable to update this draft. It may have changed or you may not have permission."
      );
    }

    updatedEvent = data;
  } catch (updateError) {
    // --------------------------------------------------
    // Clean Up Newly Uploaded Photo on Failure
    // --------------------------------------------------

    if (uploadedPath) {
      await cleanupEventImage(uploadedPath);
    }

    throw updateError;
  }

  // --------------------------------------------------
  // Remove Old Photo After Successful Update
  // --------------------------------------------------

  const imageChanged =
    oldImageURL !== newImageURL;

  if (imageChanged && oldImageURL) {
    const oldStoragePath =
      getOwnedEventImagePath(
        oldImageURL,
        user.id
      );

    if (oldStoragePath) {
      // The database update has already succeeded.
      // Storage cleanup failures should not undo it.

      await cleanupEventImage(
        oldStoragePath
      );
    }
  }

  // --------------------------------------------------
  // Return Updated Event
  // --------------------------------------------------

  return updatedEvent;
}

// ==================================================
// RSVP FUNCTIONALITY
// ==================================================

// --------------------------------------------------
// RSVP Change Notifications
// --------------------------------------------------

// Events can appear in multiple places:
// - Featured Events
// - Upcoming Events
// - My Events
//
// These listeners synchronize RSVP changes
// across mounted components in the same browser.

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

  return () => {
    rsvpListeners.delete(listener);
  };
}

// --------------------------------------------------
// Notify RSVP Subscribers
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

  return data?.rsvpStatus === "going";
}

// --------------------------------------------------
// Get Upcoming Events the User Has RSVP'd To
// --------------------------------------------------

export async function getMyUpcomingRSVPEvents(
  userID: string
): Promise<EventRecord[]> {
  const client = eventClient();

  // --------------------------------------------------
  // Fetch Active RSVP Records
  // --------------------------------------------------

  const {
    data: rsvps,
    error: rsvpError,
  } = await client
    .from("RSVP")
    .select("eventID")
    .eq("userID", userID)
    .eq("rsvpStatus", "going");

  if (rsvpError) {
    throw rsvpError;
  }

  // --------------------------------------------------
  // Collect Unique Event IDs
  // --------------------------------------------------

  const eventIDs = [
    ...new Set(
      (rsvps ?? []).map(
        (rsvp: { eventID: string }) =>
          rsvp.eventID
      )
    ),
  ];

  if (eventIDs.length === 0) {
    return [];
  }

  // --------------------------------------------------
  // Fetch Upcoming Published Events
  // --------------------------------------------------

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

  // Notify other event cards and pages.

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
  const { data, error } = await eventClient()
    .from("RSVP")
    .delete()
    .eq("eventID", eventID)
    .eq("userID", userID)
    .select("rsvpID");

  if (error) {
    throw error;
  }

  // Verify a record was deleted.

  if (!data || data.length === 0) {
    throw new Error(
      "RSVP could not be deleted. Check database permissions."
    );
  }

  // Notify other event cards and pages.

  notifyRSVPChange(
    eventID,
    userID,
    false
  );
}

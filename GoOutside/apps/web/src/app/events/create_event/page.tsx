"use client";

// React hooks
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// React types
import type { ChangeEvent } from "react";

// Navigation
import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

// Event services
import {
  createEvent,
  updateEvent,
  eventClient,
  getEventByID,
  getEventCategories,
  EVENT_IMAGE_ACCEPT,
  validateEventImage,
} from "../../../services/events";

// Category type
import type {
  CategoryRecord,
} from "../../../types/event";

// Component styles
import styles from "./CreateEvent.module.css";

// Address autocomplete
import AddressAutocomplete from "../../../components/events/AddressAutocomplete";

// Image cropper
import EventImageCropper from "../../../components/events/EventImageCropper";

// --------------------------------------------------
// Types
// --------------------------------------------------

type EventDateTime = {
  date: string;
  hour: string;
  minute: string;
  period: "AM" | "PM";
};

type DateTimeInputProps = {
  label: string;
  value: EventDateTime;
  onChange: (value: EventDateTime) => void;
};

// --------------------------------------------------
// Form Limits
// --------------------------------------------------

const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_EVENT_COST = 9999.99;

// --------------------------------------------------
// Date and Time Options
// --------------------------------------------------

const emptyDateTime = (): EventDateTime => ({
  date: "",
  hour: "12",
  minute: "00",
  period: "PM",
});

const hours = Array.from(
  { length: 12 },
  (_, index) => String(index + 1)
);

const minutes = Array.from(
  { length: 60 },
  (_, index) => String(index).padStart(2, "0")
);

// --------------------------------------------------
// Get Today's Local Date
// --------------------------------------------------

function getTodayLocal(): string {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// --------------------------------------------------
// Convert Local Date/Time to ISO
// --------------------------------------------------

function toISOString(
  value: EventDateTime
): string | null {
  if (!value.date) {
    return null;
  }

  let hour = Number(value.hour);

  if (value.period === "PM" && hour !== 12) {
    hour += 12;
  }

  if (value.period === "AM" && hour === 12) {
    hour = 0;
  }

  const [year, month, day] = value.date
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day,
    hour,
    Number(value.minute),
    0
  );

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== Number(value.minute)
  ) {
    return null;
  }

  return date.toISOString();
}

// --------------------------------------------------
// Convert ISO Date/Time to Form Values
// --------------------------------------------------

function fromISOString(
  iso: string | null
): EventDateTime {
  if (!iso) {
    return emptyDateTime();
  }

  const value = new Date(iso);

  if (Number.isNaN(value.getTime())) {
    return emptyDateTime();
  }

  const year = value.getFullYear();

  const month = String(
    value.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    value.getDate()
  ).padStart(2, "0");

  const hour24 = value.getHours();

  return {
    date: `${year}-${month}-${day}`,
    hour: String((hour24 % 12) || 12),
    minute: String(
      value.getMinutes()
    ).padStart(2, "0"),
    period: hour24 >= 12 ? "PM" : "AM",
  };
}

// --------------------------------------------------
// Date Field
// --------------------------------------------------

function EventDateField({
  label,
  value,
  onChange,
  minDate,
}: DateTimeInputProps & {
  minDate: string;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {label}

        <input
          type="date"
          aria-label={label}
          className={styles.dateInput}
          value={value.date}
          min={minDate}
          onChange={(event) =>
            onChange({
              ...value,
              date: event.target.value,
            })
          }
        />
      </label>
    </div>
  );
}

// --------------------------------------------------
// Time Field
// --------------------------------------------------

function EventTimeField({
  label,
  value,
  onChange,
}: DateTimeInputProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {label}
      </label>

      <div className={styles.timeRow}>
        {/* Hour */}

        <select
          aria-label={`${label} hour`}
          className={styles.select}
          value={value.hour}
          onChange={(event) =>
            onChange({
              ...value,
              hour: event.target.value,
            })
          }
        >
          {hours.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </select>

        <span className={styles.timeSeparator}>
          :
        </span>

        {/* Minute */}

        <select
          aria-label={`${label} minute`}
          className={styles.select}
          value={value.minute}
          onChange={(event) =>
            onChange({
              ...value,
              minute: event.target.value,
            })
          }
        >
          {minutes.map((minute) => (
            <option key={minute} value={minute}>
              {minute}
            </option>
          ))}
        </select>

        {/* AM / PM */}

        <select
          aria-label={`${label} AM or PM`}
          className={styles.select}
          value={value.period}
          onChange={(event) =>
            onChange({
              ...value,
              period: event.target.value as
                | "AM"
                | "PM",
            })
          }
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

// --------------------------------------------------
// Create / Edit Event Page
// --------------------------------------------------

export default function CreateEventPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --------------------------------------------------
  // Create / Edit Mode
  // --------------------------------------------------

  const editEventID = searchParams.get("edit");

  const isEditMode = Boolean(editEventID);

  const eventDetailsHref = editEventID
    ? `/events/${encodeURIComponent(editEventID)}?from=my_events`
    : "/events/my_events";

  // --------------------------------------------------
  // Event Fields
  // --------------------------------------------------

  const [title, setTitle] = useState("");
  const [categoryID, setCategoryID] = useState("");
  const [description, setDescription] = useState("");

  const [startTime, setStartTime] =
    useState<EventDateTime>(emptyDateTime);

  const [endTime, setEndTime] =
    useState<EventDateTime>(emptyDateTime);

  const [location, setLocation] = useState("");
  const [cost, setCost] = useState("0");

  const [isFeatured, setIsFeatured] =
    useState(false);

  // --------------------------------------------------
  // Automatically Populate End Date
  // --------------------------------------------------

  function handleStartDateChange(
    value: EventDateTime
  ) {
    setStartTime(value);

    // Match the end date to the selected start date.
    // Users can change the end date independently.

    setEndTime((previous) => ({
      ...previous,
      date: value.date,
    }));
  }

  // --------------------------------------------------
  // Photo State
  // --------------------------------------------------

  // Final cropped photo for a new upload.
  const [photo, setPhoto] = useState<File | null>(
    null
  );

  // Original local image for recropping.
  const [originalPhoto, setOriginalPhoto] =
    useState<File | null>(null);

  // Image currently being cropped.
  const [photoToCrop, setPhotoToCrop] =
    useState<File | null>(null);

  // Existing image stored in Supabase.
  const [existingImageURL, setExistingImageURL] =
    useState<string | null>(null);

  // Whether the existing image should be removed.
  const [
    removeExistingImage,
    setRemoveExistingImage,
  ] = useState(false);

  const [photoPreview, setPhotoPreview] =
    useState<string | null>(null);

  const photoInputRef =
    useRef<HTMLInputElement>(null);

  // --------------------------------------------------
  // Generate Photo Preview
  // --------------------------------------------------

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }

    const previewURL = URL.createObjectURL(photo);

    setPhotoPreview(previewURL);

    return () => {
      URL.revokeObjectURL(previewURL);
    };
  }, [photo]);

  // --------------------------------------------------
  // Displayed Photo
  // --------------------------------------------------

  const displayedPhotoURL =
    photoPreview ??
    (removeExistingImage
      ? null
      : existingImageURL);

  const hasEventPhoto = Boolean(
    photo || displayedPhotoURL
  );

  // --------------------------------------------------
  // Select Photo
  // --------------------------------------------------

  function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError =
      validateEventImage(file);

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    setError("");

    // Open cropper without changing accepted photo.
    setPhotoToCrop(file);
  }

  // --------------------------------------------------
  // Apply Cropped Photo
  // --------------------------------------------------

  function handleApplyCrop(croppedFile: File) {
    if (!photoToCrop) {
      return;
    }

    const validationError =
      validateEventImage(croppedFile);

    if (validationError) {
      setError(validationError);
      return;
    }

    setPhoto(croppedFile);
    setOriginalPhoto(photoToCrop);
    setPhotoToCrop(null);

    // The new photo replaces any pending removal.
    setRemoveExistingImage(false);

    setError("");
  }

  // --------------------------------------------------
  // Reopen Image Cropper
  // --------------------------------------------------

  function handleRecropPhoto() {
    if (!originalPhoto || saving) {
      return;
    }

    setError("");
    setPhotoToCrop(originalPhoto);
  }

  // --------------------------------------------------
  // Cancel Cropping
  // --------------------------------------------------

  function handleCancelCrop() {
    setPhotoToCrop(null);

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }

  // --------------------------------------------------
  // Remove Photo
  // --------------------------------------------------

  function handleRemovePhoto() {
    if (saving) {
      return;
    }

    setPhoto(null);
    setOriginalPhoto(null);
    setPhotoPreview(null);
    setPhotoToCrop(null);

    if (isEditMode) {
      setRemoveExistingImage(true);
    }

    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }

  // --------------------------------------------------
  // UI State
  // --------------------------------------------------

  const [categories, setCategories] =
    useState<CategoryRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [categoryError, setCategoryError] =
    useState("");

  const [signedIn, setSignedIn] = useState(false);

  // Tracks whether a requested draft was loaded.
  const [editLoaded, setEditLoaded] =
    useState(false);

  // --------------------------------------------------
  // Load User, Categories, and Existing Draft
  // --------------------------------------------------

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setCategoryError("");
    setEditLoaded(false);

    try {
      const client = eventClient();

      const {
        data: { user },
        error: authError,
      } = await client.auth.getUser();

      if (authError) {
        throw authError;
      }

      setSignedIn(!!user);

      if (!user) {
        setCategories([]);
        return;
      }

      // --------------------------------------------------
      // Load Categories
      // --------------------------------------------------

      try {
        const result = await getEventCategories();
        setCategories(result);
      } catch (categoryLoadError) {
        setCategoryError(
          categoryLoadError instanceof Error
            ? categoryLoadError.message
            : "Unable to load categories."
        );
      }

      // --------------------------------------------------
      // Load Existing Draft
      // --------------------------------------------------

      if (editEventID) {
        const existingEvent = await getEventByID(
          editEventID
        );

        if (!existingEvent) {
          throw new Error("Event not found.");
        }

        if (existingEvent.userID !== user.id) {
          throw new Error(
            "You do not have permission to edit this event."
          );
        }

        if (existingEvent.status !== "drafted") {
          throw new Error(
            "Only draft events can be edited."
          );
        }

        // --------------------------------------------------
        // Prepopulate Fields
        // --------------------------------------------------

        setTitle(
          existingEvent.eventTitle ?? ""
        );

        setCategoryID(
          existingEvent.categoryID ?? ""
        );

        setDescription(
          existingEvent.eventDescription ?? ""
        );

        setStartTime(
          fromISOString(
            existingEvent.eventStartTime
          )
        );

        setEndTime(
          fromISOString(
            existingEvent.eventEndTime
          )
        );

        setLocation(
          existingEvent.eventLocation ?? ""
        );

        setCost(
          String(existingEvent.eventCost ?? 0)
        );

        setIsFeatured(
          existingEvent.isFeatured ?? false
        );

        // --------------------------------------------------
        // Prepopulate Existing Image
        // --------------------------------------------------

        setExistingImageURL(
          existingEvent.eventImageURL ?? null
        );

        setRemoveExistingImage(false);

        setPhoto(null);
        setOriginalPhoto(null);
        setPhotoToCrop(null);

        setEditLoaded(true);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to initialize the event form."
      );
    } finally {
      setLoading(false);
    }
  }, [editEventID]);

  // --------------------------------------------------
  // Initialize Form
  // --------------------------------------------------

  useEffect(() => {
    void load();
  }, [load]);

  // --------------------------------------------------
  // Save Draft, Publish, or Update
  // --------------------------------------------------

  async function handleSave(
    action: "drafted" | "publicActive"
  ) {
    if (
      saving ||
      loading ||
      photoToCrop ||
      (isEditMode && !editLoaded)
    ) {
      return;
    }

    setError("");

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanLocation = location.trim();

    const startISO = toISOString(startTime);
    const endISO = toISOString(endTime);

    const costText =
      cost.trim() === ""
        ? "0"
        : cost.trim();

    const parsedCost = Number(costText);

    // --------------------------------------------------
    // Cost Validation
    // --------------------------------------------------

    if (
      !Number.isFinite(parsedCost) ||
      parsedCost < 0 ||
      parsedCost > MAX_EVENT_COST ||
      !/^\d+(\.\d{1,2})?$/.test(costText)
    ) {
      setError(
        "Event cost must be between $0 and $9,999.99, with a maximum of two decimal places."
      );
      return;
    }

    // --------------------------------------------------
    // Title and Description Validation
    // --------------------------------------------------

    if (cleanTitle.length > MAX_TITLE_LENGTH) {
      setError(
        `Event title cannot exceed ${MAX_TITLE_LENGTH} characters.`
      );
      return;
    }

    if (
      description.length >
      MAX_DESCRIPTION_LENGTH
    ) {
      setError(
        `Event description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`
      );
      return;
    }

    // --------------------------------------------------
    // Date Validation
    // --------------------------------------------------

    const today = getTodayLocal();

    if (
      (startTime.date &&
        startTime.date < today) ||
      (endTime.date &&
        endTime.date < today)
    ) {
      setError(
        "Event dates cannot be in the past."
      );
      return;
    }

    if (
      startTime.date &&
      endTime.date &&
      endTime.date < startTime.date
    ) {
      setError(
        "The end date cannot be earlier than the start date."
      );
      return;
    }

    if (
      (startTime.date && !startISO) ||
      (endTime.date && !endISO)
    ) {
      setError(
        "Please enter valid event dates and times."
      );
      return;
    }

    if (
      startISO &&
      endISO &&
      new Date(endISO) <= new Date(startISO)
    ) {
      setError(
        "The event must end after its start time."
      );
      return;
    }

    // --------------------------------------------------
    // Photo Validation
    // --------------------------------------------------

    if (photo) {
      const photoError =
        validateEventImage(photo);

      if (photoError) {
        setError(photoError);
        return;
      }
    }

    // --------------------------------------------------
    // Publish Validation
    // --------------------------------------------------

    if (action === "publicActive") {
      if (!cleanTitle) {
        setError("Event title is required.");
        return;
      }

      if (!categoryID) {
        setError(
          "Please select an event category."
        );
        return;
      }

      if (
        !categories.some(
          (category) =>
            category.categoryID === categoryID
        )
      ) {
        setError(
          "Please select a valid event category."
        );
        return;
      }

      if (!cleanDescription) {
        setError(
          "Event description is required."
        );
        return;
      }

      if (!startISO || !endISO) {
        setError(
          "Start and end dates/times are required and must be valid."
        );
        return;
      }

      if (
        new Date(startISO).getTime() <= Date.now()
      ) {
        setError(
          "Published events must start in the future."
        );
        return;
      }

      if (
        new Date(endISO) <= new Date(startISO)
      ) {
        setError(
          "The event must end after its start time."
        );
        return;
      }

      if (!cleanLocation) {
        setError(
          "Event location is required."
        );
        return;
      }

      if (cost.trim() === "") {
        setError(
          "Event cost is required. Enter 0 for free."
        );
        return;
      }

      if (!hasEventPhoto) {
        setError(
          "Please upload an event photo before publishing."
        );
        return;
      }
    }

    // --------------------------------------------------
    // Event Data
    // --------------------------------------------------

    const eventData = {
      eventTitle: cleanTitle || null,
      categoryID: categoryID || null,
      eventDescription:
        cleanDescription || null,

      eventStartTime: startISO,
      eventEndTime: endISO,

      eventLocation: cleanLocation || null,
      eventCost: parsedCost,

      isFeatured,
      status: action,
    };

    // --------------------------------------------------
    // Save to Supabase
    // --------------------------------------------------

    setSaving(true);

    try {
      if (editEventID) {
        // --------------------------------------------------
        // Update Existing Draft
        // --------------------------------------------------

        if (action !== "drafted") {
          throw new Error(
            "Save your changes before publishing from the event details page."
          );
        }

        await updateEvent(
          editEventID,
          {
            ...eventData,
            status: "drafted",
          },
          {
            photo,
            removeExistingImage,
          }
        );

        // Return to the updated event.
        router.push(eventDetailsHref);
        router.refresh();
      } else {
        // --------------------------------------------------
        // Create New Event
        // --------------------------------------------------

        await createEvent(eventData, photo);

        router.push("/events/my_events");
        router.refresh();
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the event."
      );
    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // Loading State
  // --------------------------------------------------

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <p className={styles.message}>
            {isEditMode
              ? "Loading event details..."
              : "Loading event form..."}
          </p>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // Authentication State
  // --------------------------------------------------

  if (!signedIn) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>
            EVENT MANAGEMENT
          </p>

          <h1 className={styles.title}>
            {isEditMode
              ? "Edit Event"
              : "Create an Event"}
          </h1>

          <p className={styles.subtitle}>
            You must be logged in to manage events.
          </p>

          {error && (
            <p
              role="alert"
              className={styles.error}
            >
              {error}
            </p>
          )}

          <Link
            href="/login"
            className={styles.primaryButton}
          >
            Log In
          </Link>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // Edit Loading / Permission Error
  // --------------------------------------------------

  if (isEditMode && !editLoaded) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>
            EVENT MANAGEMENT
          </p>

          <h1 className={styles.title}>
            Unable to Edit Event
          </h1>

          <p
            role="alert"
            className={styles.error}
          >
            {error ||
              "Unable to load the selected event."}
          </p>

          <Link
            href="/events/my_events"
            className={styles.backLink}
          >
            Back to My Events
          </Link>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // Event Form
  // --------------------------------------------------

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        {/* ----------------------------------------
            Page Header
        ---------------------------------------- */}

        <div className={styles.topRow}>
          <div>
            <p className={styles.eyebrow}>
              EVENT MANAGEMENT
            </p>

            <h1 className={styles.title}>
              {isEditMode
                ? "Edit Event"
                : "Create an Event"}
            </h1>

            <p className={styles.subtitle}>
              {isEditMode
                ? "Update your draft event details and save your changes."
                : "Fill in your event details, then save a draft or publish your event."}
            </p>
          </div>

          <Link
            href={eventDetailsHref}
            className={styles.backLink}
          >
            {isEditMode
              ? "Back to Event"
              : "Back to My Events"}
          </Link>
        </div>

        {/* ----------------------------------------
            Event Form Fields
        ---------------------------------------- */}

        <div className={styles.form}>
          {/* ----------------------------------------
              Row 1: Event Title
          ---------------------------------------- */}

          <div className={styles.field}>
            <label
              htmlFor="eventTitle"
              className={styles.label}
            >
              Event Title
            </label>

            <input
              id="eventTitle"
              type="text"
              className={styles.input}
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              placeholder="Enter event title"
              onChange={(event) =>
                setTitle(event.target.value)
              }
              disabled={saving}
            />

            <p className={styles.helpText}>
              {title.length}/{MAX_TITLE_LENGTH} characters
            </p>
          </div>

          {/* ----------------------------------------
              Row 2: Category / Event Cost
          ---------------------------------------- */}

          <div className={styles.twoColumns}>
            {/* Category */}

            <div className={styles.field}>
              <label
                htmlFor="category"
                className={styles.label}
              >
                Category
              </label>

              <select
                id="category"
                className={styles.input}
                value={categoryID}
                onChange={(event) =>
                  setCategoryID(event.target.value)
                }
                disabled={saving}
              >
                <option value="">
                  Select a category
                </option>

                {categories.map((category) => (
                  <option
                    key={category.categoryID}
                    value={category.categoryID}
                  >
                    {category.categoryName}
                  </option>
                ))}
              </select>

              {categoryError && (
                <p
                  role="alert"
                  className={styles.error}
                >
                  {categoryError}{" "}

                  <button
                    type="button"
                    className={styles.retryButton}
                    onClick={() => void load()}
                    disabled={saving}
                  >
                    Retry
                  </button>
                </p>
              )}
            </div>

            {/* Event Cost */}

            <div className={styles.field}>
              <label
                htmlFor="eventCost"
                className={styles.label}
              >
                Event Cost
              </label>

              <div className={styles.costField}>
                <span className={styles.costSymbol}>
                  $
                </span>

                <input
                  id="eventCost"
                  type="text"
                  inputMode="decimal"
                  className={styles.costInput}
                  value={cost}
                  placeholder="0.00"
                  maxLength={10}
                  disabled={saving}
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    if (
                      /^\d*(\.\d{0,2})?$/.test(value)
                    ) {
                      setCost(value);
                    }
                  }}
                />
              </div>

              <p className={styles.helpText}>
                Enter 0 for a free event. Maximum:
                $9,999.99.
              </p>
            </div>
          </div>

          {/* ----------------------------------------
              Row 3: Event Description
          ---------------------------------------- */}

          <div className={styles.field}>
            <label
              htmlFor="eventDescription"
              className={styles.label}
            >
              Event Description
            </label>

            <textarea
              id="eventDescription"
              className={styles.textarea}
              value={description}
              maxLength={MAX_DESCRIPTION_LENGTH}
              placeholder="Describe your event..."
              rows={6}
              disabled={saving}
              onChange={(event) =>
                setDescription(event.target.value)
              }
            />

            <p className={styles.helpText}>
              {description.length}/{MAX_DESCRIPTION_LENGTH} characters
            </p>
          </div>

          {/* ----------------------------------------
              Row 4: Start Date / End Date
          ---------------------------------------- */}

          <div className={styles.twoColumns}>
            <EventDateField
              label="Event Start Date"
              value={startTime}
              onChange={handleStartDateChange}
              minDate={getTodayLocal()}
            />

            <EventDateField
              label="Event End Date"
              value={endTime}
              onChange={setEndTime}
              minDate={
                startTime.date &&
                startTime.date > getTodayLocal()
                  ? startTime.date
                  : getTodayLocal()
              }
            />
          </div>

          {/* ----------------------------------------
              Row 5: Start Time / End Time
          ---------------------------------------- */}

          <div className={styles.twoColumns}>
            <EventTimeField
              label="Event Start Time"
              value={startTime}
              onChange={setStartTime}
            />

            <EventTimeField
              label="Event End Time"
              value={endTime}
              onChange={setEndTime}
            />
          </div>

          {/* ----------------------------------------
              Row 6: Location / Featured Post
          ---------------------------------------- */}

          <div className={styles.twoColumns}>
            {/* Event Location */}

            <div className={styles.field}>
              <label
                htmlFor="eventLocation"
                className={styles.label}
              >
                Event Location
              </label>

              <AddressAutocomplete
                value={location}
                onChange={setLocation}
                disabled={saving}
              />
            </div>

            {/* Featured Post */}

            <div className={styles.field}>
              <span className={styles.label}>
                Featured Post?
              </span>

              <div className={styles.featureRow}>
                <p className={styles.helpText}>
                  Mark this event as featured.
                </p>

                <label className={styles.switchWrap}>
                  <input
                    id="featured"
                    type="checkbox"
                    role="switch"
                    aria-label="Featured Post"
                    checked={isFeatured}
                    disabled={saving}
                    onChange={(event) =>
                      setIsFeatured(
                        event.target.checked
                      )
                    }
                  />

                  <span
                    className={styles.switchSlider}
                    aria-hidden="true"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* ----------------------------------------
              Row 7: Event Photo Upload
          ---------------------------------------- */}

          <div className={styles.field}>
            <label
              htmlFor="eventPhoto"
              className={styles.label}
            >
              Event Photo
            </label>

            <div className={styles.uploadBox}>
              {displayedPhotoURL ? (
                <>
                  {/* Image Preview */}

                  <img
                    src={displayedPhotoURL}
                    alt="Event photo preview"
                    className={styles.photoPreview}
                  />

                  {/* Image Details */}

                  <div className={styles.photoDetails}>
                    <strong>
                      {photo?.name ??
                        "Current event photo"}
                    </strong>

                    {photo && (
                      <p className={styles.helpText}>
                        {(
                          photo.size /
                          (1024 * 1024)
                        ).toFixed(2)}{" "}
                        MB
                      </p>
                    )}
                  </div>

                  {/* Change / Crop / Remove */}

                  <div className={styles.photoActions}>
                    {/* Change Photo */}

                    <label
                      htmlFor="eventPhoto"
                      className={styles.changePhotoButton}
                      aria-disabled={saving}
                    >
                      Change Photo
                    </label>

                    {/* Crop Photo */}

                    <button
                      type="button"
                      className={styles.cropPhotoButton}
                      disabled={
                        saving || !originalPhoto
                      }
                      onClick={handleRecropPhoto}
                    >
                      Crop
                    </button>

                    {/* Remove Photo */}

                    <button
                      type="button"
                      className={styles.removePhotoButton}
                      disabled={saving}
                      onClick={handleRemovePhoto}
                    >
                      Remove Photo
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Empty Upload State */}

                  <div className={styles.uploadIcon}>
                    +
                  </div>

                  <strong>
                    Upload an Event Photo
                  </strong>

                  <p className={styles.helpText}>
                    JPG, PNG, or WebP. Maximum file
                    size: 5 MB.
                  </p>

                  <label
                    htmlFor="eventPhoto"
                    className={styles.changePhotoButton}
                    aria-disabled={saving}
                  >
                    Choose Photo
                  </label>
                </>
              )}

              {/* Hidden File Input */}

              <input
                ref={photoInputRef}
                id="eventPhoto"
                type="file"
                accept={EVENT_IMAGE_ACCEPT}
                className={styles.hiddenFileInput}
                onChange={handlePhotoChange}
                onClick={(event) => {
                  // Allow choosing the same file again.
                  event.currentTarget.value = "";
                }}
                disabled={saving}
              />
            </div>
          </div>

          {/* ----------------------------------------
              Error Message
          ---------------------------------------- */}

          {error && (
            <p
              role="alert"
              className={styles.error}
            >
              {error}
            </p>
          )}

          {/* ----------------------------------------
              Action Buttons
          ---------------------------------------- */}

          <div className={styles.actions}>
            {/* Cancel / Back */}

            <Link
              href={eventDetailsHref}
              className={styles.ghostButton}
              aria-disabled={saving}
              onClick={(event) => {
                if (saving) {
                  event.preventDefault();
                }
              }}
            >
              Cancel
            </Link>

            {isEditMode ? (
              /* Save Existing Draft */

              <button
                type="button"
                className={styles.primaryButton}
                disabled={saving || !!photoToCrop}
                onClick={() =>
                  void handleSave("drafted")
                }
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            ) : (
              <>
                {/* Save New Draft */}

                <button
                  type="button"
                  className={styles.secondaryAction}
                  disabled={saving || !!photoToCrop}
                  onClick={() =>
                    void handleSave("drafted")
                  }
                >
                  {saving
                    ? "Saving..."
                    : "Save as Draft"}
                </button>

                {/* Publish New Event */}

                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={saving || !!photoToCrop}
                  onClick={() =>
                    void handleSave("publicActive")
                  }
                >
                  {saving
                    ? "Saving..."
                    : "Publish Event"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ----------------------------------------
          Image Cropping Modal
      ---------------------------------------- */}

      {photoToCrop && (
        <EventImageCropper
          file={photoToCrop}
          onApply={handleApplyCrop}
          onCancel={handleCancelCrop}
        />
      )}
    </main>
  );
}

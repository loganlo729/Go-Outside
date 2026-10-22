
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  createEvent,
  eventClient,
  getEventCategories,
} from "../../../services/events";

import type { CategoryRecord } from "../../../types/event";

import styles from "./CreateEvent.module.css";

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
// Convert Local Date/Time to ISO
// --------------------------------------------------

function toISOString(value: EventDateTime): string | null {
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

  const [year, month, day] = value.date.split("-").map(Number);

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
// Date Field
// --------------------------------------------------

function EventDateField({
  label,
  value,
  onChange,
}: DateTimeInputProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {label}

        <input
          type="date"
          aria-label={label}
          className={styles.dateInput}
          value={value.date}
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

        <span className={styles.timeSeparator}>:</span>

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
              period: event.target.value as "AM" | "PM",
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
// Create Event Page
// --------------------------------------------------

export default function CreateEventPage() {
  const router = useRouter();

  // Event fields

  const [title, setTitle] = useState("");
  const [categoryID, setCategoryID] = useState("");
  const [description, setDescription] = useState("");

  const [startTime, setStartTime] = useState<EventDateTime>(
    emptyDateTime
  );

  const [endTime, setEndTime] = useState<EventDateTime>(
    emptyDateTime
  );

  const [location, setLocation] = useState("");
  const [cost, setCost] = useState("0");
  const [isFeatured, setIsFeatured] = useState(false);

  // UI state

  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  // --------------------------------------------------
  // Load User and Categories
  // --------------------------------------------------

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setCategoryError("");

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
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to initialize the event form."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // --------------------------------------------------
  // Save Draft or Publish
  // --------------------------------------------------

  async function handleSave(
    action: "drafted" | "publicActive"
  ) {
    if (saving) {
      return;
    }

    setError("");

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanLocation = location.trim();

    const startISO = toISOString(startTime);
    const endISO = toISOString(endTime);

    const parsedCost = cost.trim() === "" ? 0 : Number(cost);

    // Cost validation

    if (
      !Number.isFinite(parsedCost) ||
      parsedCost < 0 ||
      !/^\d+(\.\d{1,2})?$/.test(
        cost.trim() === "" ? "0" : cost.trim()
      ) ||
      parsedCost > 9999999999.99
    ) {
      setError(
        "Enter a valid cost of $0 or greater (up to two decimal places)."
      );
      return;
    }

    // Title length validation

    if (cleanTitle.length > 150) {
      setError("Event title cannot exceed 150 characters.");
      return;
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
        setError("Please select an event category.");
        return;
      }

      if (
        !categories.some(
          (category) => category.categoryID === categoryID
        )
      ) {
        setError("Please select a valid event category.");
        return;
      }

      if (!cleanDescription) {
        setError("Event description is required.");
        return;
      }

      if (!startISO || !endISO) {
        setError(
          "Start and end dates/times are required and must be valid."
        );
        return;
      }

      if (new Date(endISO) <= new Date(startISO)) {
        setError("The event must end after its start time.");
        return;
      }

      if (!cleanLocation) {
        setError("Event location is required.");
        return;
      }

      if (cost.trim() === "") {
        setError("Event cost is required. Enter 0 for free.");
        return;
      }
    }

    // --------------------------------------------------
    // Save to Supabase
    // --------------------------------------------------

    setSaving(true);

    try {
      await createEvent({
        eventTitle: cleanTitle || null,
        categoryID: categoryID || null,
        eventDescription: cleanDescription || null,

        eventStartTime: startISO,
        eventEndTime: endISO,

        eventLocation: cleanLocation || null,
        eventCost: parsedCost,

        isFeatured,
        status: action,
      });

      router.push("/events/my_events");
      router.refresh();
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
            Loading event form...
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
            Create an Event
          </h1>

          <p className={styles.subtitle}>
            You must be logged in to create an event.
          </p>

          {error && (
            <p role="alert" className={styles.error}>
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
  // Event Form
  // --------------------------------------------------

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        {/* Page Header */}

        <div className={styles.topRow}>
          <div>
            <p className={styles.eyebrow}>
              EVENT MANAGEMENT
            </p>

            <h1 className={styles.title}>
              Create an Event
            </h1>

            <p className={styles.subtitle}>
              Fill in your event details, then save a draft
              or publish your event.
            </p>
          </div>

          <Link
            href="/events/my_events"
            className={styles.backLink}
          >
            Back to My Events
          </Link>
        </div>

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
              maxLength={150}
              placeholder="Enter event title"
              onChange={(event) =>
                setTitle(event.target.value)
              }
            />

            <p className={styles.helpText}>
              {title.length}/150 characters
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
                <p role="alert" className={styles.error}>
                  {categoryError}{" "}

                  <button
                    type="button"
                    className={styles.retryButton}
                    onClick={() => void load()}
                  >
                    Retry
                  </button>
                </p>
              )}
            </div>

            {/* Cost */}

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
                  type="number"
                  min="0"
                  step="0.01"
                  className={styles.costInput}
                  value={cost}
                  onChange={(event) =>
                    setCost(event.target.value)
                  }
                />
              </div>

              <p className={styles.helpText}>
                Enter 0 for a free event.
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
              placeholder="Describe your event..."
              rows={6}
              onChange={(event) =>
                setDescription(event.target.value)
              }
            />
          </div>

          {/* ----------------------------------------
              Row 4: Start Date / End Date
          ---------------------------------------- */}

          <div className={styles.twoColumns}>
            <EventDateField
              label="Event Start Date"
              value={startTime}
              onChange={setStartTime}
            />

            <EventDateField
              label="Event End Date"
              value={endTime}
              onChange={setEndTime}
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

              <input
                id="eventLocation"
                type="text"
                className={styles.input}
                value={location}
                placeholder="Enter location or address"
                onChange={(event) =>
                  setLocation(event.target.value)
                }
              />
            </div>

            {/* Featured Post - aligned with Location */}

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
                    onChange={(event) =>
                      setIsFeatured(event.target.checked)
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
              Row 7: Event Photo
          ---------------------------------------- */}

          <div className={styles.field}>
            <span className={styles.label}>
              Event Photo
            </span>

            <div className={styles.uploadBox}>
              <div className={styles.uploadIcon}>
                +
              </div>

              <strong>
                Photo Upload
              </strong>

              <p className={styles.helpText}>
                Event image uploads are coming soon.
              </p>

              <button
                type="button"
                disabled
                className={styles.secondaryButton}
              >
                Choose Photo
              </button>
            </div>
          </div>

          {/* Error Message */}

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
            <Link
              href="/events/my_events"
              className={styles.ghostButton}
            >
              Cancel
            </Link>

            <button
              type="button"
              className={styles.secondaryAction}
              disabled={saving}
              onClick={() =>
                void handleSave("drafted")
              }
            >
              {saving ? "Saving..." : "Save as Draft"}
            </button>

            <button
              type="button"
              className={styles.primaryButton}
              disabled={saving}
              onClick={() =>
                void handleSave("publicActive")
              }
            >
              {saving ? "Saving..." : "Publish Event"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

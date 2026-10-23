
// --------------------------------------------------
// Event Validation Constants
// --------------------------------------------------

export const MAX_TITLE = 150;
export const MAX_DESCRIPTION = 2000;
export const MAX_COST = 9999.99;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// --------------------------------------------------
// Types
// --------------------------------------------------

export type EventDateTime = {
  date: string;
  hour: string;
  minute: string;
  period: "AM" | "PM";
};

// --------------------------------------------------
// Default Date and Time
// --------------------------------------------------

export const emptyDateTime = (): EventDateTime => ({
  date: "",
  hour: "12",
  minute: "00",
  period: "PM",
});

// --------------------------------------------------
// Get Local Date (YYYY-MM-DD)
// --------------------------------------------------

export function localDate(date = new Date()): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// --------------------------------------------------
// Convert Event Date / Time to ISO
// --------------------------------------------------

export function toISO(
  value: EventDateTime
): string | null {
  // Check date format

  if (
    !value.date ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.date)
  ) {
    return null;
  }

  // Extract date values

  const [year, month, day] = value.date
    .split("-")
    .map(Number);

  // Validate hour, minute, and period

  const inputHour = Number(value.hour);
  const minute = Number(value.minute);

  if (
    !Number.isInteger(inputHour) ||
    inputHour < 1 ||
    inputHour > 12 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59 ||
    !["AM", "PM"].includes(value.period)
  ) {
    return null;
  }

  // Convert 12-hour time to 24-hour time

  let hour = inputHour % 12;

  if (value.period === "PM") {
    hour += 12;
  }

  // Create local Date object

  const date = new Date(
    year,
    month - 1,
    day,
    hour,
    minute
  );

  // Ensure JavaScript did not automatically adjust
  // an invalid date or nonexistent local time.

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date.toISOString();
}

// --------------------------------------------------
// Validate Event Cost
// --------------------------------------------------

export function validateCost(
  text: string
): string | null {
  const normalized = text.trim() || "0";

  // Allow whole dollar amounts or up to two decimals.

  const validFormat = /^\d+(\.\d{1,2})?$/.test(
    normalized
  );

  const amount = Number(normalized);

  if (
    !validFormat ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > MAX_COST
  ) {
    return "Cost must be $0–$9,999.99, with up to two decimal places.";
  }

  return null;
}

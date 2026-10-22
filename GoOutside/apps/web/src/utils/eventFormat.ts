
/* --------------------------------------------------
   Format Event Date
-------------------------------------------------- */

export function formatEventDate(value: string | null) {
  if (!value) {
    return "Date to be announced";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date to be announced"
    : date.toLocaleString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

/* --------------------------------------------------
   Format Event Cost
-------------------------------------------------- */

export function formatEventCost(value: number | null) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "Price unavailable";
  }

  return Number(value) === 0
    ? "Free"
    : `$${Number(value).toFixed(2)}`;
}

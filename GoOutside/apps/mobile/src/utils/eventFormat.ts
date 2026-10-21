export function formatEventDate(date: string | null): string {
  if (!date) return "Date to be announced";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Date to be announced";
  return parsed.toLocaleString("en-US", {
    weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function formatEventCost(cost: number | null): string {
  if (cost == null) return "Price unavailable";
  const amount = Number(cost);
  if (!Number.isFinite(amount)) return "Price unavailable";
  return amount === 0 ? "Free" : `$${amount.toFixed(2)}`;
}
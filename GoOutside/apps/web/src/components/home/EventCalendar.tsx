
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseClient } from "../../lib/supabase/client";

const supabase = getSupabaseClient();

type CalendarEvent = {
  eventID: string;
  eventTitle: string;
  eventStartTime: string;
  eventEndTime?: string | null;
  isHost: boolean;
  isRSVP: boolean;
};

type Filter = "all" | "created" | "rsvp";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getEventDate(event: CalendarEvent): Date | null {
  if (!event.eventStartTime) return null;

  const date = new Date(event.eventStartTime);

  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function EventCalendar() {
  const router = useRouter();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState(() =>
    dateKey(new Date())
  );

  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const controller = new AbortController();

    async function loadEvents() {
      setLoading(true);
      setError(null);

      try {
        // Get the authenticated user directly from Supabase
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session) {
          throw new Error("Not signed in");
        }

        const userID = session.user.id;

        console.log("CALENDAR USER ID:", userID);

        // Fetch events created by or RSVP'd to by this user
        const response = await fetch(
          `/api/users/${encodeURIComponent(userID)}/calendar`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            signal: controller.signal,
            cache: "no-store",
          }
        );

        const responseBody = await response.text();

        console.log("CALENDAR API STATUS:", response.status);

        if (!response.ok) {
          throw new Error(
            `Calendar API failed (${response.status}): ${responseBody}`
          );
        }

        const data: CalendarEvent[] = JSON.parse(responseBody);

        if (!Array.isArray(data)) {
          throw new Error("Invalid calendar response");
        }

        console.log("CALENDAR RESPONSE:", data);

        console.table(
          data.map((event) => ({
            title: event.eventTitle,
            start: event.eventStartTime,
            parsed: getEventDate(event)?.toString(),
            isHost: event.isHost,
            isRSVP: event.isRSVP,
          }))
        );

        // Remove duplicate events by eventID
        const uniqueEvents = Array.from(
          new Map(
            data.map((event) => [event.eventID, event])
          ).values()
        );

        if (!controller.signal.aborted) {
          setEvents(uniqueEvents);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error("Calendar error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load calendar"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadEvents();

    return () => controller.abort();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filter === "created") return event.isHost;
      if (filter === "rsvp") return event.isRSVP;
      return true;
    });
  }, [events, filter]);

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();

    for (const event of filteredEvents) {
      const date = getEventDate(event);

      if (!date) continue;

      const key = dateKey(date);
      const existing = grouped.get(key) ?? [];

      existing.push(event);
      grouped.set(key, existing);
    }

    for (const dayEvents of grouped.values()) {
      dayEvents.sort((a, b) => {
        const aTime = getEventDate(a)?.getTime() ?? 0;
        const bTime = getEventDate(b)?.getTime() ?? 0;

        return aTime - bTime;
      });
    }

    return grouped;
  }, [filteredEvents]);

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];

  const firstDay = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const cells = Array.from(
    {
      length:
        Math.ceil((firstDay + daysInMonth) / 7) * 7,
    },
    (_, index) => index - firstDay + 1
  );

  function changeMonth(offset: number) {
    const next = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + offset,
      1
    );

    setCurrentMonth(next);
    setSelectedDate(dateKey(next));
  }

  function formatTime(event: CalendarEvent) {
    const date = getEventDate(event);

    if (!date) return "Time unavailable";

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <section className="w-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            My Calendar
          </h2>

          <p className="text-sm text-gray-500">
            Events you've created or RSVP'd to
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["created", "Created"],
              ["rsvp", "RSVP'd"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                filter === value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Month Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label="Previous month"
          className="rounded-lg border px-3 py-2 hover:bg-gray-100"
        >
          &lt;
        </button>

        <h3 className="text-lg font-semibold text-gray-900">
          {currentMonth.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </h3>

        <button
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="Next month"
          className="rounded-lg border px-3 py-2 hover:bg-gray-100"
        >
          &gt;
        </button>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4 text-sm text-gray-600">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          Created
        </span>

        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          RSVP'd
        </span>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-semibold text-gray-500 sm:text-sm"
          >
            {day}
          </div>
        ))}

        {cells.map((day, index) => {
          if (day < 1 || day > daysInMonth) {
            return (
              <div
                key={`empty-${index}`}
                className="min-h-16 sm:min-h-24"
              />
            );
          }

          const date = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            day
          );

          const key = dateKey(date);
          const dayEvents = eventsByDate.get(key) ?? [];

          const hasHosted = dayEvents.some(
            (event) => event.isHost
          );

          const hasRSVP = dayEvents.some(
            (event) => event.isRSVP
          );

          const isSelected = selectedDate === key;
          const isToday = key === dateKey(new Date());

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(key)}
              aria-pressed={isSelected}
              className={`flex min-h-16 flex-col items-center rounded-lg border p-2 transition sm:min-h-24 ${
                isSelected
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                  isToday
                    ? "bg-gray-900 font-semibold text-white"
                    : "text-gray-800"
                }`}
              >
                {day}
              </span>

              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {hasHosted && (
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                )}

                {hasRSVP && (
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                )}
              </div>

              {dayEvents.length > 0 && (
                <span className="mt-1 text-xs text-gray-500">
                  {dayEvents.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Events */}
      <div className="mt-6 border-t border-gray-200 pt-5">
        <h3 className="mb-3 text-lg font-semibold text-gray-900">
          {new Date(
            `${selectedDate}T12:00:00`
          ).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h3>

        {loading ? (
          <p className="text-sm text-gray-500">
            Loading events...
          </p>
        ) : error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : selectedEvents.length === 0 ? (
          <p className="text-sm text-gray-500">
            No events scheduled for this day.
          </p>
        ) : (
          <div className="space-y-3">
            {selectedEvents.map((event) => (
              <button
                key={event.eventID}
                type="button"
                onClick={() =>
                  router.push(`/events/${event.eventID}`)
                }
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 p-4 text-left transition hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {event.eventTitle}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {formatTime(event)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {event.isHost && (
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                      Created
                    </span>
                  )}

                  {event.isRSVP && (
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                      RSVP'd
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

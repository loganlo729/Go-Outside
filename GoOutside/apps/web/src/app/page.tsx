"use client";

import { useState } from "react";
import { getSupabaseClient } from "../lib/supabase";

// Generic types for database rows
type EventRow = Record<string, unknown>;
type UserRow = Record<string, unknown>;

export default function Home() {
  // Event data and loading status
  const [events, setEvents] = useState<EventRow[]>([]);
  const [status, setStatus] = useState("idle");

  // User data and loading status
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userStatus, setUserStatus] = useState("idle");

  // Fetch all events from Supabase
  async function loadEvents() {
    setStatus("loading");

    const response = await fetch("/api/events");
    const data = await response.json();

    if (!response.ok) {
      setStatus(`error: ${data.message ?? "Failed to load events"}`);
      return;
    }

    setEvents(data ?? []);
    setStatus("loaded");
  }

  // Fetch all users from Supabase
  async function loadUsers() {
    setUserStatus("loading");

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("User").select("*");

    if (error) {
      setUserStatus(`error: ${error.message}`);
      return;
    }

    setUsers(data ?? []);
    setUserStatus("loaded");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16 sm:px-10">
      {/* Page heading */}
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
        Go Outside
      </p>
      <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-tight text-foreground sm:text-6xl">
        Find your next reason to step outside.
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">
        Discover outdoor events and communities around you.
      </p>

      {/* Database loading buttons */}
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={loadEvents}
          disabled={status === "loading"}
          className="w-fit rounded-md bg-emerald-800 px-5 py-3 font-medium text-white hover:bg-emerald-900 disabled:opacity-60"
        >
          {status === "loading" ? "Loading events..." : "Load events"}
        </button>

        <button
          type="button"
          onClick={loadUsers}
          disabled={userStatus === "loading"}
          className="w-fit rounded-md border border-emerald-800 px-5 py-3 font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-60"
        >
          {userStatus === "loading" ? "Loading users..." : "Load users"}
        </button>
      </div>

      {/* Display event loading errors */}
      {status.startsWith("error:") && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {status.slice("error: ".length)}
        </p>
      )}

      {/* Display message if no events exist */}
      {status === "loaded" && events.length === 0 && (
        <p className="mt-6 text-zinc-600">No events found.</p>
      )}

      {/* Display event data */}
      {events.length > 0 && (
        <ul className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
          {events.map((event, index) => (
            <li key={String(event.id ?? index)} className="py-5">
              <dl className="grid gap-3 sm:grid-cols-2">
                {Object.entries(event).map(([column, value]) => (
                  <div key={column}>
                    <dt className="text-xs font-semibold uppercase text-zinc-500">
                      {column}
                    </dt>
                    <dd className="mt-1 break-words text-sm text-zinc-900">
                      {typeof value === "string"
                        ? value
                        : JSON.stringify(value) ?? String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}

      {/* Display user loading errors */}
      {userStatus.startsWith("error:") && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {userStatus.slice("error: ".length)}
        </p>
      )}

      {/* Display message if no users exist */}
      {userStatus === "loaded" && users.length === 0 && (
        <p className="mt-6 text-zinc-600">No users found.</p>
      )}

      {/* Display user data */}
      {users.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-foreground">Users</h2>

          <ul className="mt-4 divide-y divide-zinc-200 border-y border-zinc-200">
            {users.map((user, index) => (
              <li key={String(user.id ?? index)} className="py-5">
                <dl className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(user).map(([column, value]) => (
                    <div key={column}>
                      <dt className="text-xs font-semibold uppercase text-zinc-500">
                        {column}
                      </dt>
                      <dd className="mt-1 break-words text-sm text-zinc-900">
                        {typeof value === "string"
                          ? value
                          : JSON.stringify(value) ?? String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
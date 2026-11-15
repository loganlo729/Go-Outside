import EventCalendar from "./EventCalendar";
import EventSummaryCard from "./EventSummaryCard";
import { createClient } from "../../lib/supabase/server";
import styles from "./UserHome.module.css";

export default async function UserHome() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date().toISOString();

  let publishedCount = 0;
  let rsvpCount = 0;

  if (user) {
    // Count upcoming events created by the user.
    const { count: createdCount, error: createdError } =
      await supabase
        .from("Event")
        .select("eventID", { count: "exact", head: true })
        .eq("userID", user.id)
        .gte("eventStartTime", now);

    if (createdError) {
      console.error("Failed to count created events:", createdError);
    }

    publishedCount = createdCount ?? 0;

    // Get events the user RSVP'd to.
    const { data: rsvps, error: rsvpError } = await supabase
      .from("RSVP")
      .select("eventID")
      .eq("userID", user.id);

    if (rsvpError) {
      console.error("Failed to load RSVPs:", rsvpError);
    }

    const eventIDs = [
      ...new Set((rsvps ?? []).map((rsvp) => rsvp.eventID)),
    ];

    if (eventIDs.length > 0) {
      const { count, error } = await supabase
        .from("Event")
        .select("eventID", { count: "exact", head: true })
        .in("eventID", eventIDs)
        .gte("eventStartTime", now);

      if (error) {
        console.error("Failed to count RSVP events:", error);
      }

      rsvpCount = count ?? 0;
    }
  }

  return (
    <main className={styles.home}>
      <section className={styles.welcome}>
        <h1>Welcome Back!</h1>
        <p>Here's what's coming up!</p>
      </section>

      <section className={styles.summaryGrid}>
        <EventSummaryCard
          title="Upcoming Published Events"
          count={publishedCount}
          description="Events you're hosting"
          //icon="📅"
          icon = ""
        />

        <EventSummaryCard
          title="Upcoming RSVP'd Events"
          count={rsvpCount}
          description="Events you're attending"
          //icon="✅"
          icon = ""
        />
      </section>

      <section className={styles.calendarSection}>
        <EventCalendar />
      </section>
    </main>
  );
}

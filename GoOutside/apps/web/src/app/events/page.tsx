// redirect to All Events
import { redirect } from "next/navigation";

export default function EventsPage() {
  redirect("/events/all_events");
}

import { Suspense, type ReactNode } from "react";
import EventsNav from "../../components/events/EventsNav";

export default function EventsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div>
      <Suspense fallback={null}>
        <EventsNav />
      </Suspense>

      <Suspense fallback={<p>Loading events...</p>}>
        {children}
      </Suspense>
    </div>
  );
}
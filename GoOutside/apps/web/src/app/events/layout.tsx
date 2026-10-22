import type { ReactNode } from "react";
import EventsNav from "../../components/events/EventsNav";

export default function EventsLayout({ children }: { children: ReactNode }) {
  return <div><EventsNav />{children}</div>;
}

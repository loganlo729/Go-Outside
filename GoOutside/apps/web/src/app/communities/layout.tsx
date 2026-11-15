import type { ReactNode } from "react";

// Navigation
import CommunitiesNav from "../../components/communities/CommunitiesNav";

// --------------------------------------------------
// Communities Layout
// --------------------------------------------------

export default function CommunitiesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <CommunitiesNav />
      {children}
    </>
  );
}

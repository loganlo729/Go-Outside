import type { Metadata } from "next";
import "./globals.css";

import Navbar from "../components/NavBar";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";

export const metadata: Metadata = {
  title: "Go Outside",
  description:
    "Discover outdoor events and communities around you.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Sidebar />

          <main className="app-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
/* Main application layout 
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="site">
          <Navbar />

          <main className="site-content">
            {children}
          </main>

          <Footer />
        </div>
      </body>
    </html>
  );
}
  */
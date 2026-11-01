
// Next.js metadata
import type { Metadata } from "next";

// Global styles
import "./globals.css";

// Layout components
import Navbar from "../components/NavBar";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";

// Site metadata
export const metadata: Metadata = {
  title: "Go Outside",
  description:
    "Discover outdoor events and communities around you.",
};

// Root layout
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="site">
          {/* Navigation */}
          <Navbar />

          {/* Page content */}
          <main className="site-content">
            {children}
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

import Navbar from "../components/NavBar";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Go Outside",
  description:
    "Discover outdoor events and communities around you.",
};

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
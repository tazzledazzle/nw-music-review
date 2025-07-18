import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { GenreProvider } from "@/lib/context/genre-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Venue Explorer - Discover Music Venues in the Pacific Northwest",
  description: "Find music venues, shows, and artists across Washington, Oregon, Idaho, and British Columbia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get genre from request headers (set by middleware)
  const headersList = headers();
  const genreFilter = headersList.get("x-genre-filter");
  
  // Update metadata based on genre
  if (genreFilter) {
    metadata.title = `${genreFilter.charAt(0).toUpperCase() + genreFilter.slice(1)} Music Venues - Venue Explorer`;
    metadata.description = `Discover ${genreFilter} music venues, shows, and artists across Washington, Oregon, Idaho, and British Columbia`;
  }
  
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GenreProvider initialGenre={genreFilter}>
          {genreFilter && (
            <div className="bg-black text-white text-center py-1 text-sm">
              Browsing {genreFilter.toUpperCase()} music venues and events
            </div>
          )}
          {children}
        </GenreProvider>
      </body>
    </html>
  );
}

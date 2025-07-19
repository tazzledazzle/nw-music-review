import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { GenreProvider } from "@/lib/context/genre-context";
import { AuthProvider } from "@/lib/context/auth-context";
import ResponsiveNavbar from "@/components/navigation/ResponsiveNavbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
});

// Base metadata that will be extended by individual pages
export const metadata: Metadata = {
  title: {
    template: '%s | Venue Explorer',
    default: "Venue Explorer - Discover Music Venues in the Pacific Northwest",
  },
  description: "Find music venues, shows, and artists across Washington, Oregon, Idaho, and British Columbia",
  keywords: ["music venues", "concerts", "live music", "Pacific Northwest", "Washington", "Oregon", "Idaho", "British Columbia"],
  authors: [{ name: "Venue Explorer Team" }],
  creator: "Venue Explorer",
  publisher: "Venue Explorer",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://venue-explorer.com'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/',
    },
  },
  openGraph: {
    title: "Venue Explorer - Discover Music Venues in the Pacific Northwest",
    description: "Find music venues, shows, and artists across Washington, Oregon, Idaho, and British Columbia",
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://venue-explorer.com',
    siteName: "Venue Explorer",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Venue Explorer - Discover Music Venues in the Pacific Northwest",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Venue Explorer - Discover Music Venues in the Pacific Northwest",
    description: "Find music venues, shows, and artists across Washington, Oregon, Idaho, and British Columbia",
    images: ["/twitter-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

// Viewport configuration for responsive design and mobile optimization
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get genre from request headers (set by middleware)
  const headersList = await headers();
  const genreFilter = headersList.get("x-genre-filter");
  
  // Update metadata based on genre
  if (genreFilter) {
    metadata.title = {
      template: `%s | ${genreFilter.charAt(0).toUpperCase() + genreFilter.slice(1)} Music - Venue Explorer`,
      default: `${genreFilter.charAt(0).toUpperCase() + genreFilter.slice(1)} Music Venues - Venue Explorer`,
    };
    metadata.description = `Discover ${genreFilter} music venues, shows, and artists across Washington, Oregon, Idaho, and British Columbia`;
    
    if (metadata.openGraph) {
      metadata.openGraph.title = `${genreFilter.charAt(0).toUpperCase() + genreFilter.slice(1)} Music Venues - Venue Explorer`;
      metadata.openGraph.description = `Discover ${genreFilter} music venues, shows, and artists across Washington, Oregon, Idaho, and British Columbia`;
    }
    
    if (metadata.twitter) {
      metadata.twitter.title = `${genreFilter.charAt(0).toUpperCase() + genreFilter.slice(1)} Music Venues - Venue Explorer`;
      metadata.twitter.description = `Discover ${genreFilter} music venues, shows, and artists across Washington, Oregon, Idaho, and British Columbia`;
    }
  }
  
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="msapplication-TileColor" content="#da532c" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <GenreProvider initialGenre={genreFilter}>
            {genreFilter && (
              <div className="bg-black text-white text-center py-1 text-sm">
                Browsing {genreFilter.toUpperCase()} music venues and events
              </div>
            )}
            <ResponsiveNavbar />
            <div className="pt-16">
              {children}
            </div>
          </GenreProvider>
        </AuthProvider>
        
        {/* Structured data for organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Venue Explorer",
              "url": process.env.NEXT_PUBLIC_BASE_URL || "https://venue-explorer.com",
              "logo": `${process.env.NEXT_PUBLIC_BASE_URL || "https://venue-explorer.com"}/logo.png`,
              "description": "Discover music venues, shows, and artists across Washington, Oregon, Idaho, and British Columbia",
              "sameAs": [
                "https://twitter.com/venueexplorer",
                "https://facebook.com/venueexplorer",
                "https://instagram.com/venueexplorer"
              ]
            })
          }}
        />
      </body>
    </html>
  );
}

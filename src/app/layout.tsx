import type { Metadata } from "next";
import { Geist, Geist_Mono, Anton, Barlow_Condensed, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Poster-inspired display faces, used sparingly (movie titles, credit-block
// labels) rather than site-wide -- see the Movie Detail Hero decision entry
// in DECISIONS.md for why these three specifically.
const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
});

// Kept specific (and under ~160 chars) so search engines use it as the
// homepage snippet instead of pulling a movie synopsis from the hero carousel.
const SITE_DESCRIPTION =
  "The source for kung fu cinema, built by martial arts fans. Rate the films, rank the fight scenes, trace who trained whom, and find your next favorite.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "KUNG FU SAUCE",
    template: "%s | KUNG FU SAUCE",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: "KUNG FU SAUCE",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} ${barlowCondensed.variable} ${sourceSerif4.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-neutral-950 font-sans text-neutral-100">
        <Navbar />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}

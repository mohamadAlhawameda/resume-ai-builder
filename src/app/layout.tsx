import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Cairo } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import CommandPalette from "@/components/CommandPalette";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Cairo has full Arabic + Latin coverage, used app-wide when locale is 'ar'.
const cairo = Cairo({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Rolevant AI — AI Resume Builder, Scanner & Job Matching",
    template: "%s · Rolevant AI",
  },
  description:
    "Build professional resumes, scan them against ATS criteria, match them to job descriptions, and discover jobs that fit — all powered by AI.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cairo.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased flex flex-col min-h-screen bg-background text-foreground">
        {/* Sets the .dark class before first paint, based on the saved
            preference (or OS preference) — must run before body content
            renders to avoid a flash of the wrong theme. Plain inline script,
            not a React effect, since effects run after paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <LocaleProvider>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <Navbar />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
          <CommandPalette />
          <Providers />
        </LocaleProvider>
      </body>
    </html>
  );
}

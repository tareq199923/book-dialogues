import type { Metadata } from "next";
import { Geist, Geist_Mono, Spectral } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spectral = Spectral({
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-spectral",
});

export const metadata: Metadata = {
  title: "Book Dialogues",
  description: "Two books debate each other, as if they were real people."
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spectral.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-rule">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-sm font-semibold text-ink font-serif tracking-tight">
              Book Dialogues
            </Link>
            <Link
              href="/personas"
              className="text-sm text-muted hover:text-ink transition-colors"
            >
              Personas
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}

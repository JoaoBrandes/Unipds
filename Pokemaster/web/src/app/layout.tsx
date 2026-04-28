import type { Metadata } from "next";
import { Bricolage_Grotesque, Space_Mono } from "next/font/google";
import "./globals.css";

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-headline",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-body",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pokémaster — Your Trainer Companion",
  description: "AI-powered Pokédex companion. Discover Pokémon by type, compare stats, and explore your team.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bricolageGrotesque.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}

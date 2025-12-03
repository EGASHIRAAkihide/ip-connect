import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MainNav from "./components/MainNav";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IP Connect PoC",
  description:
    "Minimal workflow for creators to publish IP assets and companies to request licenses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LanguageProvider>
          <MainNav />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </LanguageProvider>
      </body>
    </html>
  );
}

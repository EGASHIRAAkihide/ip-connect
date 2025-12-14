import type { Metadata } from "next";
import "./globals.css";
import MainNav from "./components/MainNav";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

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
      <body className="antialiased">
        <LanguageProvider>
          <MainNav />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </LanguageProvider>
      </body>
    </html>
  );
}

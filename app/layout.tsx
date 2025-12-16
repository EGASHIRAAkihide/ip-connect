import type { Metadata } from "next";
import "./globals.css";
import MainNav from "./components/MainNav";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

export const metadata: Metadata = {
  title: "IP Connect PoC",
  description:
    "クリエイターのIPを公開し、企業がライセンス利用を相談できる最小限のワークフローです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <LanguageProvider>
          <MainNav />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </LanguageProvider>
      </body>
    </html>
  );
}

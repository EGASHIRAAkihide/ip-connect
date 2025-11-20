import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "IP Connect PoC",
  description:
    "Minimal workflow for creators to publish IP assets and companies to request licenses.",
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/ip", label: "Browse IP" },
  { href: "/creator/dashboard", label: "Creator Dashboard" },
  { href: "/creator/inquiries", label: "Creator Inbox" },
  { href: "/company/inquiries", label: "Company Inquiries" },
  { href: "/auth/login", label: "Login" },
  { href: "/auth/register", label: "Register" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-950 text-slate-100 antialiased`}
      >
        <header className="border-b border-slate-800 bg-slate-900">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 p-4">
            <Link href="/" className="text-lg font-semibold">
              IP Connect PoC
            </Link>
            <nav className="flex flex-wrap gap-3 text-sm">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full bg-slate-800 px-3 py-1 text-slate-100 transition hover:bg-slate-700"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl p-4">{children}</main>
      </body>
    </html>
  );
}

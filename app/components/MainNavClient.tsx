"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type NavClientProps = {
  profile: UserProfile | null;
};

export function MainNavClient({ profile }: NavClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const { lang, t, setLang } = useLanguage();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const baseLinks = [
    { href: "/", label: t("nav_home") },
    { href: "/ip", label: t("nav_browse_ip") },
  ];

  if (!profile) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {baseLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full bg-slate-800 px-3 py-1 text-slate-100 transition hover:bg-slate-700"
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/auth/login"
          className="rounded-full bg-emerald-500 px-3 py-1 text-sm font-semibold text-black transition hover:bg-emerald-400"
        >
          {t("nav_login")}
        </Link>
        <Link
          href="/auth/register"
          className="rounded-full border border-emerald-400 px-3 py-1 text-sm text-emerald-300 transition hover:bg-emerald-950/60"
        >
          {t("nav_register")}
        </Link>
        <button
          type="button"
          onClick={() => setLang(lang === "en" ? "ja" : "en")}
          className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-200 transition hover:bg-slate-800"
        >
          {lang === "en" ? t("nav_lang_ja") : t("nav_lang_en")}
        </button>
      </div>
    );
  }

  const roleLinks =
    profile.role === "creator"
      ? [
          { href: "/creator/dashboard", label: t("nav_creator_dashboard") },
          { href: "/creator/inquiries", label: t("nav_creator_inbox") },
        ]
      : [{ href: "/company/inquiries", label: t("nav_company_inquiries") }];
  const analyticsLink = { href: "/analytics", label: "Analytics" };

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {[...baseLinks, ...roleLinks, analyticsLink].map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-full bg-slate-800 px-3 py-1 text-slate-100 transition hover:bg-slate-700"
        >
          {link.label}
        </Link>
      ))}
      <Link
        href={`/users/${profile.id}`}
        className="rounded-full border border-slate-600 px-3 py-1 text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300"
      >
        {t("nav_my_profile")}
      </Link>
      <button
        onClick={handleLogout}
        className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:bg-slate-600"
      >
        {t("nav_logout")}
      </button>
      <button
        type="button"
        onClick={() => setLang(lang === "en" ? "ja" : "en")}
        className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-200 transition hover:bg-slate-800"
      >
        {lang === "en" ? t("nav_lang_ja") : t("nav_lang_en")}
      </button>
    </div>
  );
}

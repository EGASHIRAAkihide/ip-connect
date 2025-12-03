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

  // 未ログイン時
  if (!profile) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {baseLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-neutral-800 underline underline-offset-2 hover:text-neutral-900"
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/auth/login"
          className="rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-800 hover:border-neutral-900"
        >
          {t("nav_login")}
        </Link>
        <Link
          href="/auth/register"
          className="rounded-full bg-neutral-900 px-3 py-1 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          {t("nav_register")}
        </Link>
        <button
          type="button"
          onClick={() => setLang(lang === "en" ? "ja" : "en")}
          className="rounded-full border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:border-neutral-900"
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
          className="rounded-full border border-neutral-300 px-3 py-1 text-neutral-800 hover:border-neutral-900"
        >
          {link.label}
        </Link>
      ))}
      <Link
        href={`/users/${profile.id}`}
        className="rounded-full border border-neutral-300 px-3 py-1 text-neutral-800 hover:border-neutral-900"
      >
        {t("nav_my_profile")}
      </Link>
      <button
        onClick={handleLogout}
        className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white hover:bg-neutral-800"
      >
        {t("nav_logout")}
      </button>
      <button
        type="button"
        onClick={() => setLang(lang === "en" ? "ja" : "en")}
        className="rounded-full border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:border-neutral-900"
      >
        {lang === "en" ? t("nav_lang_ja") : t("nav_lang_en")}
      </button>
    </div>
  );
}
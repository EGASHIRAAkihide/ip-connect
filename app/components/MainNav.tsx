'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import type { UserProfile } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type NavState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authed"; profile: UserProfile };

export function MainNav() {
  const router = useRouter();
  const [state, setState] = useState<NavState>({ status: "loading" });
  const { lang, t, setLang } = useLanguage();

  useEffect(() => {
    let isMounted = true;

    const hydrate = async (userId?: string) => {
      if (!isMounted) return;
      const existingUserId =
        userId ??
        (await supabaseClient.auth.getUser())?.data.user?.id;

      if (!existingUserId) {
        setState({ status: "guest" });
        return;
      }

      const { data, error } = await supabaseClient
        .from("users")
        .select("*")
        .eq("id", existingUserId)
        .single<UserProfile>();

      if (!isMounted) return;

      if (error || !data) {
        setState({ status: "guest" });
        return;
      }

      setState({ status: "authed", profile: data });
    };

    hydrate();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const userId = session?.user?.id;
      if (!userId) {
        setState({ status: "guest" });
        return;
      }
      hydrate(userId);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    setState({ status: "guest" });
    router.push("/");
    router.refresh();
  };

  const baseLinks = [
    { href: "/", label: t("nav_home") },
    { href: "/ip", label: t("nav_browse_ip") },
  ];

  const RenderNav = () => {
    if (state.status === "guest" || state.status === "loading") {
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

    const { profile } = state;
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
  };

  return (
    <nav aria-label="Main navigation">
      <RenderNav />
    </nav>
  );
}

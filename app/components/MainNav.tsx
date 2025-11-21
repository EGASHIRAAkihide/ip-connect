'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import type { UserProfile } from "@/lib/types";

type NavState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authed"; profile: UserProfile };

export function MainNav() {
  const router = useRouter();
  const [state, setState] = useState<NavState>({ status: "loading" });

  useEffect(() => {
    const hydrate = async () => {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user) {
        setState({ status: "guest" });
        return;
      }

      const { data, error } = await supabaseClient
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single<UserProfile>();

      if (error || !data) {
        setState({ status: "guest" });
        return;
      }

      setState({ status: "authed", profile: data });
    };

    hydrate();
  }, []);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    setState({ status: "guest" });
    router.push("/");
    router.refresh();
  };

  const baseLinks = [
    { href: "/", label: "Home" },
    { href: "/ip", label: "Browse IP" },
  ];

  if (state.status === "loading") {
    return <p className="text-sm text-slate-400">Loading…</p>;
  }

  if (state.status === "guest") {
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
          Login
        </Link>
        <Link
          href="/auth/register"
          className="rounded-full border border-emerald-400 px-3 py-1 text-sm text-emerald-300 transition hover:bg-emerald-950/60"
        >
          Register
        </Link>
      </div>
    );
  }

  const { profile } = state;
  const roleLinks =
    profile.role === "creator"
      ? [
          { href: "/creator/dashboard", label: "Creator Dashboard" },
          { href: "/creator/inquiries", label: "Creator Inbox" },
        ]
      : [{ href: "/company/inquiries", label: "Company Inquiries" }];
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
        My Profile
      </Link>
      <button
        onClick={handleLogout}
        className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:bg-slate-600"
      >
        Logout
      </button>
    </div>
  );
}

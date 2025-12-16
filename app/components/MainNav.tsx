// app/components/MainNav.tsx
import Link from "next/link";
import { getServerUserWithRole } from "@/lib/auth";

type NavLink = { href: string; label: string };

function buildNavLinks(role: string | null): NavLink[] {
  const base: NavLink[] = [
    { href: "/", label: "ホーム" },
    { href: "/ip", label: "IP一覧" },
  ];

  if (role === "creator") {
    return [
      ...base,
      { href: "/creator/dashboard", label: "クリエイター" },
      { href: "/creator/ip/new", label: "IP登録" },
      { href: "/creator/inquiries", label: "問い合わせ受信箱" },
      { href: "/analytics", label: "分析" },
    ];
  }

  if (role === "company") {
    return [
      ...base,
      { href: "/company/inquiries", label: "自社の問い合わせ" },
      { href: "/analytics", label: "分析" },
    ];
  }

  return base;
}

export default async function MainNav() {
  const { user, role } = await getServerUserWithRole();
  const navLinks = buildNavLinks(role);
  const profileHref = user ? `/users/${user.id}` : null;
  const roleLabel =
    role === "creator" ? "クリエイター" : role === "company" ? "企業" : "未ログイン";

  return (
    <header className="border-b border-neutral-200 bg-white text-sm text-neutral-900">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-base font-semibold text-neutral-900">
            IP Connect
          </Link>
          <span className="hidden text-xs text-neutral-500 sm:inline">
            振付 / 声 IP
          </span>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-center gap-2 md:gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1 text-neutral-800 underline-offset-4 hover:bg-neutral-100 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Link
                href="/auth/login"
                className="rounded-full px-3 py-1 text-neutral-800 underline-offset-4 hover:bg-neutral-100 hover:underline"
              >
                ログイン
              </Link>
              <Link
                href="/auth/register"
                className="rounded-full border border-neutral-900 px-3 py-1 text-xs font-semibold text-neutral-900 hover:bg-neutral-900 hover:text-white"
              >
                新規登録
              </Link>
            </>
          ) : (
            profileHref && (
              <div className="flex items-center gap-2">
                <span className="hidden rounded-full bg-neutral-100 px-3 py-1 text-[11px] uppercase tracking-wide text-neutral-600 sm:inline">
                  {roleLabel}
                </span>
                <Link
                  href={profileHref}
                  className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-800 hover:border-neutral-900"
                >
                  マイページ
                </Link>
              </div>
            )
          )}
        </div>
      </nav>

      <div className="border-t border-neutral-200 bg-white px-4 py-2 text-xs text-neutral-800 md:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-transparent px-3 py-1 underline underline-offset-3 hover:border-neutral-200"
            >
              {link.label}
            </Link>
          ))}
          {!user ? (
            <>
              <Link
                href="/auth/login"
                className="underline underline-offset-3"
              >
                ログイン
              </Link>
              <Link
                href="/auth/register"
                className="underline underline-offset-3"
              >
                新規登録
              </Link>
            </>
          ) : (
            profileHref && (
              <Link
                href={profileHref}
                className="underline underline-offset-3"
              >
                マイページ
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}

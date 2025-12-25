// app/components/MainNav.tsx
import Link from "next/link";
import { getServerUserWithRole } from "@/lib/auth";
import { logoutAction } from "@/app/auth/logout/actions";

type NavLink = { href: string; label: string };
type NavGroups = { primary: NavLink[]; secondary: NavLink[] };

function buildNavLinks(role: string | null): NavGroups {
  const base: NavLink[] = [{ href: "/", label: "ホーム" }];
  const publicLinks: NavLink[] = [...base, { href: "/ip", label: "IP一覧" }];
  const legacyLink: NavLink = { href: "/legacy", label: "Legacy" };

  if (role === "creator") {
    return {
      primary: [
        ...publicLinks,
        { href: "/creator/dashboard", label: "クリエイター" },
        { href: "/creator/inquiries", label: "問い合わせ受信箱" },
      ],
      secondary: [
        { href: "/creator/ip/new", label: "IP登録" },
        { href: "/analytics", label: "分析" },
        legacyLink,
      ],
    };
  }

  if (role === "company") {
    return {
      primary: [
        ...base,
        { href: "/poc", label: "PoC" },
        { href: "/company/choreo-checks", label: "振付チェック" },
        legacyLink,
      ],
      secondary: [],
    };
  }

  return { primary: publicLinks, secondary: [] };
}

export default async function MainNav() {
  const { user, role, isAdmin } = await getServerUserWithRole();
  const enableLab = process.env.ENABLE_LAB === "true";
  const { primary: primaryLinks, secondary: secondaryLinks } = buildNavLinks(role);
  const navLinks = [...primaryLinks, ...secondaryLinks];
  const profileHref = user ? `/users/${user.id}` : null;
  const roleLabel =
    role === "creator" ? "クリエイター" : role === "company" ? "企業" : "未ログイン";

  const adminLinks: NavLink[] = [];
  if (isAdmin) {
    adminLinks.push({ href: "/admin/dev", label: "Admin Dev" });
    if (enableLab) {
      adminLinks.push({ href: "/lab", label: "Lab" });
      adminLinks.push({ href: "/lab/guide", label: "Lab Guide" });
    }
  }

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

        <div className="hidden min-w-0 flex-1 flex-wrap items-center justify-center gap-2 md:flex md:gap-3">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1 text-neutral-800 underline-offset-4 hover:bg-neutral-100 hover:underline"
            >
              {link.label}
            </Link>
          ))}
          {secondaryLinks.length > 0 && (
            <details className="relative">
              <summary className="list-none cursor-pointer select-none rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-900 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20">
                メニュー
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
                {secondaryLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </details>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {adminLinks.length > 0 && (
            <details className="relative hidden md:block">
              <summary className="list-none cursor-pointer select-none rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-900 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20">
                Admin
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
                {adminLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </details>
          )}
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
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-800 hover:border-neutral-900"
                  >
                    ログアウト
                  </button>
                </form>
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
              <>
                <Link
                  href={profileHref}
                  className="underline underline-offset-3"
                >
                  マイページ
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="underline underline-offset-3"
                  >
                    ログアウト
                  </button>
                </form>
              </>
            )
          )}
          {adminLinks.length > 0 &&
            adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-transparent px-3 py-1 underline underline-offset-3 hover:border-neutral-200"
              >
                {link.label.replace("Admin ", "").replace("Lab ", "Lab ")}
              </Link>
            ))}
        </div>
      </div>
    </header>
  );
}

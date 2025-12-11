// app/components/MainNav.tsx
import Link from "next/link";
import { getServerUserWithRole } from "@/lib/auth";

type NavLink = { href: string; label: string };

function buildNavLinks(role: string | null): NavLink[] {
  const base: NavLink[] = [
    { href: "/", label: "Home" },
    { href: "/ip", label: "Catalog" },
  ];

  if (role === "creator") {
    return [
      ...base,
      { href: "/creator/dashboard", label: "Creator Dashboard" },
      { href: "/creator/ip/new", label: "New IP" },
      { href: "/creator/inquiries", label: "Inbox" },
      { href: "/analytics", label: "Analytics" },
    ];
  }

  if (role === "company") {
    return [
      ...base,
      { href: "/company/inquiries", label: "My inquiries" },
      { href: "/analytics", label: "Analytics" },
    ];
  }

  return base;
}

export default async function MainNav() {
  const { user, role } = await getServerUserWithRole();
  const navLinks = buildNavLinks(role);
  const profileHref = user ? `/users/${user.id}` : null;

  return (
    <header className="border-b border-neutral-200 bg-white text-sm text-neutral-900">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-base font-semibold text-neutral-900">
            IP Connect
          </Link>
          <span className="hidden text-xs text-neutral-500 sm:inline">
            Choreography & Voice
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
                Login
              </Link>
              <Link
                href="/auth/register"
                className="rounded-full border border-neutral-900 px-3 py-1 text-xs font-semibold text-neutral-900 hover:bg-neutral-900 hover:text-white"
              >
                Register
              </Link>
            </>
          ) : (
            profileHref && (
              <div className="flex items-center gap-2">
                <span className="hidden rounded-full bg-neutral-100 px-3 py-1 text-[11px] uppercase tracking-wide text-neutral-600 sm:inline">
                  {role ?? "user"}
                </span>
                <Link
                  href={profileHref}
                  className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-800 hover:border-neutral-900"
                >
                  My profile
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
                Login
              </Link>
              <Link
                href="/auth/register"
                className="underline underline-offset-3"
              >
                Register
              </Link>
            </>
          ) : (
            profileHref && (
              <Link
                href={profileHref}
                className="underline underline-offset-3"
              >
                My profile
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}

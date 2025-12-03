// app/components/MainNav.tsx
import Link from "next/link";
import { getServerUserWithRole } from "@/lib/auth";

export default async function MainNav() {
  const { user, role } = await getServerUserWithRole();
  const isCreator = !!user && role === "creator";
  const isCompany = !!user && role === "company";

  return (
    <header className="border-b border-neutral-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        {/* Left: brand */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-neutral-900"
          >
            IP Connect
          </Link>
          <span className="hidden text-xs text-neutral-500 sm:inline">
            Choreography &amp; Voice Licensing
          </span>
        </div>

        {/* Center: main links (desktop) */}
        <div className="hidden items-center gap-4 text-sm text-neutral-800 md:flex">
          {/* Common */}
          <Link href="/ip" className="hover:underline underline-offset-2">
            Catalog
          </Link>
          <Link href="/analytics" className="hover:underline underline-offset-2">
            Analytics
          </Link>
          <Link href="/routes" className="hover:underline underline-offset-2">
            Sitemap
          </Link>

          {/* Creator */}
          {isCreator && (
            <>
              <span
                className="mx-2 h-4 w-px bg-neutral-300"
                aria-hidden="true"
              />
              <Link
                href="/creator/dashboard"
                className="hover:underline underline-offset-2"
              >
                Creator dashboard
              </Link>
              <Link
                href="/creator/ip/new"
                className="hover:underline underline-offset-2"
              >
                New IP
              </Link>
              <Link
                href="/creator/inquiries"
                className="hover:underline underline-offset-2"
              >
                Inbox
              </Link>
            </>
          )}

          {/* Company */}
          {isCompany && (
            <>
              <span
                className="mx-2 h-4 w-px bg-neutral-300"
                aria-hidden="true"
              />
              <Link
                href="/company/inquiries"
                className="hover:underline underline-offset-2"
              >
                My inquiries
              </Link>
            </>
          )}
        </div>

        {/* Right: auth / profile */}
        <div className="flex items-center gap-2 text-sm">
          {!user ? (
            <>
              <Link
                href="/auth/login"
                className="text-neutral-800 hover:underline underline-offset-2"
              >
                Log in
              </Link>
              <Link
                href="/auth/register"
                className="rounded-full border border-neutral-900 px-3 py-1 text-xs font-semibold text-neutral-900 hover:bg-neutral-100"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              <span className="hidden text-xs uppercase tracking-wide text-neutral-500 sm:inline">
                {role ?? "user"}
              </span>
              <Link
                href={`/users/${user.id}`}
                className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-800 hover:border-neutral-900"
              >
                My profile
              </Link>
              {/* Logout は既存の別UIに任せる。ここではサインアウトボタンは追加しない */}
            </>
          )}
        </div>
      </nav>

      {/* Mobile nav: simple row of core links */}
      <div className="border-t border-neutral-200 bg-white px-4 py-2 text-xs text-neutral-700 md:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-3">
          <Link href="/ip" className="underline underline-offset-2">
            Catalog
          </Link>
          <Link href="/analytics" className="underline underline-offset-2">
            Analytics
          </Link>
          <Link href="/routes" className="underline underline-offset-2">
            Sitemap
          </Link>
          {isCreator && (
            <>
              <Link
                href="/creator/dashboard"
                className="underline underline-offset-2"
              >
                Creator
              </Link>
              <Link
                href="/creator/inquiries"
                className="underline underline-offset-2"
              >
                Inbox
              </Link>
            </>
          )}
          {isCompany && (
            <Link
              href="/company/inquiries"
              className="underline underline-offset-2"
            >
              My inquiries
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
import Link from "next/link";
import { getServerUserWithRole } from "@/lib/auth";

export default async function MainNav() {
  const { user, role } = await getServerUserWithRole();
  const isCreator = !!user && role === "creator";
  const isCompany = !!user && role === "company";

  return (
    <header className="border-b border-neutral-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-base font-semibold tracking-tight text-neutral-900">
          IP Connect
        </Link>
        <div className="flex items-center gap-4 text-sm text-neutral-700">
          <Link href="/ip" className="hover:underline">
            Catalog
          </Link>

          {isCreator && (
            <>
              <Link href="/creator/ip/new" className="hover:underline">
                New IP
              </Link>
              <Link href="/creator/inquiries" className="hover:underline">
                Inbox
              </Link>
            </>
          )}

          {isCompany && (
            <Link href="/company/inquiries" className="hover:underline">
              My inquiries
            </Link>
          )}

          {!user && (
            <>
              <Link href="/auth/login" className="hover:underline">
                Log in
              </Link>
              <Link
                href="/auth/register"
                className="rounded-full border border-neutral-900 px-3 py-1 text-xs font-semibold text-neutral-900 hover:bg-neutral-100"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

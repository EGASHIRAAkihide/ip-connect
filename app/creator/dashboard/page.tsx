import Link from "next/link";
import { getServerUserWithRole } from "@/lib/auth";

const dummyAssets = [
  { id: "1", title: "Sample Voice Pack", status: "published" },
  { id: "2", title: "Character Lines v1", status: "draft" },
];

export default async function CreatorDashboardPage() {
  const { user, role } = await getServerUserWithRole();

  if (!user || role !== "creator") {
    return (
      <section className="mx-auto max-w-3xl py-8">
        <h1 className="text-xl font-semibold text-neutral-900">Creator dashboard</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Please log in as a creator to view your dashboard.
        </p>
        <Link
          href="/auth/login"
          className="mt-4 inline-flex rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900"
        >
          Go to login
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl space-y-8 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-600">{user.email ?? "Creator"}</p>
          <h1 className="text-3xl font-semibold text-neutral-900">Creator Dashboard</h1>
        </div>
        <Link
          href="/creator/assets/new"
          className="inline-flex items-center rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
        >
          New Asset
        </Link>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-medium text-neutral-900">Your Assets</h2>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          {dummyAssets.length === 0 ? (
            <p className="text-sm text-neutral-600">
              No assets yet. Create your first one.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {dummyAssets.map((asset) => (
                <li
                  key={asset.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium text-neutral-900">{asset.title}</p>
                    <p className="text-sm text-neutral-600">
                      Status: {asset.status}
                    </p>
                  </div>
                  <Link
                    href={`/creator/assets/${asset.id}`}
                    className="inline-flex items-center rounded-full border border-neutral-900 px-3 py-1 text-xs font-semibold text-neutral-900 hover:bg-neutral-100"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </section>
  );
}

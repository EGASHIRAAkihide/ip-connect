import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";

const dummyAssets = [
  { id: "1", title: "Sample Voice Pack", status: "published" },
  { id: "2", title: "Character Lines v1", status: "draft" },
];

export default async function Page() {
  const session = await getSession();

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {session?.user?.email ?? "Creator"}
          </p>
          <h1 className="text-3xl font-semibold">Creator Dashboard</h1>
        </div>
        <Button asChild>
          <Link href="/creator/assets/new">New Asset</Link>
        </Button>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-medium">Your Assets</h2>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          {dummyAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No assets yet. Create your first one.
            </p>
          ) : (
            <ul className="divide-y">
              {dummyAssets.map((asset) => (
                <li
                  key={asset.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium">{asset.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Status: {asset.status}
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/creator/assets/${asset.id}`}>View</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

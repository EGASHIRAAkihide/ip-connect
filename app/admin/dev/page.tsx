import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { switchRole } from "./actions";

const ALLOW_SWITCH = true

export default async function AdminDevPage() {
  if (!ALLOW_SWITCH) {
    return notFound();
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("email, role, is_admin")
    .eq("id", user?.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return notFound();
  }

  return (
    <section className="mx-auto mt-10 max-w-3xl space-y-6 rounded-2xl border border-neutral-200 bg-white p-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">管理</p>
        <h1 className="text-3xl font-semibold text-neutral-900">Roleスイッチ (PoC検証用)</h1>
        <p className="text-sm text-neutral-700">
          自分のロールのみ切り替え可能です。is_admin=true ユーザー限定。
        </p>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
        <p className="text-sm text-neutral-700">メール: {profile.email}</p>
        <p className="text-sm text-neutral-700">現在のロール: {profile.role}</p>
        <p className="text-sm text-neutral-700">is_admin: {String(profile.is_admin)}</p>
      </div>

      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5">
        <p className="text-sm font-semibold text-neutral-900">ロールを切り替える</p>
        <div className="flex flex-wrap gap-3">
          <form action={switchRole.bind(null, "creator")}>
            <button
              type="submit"
              className="rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-900 hover:text-white"
            >
              クリエイターに切替
            </button>
          </form>
          <form action={switchRole.bind(null, "company")}>
            <button
              type="submit"
              className="rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-900 hover:text-white"
            >
              企業に切替
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

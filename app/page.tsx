import Link from "next/link";
import { getServerUserWithRole } from "@/lib/auth";

type RoleKey = "creator" | "company" | "guest";

const mainLinks: Record<RoleKey, { href: string; label: string }[]> = {
  guest: [
    { href: "/auth/login", label: "ログイン" },
    { href: "/auth/register", label: "新規登録" },
  ],
  creator: [
    { href: "/creator/ip/new", label: "IPを登録する" },
    { href: "/creator/inquiries", label: "問い合わせを確認する" },
  ],
  company: [
    { href: "/ip", label: "IPを探す" },
    { href: "/company/inquiries", label: "自社の問い合わせ一覧" },
  ],
};

export default async function Home() {
  const { role } = await getServerUserWithRole();
  const roleKey: RoleKey = role ?? "guest";

  return (
    <section className="mx-auto mt-8 max-w-5xl space-y-6 rounded-2xl border border-neutral-200 bg-white p-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">IP Connect</p>
        <h1 className="text-3xl font-bold text-neutral-900">現時点のPRDとできること</h1>
        <p className="text-sm text-neutral-700">
          PoC版のスコープを一目で把握し、すぐに触れる導線を用意しています。
        </p>
      </header>

      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
        <h2 className="text-xl font-semibold text-neutral-900">IP Connect 現時点PRD</h2>
        <ul className="list-disc space-y-2 pl-5 text-neutral-800">
          <li>
            対象ユーザー：クリエイター（声・振付） / 企業（広告・アプリ・AI用途）
          </li>
          <li>
            解決したい課題：IPの検索・利用条件の整理・問い合わせの記録（決済/契約は除外）
          </li>
          <li>
            主要機能：IP登録（声/振付）、一覧・検索フィルタ、詳細ページ、問い合わせフォーム、
            Company/Creator Inbox、ロール別ナビゲーション
          </li>
          <li>
            PoCスコープ：問い合わせ件数・入力完了率・返信率で価値検証。決済/自動契約/ロイヤリティは実装しない。
          </li>
          <li>
            データ項目：利用目的・媒体・期間・地域・二次利用・改変・AI利用、価格目安、メタデータ（声/振付別）
          </li>
        </ul>
      </div>

      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-neutral-900">いま何ができるか</h2>
        <ul className="list-disc space-y-1 pl-5 text-neutral-800">
          <li>クリエイター：声/振付IPを登録・公開し、価格目安や条件を提示できる</li>
          <li>企業：タイプ/目的/AI可否/地域/価格上限で検索し、詳細を閲覧できる</li>
          <li>企業：問い合わせフォームから条件付きでリクエストを送信できる</li>
          <li>クリエイター：Inboxで受信した問い合わせのステータスを更新できる</li>
          <li>双方：問い合わせ詳細を参照し、AI利用や二次利用の可否を確認できる</li>
          <li>全体：イベント計測（閲覧・送信）でPoCのKPIを記録</li>
        </ul>
      </div>

      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-neutral-900">主要導線</h3>
        <p className="text-sm text-neutral-700">
          {role === "creator" && "クリエイターロールでログイン中"}
          {role === "company" && "カンパニーロールでログイン中"}
          {!role && "未ログインです。まずは登録またはログインしてください。"}
        </p>
        <div className="flex flex-wrap gap-3">
          {mainLinks[roleKey].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-900 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

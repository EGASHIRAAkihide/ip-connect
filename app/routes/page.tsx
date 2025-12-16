import Link from "next/link";

type RouteItem = {
  path: string;         // 実際のルーティングパス（動的なら /ip/[id] など）
  description: string;  // 説明文
  alias?: string;       // 表示用パス（/ip/:id など任意）
};

type Section = {
  title: string;
  routes: RouteItem[];
};

const sections: Section[] = [
  {
    title: "公開",
    routes: [
      { path: "/", description: "トップページ" },
      {
        path: "/ip",
        description: "IP一覧（振付/声）",
      },
      {
        path: "/ip/[id]",
        alias: "/ip/:id",
        description: "IP詳細（動的ルート）",
      },
      {
        path: "/ip/[id]/inquire",
        alias: "/ip/:id/inquire",
        description: "IPへの問い合わせ送信（動的ルート）",
      },
    ],
  },
  {
    title: "認証",
    routes: [
      { path: "/auth/login", description: "ログイン" },
      { path: "/auth/register", description: "新規登録" },
    ],
  },
  {
    title: "クリエイター",
    routes: [
      {
        path: "/creator/dashboard",
        description: "クリエイター用ダッシュボード",
      },
      {
        path: "/creator/ip/new",
        description: "振付/声のIPを新規登録",
      },
      {
        path: "/creator/inquiries",
        description: "問い合わせ受信箱",
      },
      {
        path: "/creator/inquiries/[id]",
        alias: "/creator/inquiries/:id",
        description: "問い合わせ詳細・対応（承認/却下など）",
      },
    ],
  },
  {
    title: "企業",
    routes: [
      {
        path: "/company/inquiries",
        description: "送信した問い合わせ一覧",
      },
      {
        path: "/company/inquiries/[id]",
        alias: "/company/inquiries/:id",
        description: "問い合わせ詳細（企業側）",
      },
    ],
  },
  {
    title: "ユーザー",
    routes: [
      {
        path: "/users/[id]",
        alias: "/users/:id",
        description: "ユーザープロフィール（基本情報）",
      },
    ],
  },
  {
    title: "分析",
    routes: [
      {
        path: "/analytics",
        description: "全体指標ダッシュボード（クリエイター/IP/問い合わせ）",
      },
    ],
  },
];

export default function RoutesPage() {
  return (
    <section className="mx-auto max-w-5xl space-y-8 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900">サイトマップ</h1>
        <p className="text-sm text-neutral-600">
          PoCで利用できる画面を一覧化しています。デモや開発時のショートカットとして使ってください。
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((section) => (
          <div
            key={section.title}
            className="rounded-2xl border border-neutral-200 bg-white p-6"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              {section.title}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-neutral-800">
              {section.routes.map((route) => {
                const isDynamic = route.path.includes("[");
                const label = route.alias ?? route.path;

                return (
                  <li
                    key={`${section.title}-${route.path}-${route.description}`}
                    className="flex flex-col gap-0.5 md:flex-row md:items-baseline md:justify-between md:gap-4"
                  >
                    <div className="flex items-baseline gap-2">
                      {isDynamic ? (
                        // 動的ルートは Link にせず、文字だけ表示して Next.js のエラーを避ける
                        <span className="font-mono text-neutral-900">{label}</span>
                      ) : (
                        <Link
                          href={route.path}
                          className="font-mono text-neutral-900 underline underline-offset-2"
                        >
                          {label}
                        </Link>
                      )}
                    </div>
                    <span className="text-xs text-neutral-500">{route.description}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

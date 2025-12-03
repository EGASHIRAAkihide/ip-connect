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
    title: "Public",
    routes: [
      { path: "/", description: "Landing page" },
      {
        path: "/ip",
        description: "IP catalog (choreography & voice)",
      },
      {
        path: "/ip/[id]",
        alias: "/ip/:id",
        description: "IP detail (dynamic route)",
      },
      {
        path: "/ip/[id]/inquire",
        alias: "/ip/:id/inquire",
        description: "Submit licensing inquiry for a specific IP (dynamic route)",
      },
    ],
  },
  {
    title: "Auth",
    routes: [
      { path: "/auth/login", description: "Log in" },
      { path: "/auth/register", description: "Sign up" },
    ],
  },
  {
    title: "Creator",
    routes: [
      {
        path: "/creator/dashboard",
        description: "Creator dashboard overview",
      },
      {
        path: "/creator/ip/new",
        description: "Register new choreography or voice IP",
      },
      {
        path: "/creator/inquiries",
        description: "Inbox – inquiries for your IP assets",
      },
      {
        path: "/creator/inquiries/[id]",
        alias: "/creator/inquiries/:id",
        description: "Inquiry detail & actions (approve / reject / mark paid)",
      },
    ],
  },
  {
    title: "Company",
    routes: [
      {
        path: "/company/inquiries",
        description: "List of inquiries you have submitted",
      },
      {
        path: "/company/inquiries/[id]",
        alias: "/company/inquiries/:id",
        description: "Inquiry detail from company point of view",
      },
    ],
  },
  {
    title: "Users",
    routes: [
      {
        path: "/users/[id]",
        alias: "/users/:id",
        description: "User profile (basic information)",
      },
    ],
  },
  {
    title: "Analytics",
    routes: [
      {
        path: "/analytics",
        description: "Global metrics dashboard (creators, IPs, inquiries, payments)",
      },
    ],
  },
];

export default function RoutesPage() {
  return (
    <section className="mx-auto max-w-5xl space-y-8 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900">Sitemap</h1>
        <p className="text-sm text-neutral-600">
          Internal overview of available PoC screens for IP Connect. Use this page to navigate
          quickly during demos and development.
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
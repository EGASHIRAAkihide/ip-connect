import Link from "next/link";

const steps = [
  {
    title: "Creators upload IP assets",
    detail:
      "Voice actors, illustrators, and choreographers add media, usage terms, and pricing.",
    cta: { href: "/creator/ip/new", label: "Add IP Asset" },
  },
  {
    title: "Companies browse the catalog",
    detail:
      "Public listing surfaces summaries so teams understand scope and price within a minute.",
    cta: { href: "/ip", label: "Browse Catalog" },
  },
  {
    title: "Inquiries flow back to creators",
    detail:
      "Companies submit structured requests and creators respond from a lightweight inbox.",
    cta: { href: "/creator/inquiries", label: "Review Inquiries" },
  },
];

export default function Home() {
  return (
    <section className="space-y-10 py-10">
      <div className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-slate-400">
          Proof of Concept
        </p>
        <h1 className="text-4xl font-semibold text-white">
          IP Connect Minimal Workflow
        </h1>
        <p className="text-lg text-slate-300">
          Implements the requirements from{" "}
          <code className="rounded bg-slate-800 px-2 py-1">
            docs/06_PoC/poc_spec.md
          </code>{" "}
          section 9 to validate the core flow.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <Link
            href="/auth/register"
            className="rounded-full bg-emerald-500 px-4 py-2 text-black"
          >
            Get Started
          </Link>
          <Link
            href="/ip"
            className="rounded-full border border-slate-600 px-4 py-2 text-slate-200"
          >
            View Live Catalog
          </Link>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.title}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow"
          >
            <h2 className="text-xl font-semibold text-white">{step.title}</h2>
            <p className="mt-3 text-sm text-slate-300">{step.detail}</p>
            <Link
              href={step.cta.href}
              className="mt-5 inline-flex rounded-full border border-emerald-500 px-4 py-2 text-sm text-emerald-300 transition hover:bg-emerald-500/10"
            >
              {step.cta.label}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

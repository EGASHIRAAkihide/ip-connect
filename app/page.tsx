"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

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
  const { t } = useLanguage();

  return (
<section className="space-y-6 p-6 rounded-xl border border-slate-800 bg-slate-900 mt-8">
  <h1 className="text-3xl font-bold text-white">IP Connect – PoC Overview</h1>

  <p className="text-slate-300 leading-relaxed">
    This Proof of Concept demonstrates a simplified end-to-end workflow for licensing
    creator-owned digital IP assets (voice, illustrations, choreography) to companies.
    The goal is to validate whether both creators and companies experience
    value from a unified, transparent IP licensing flow.
  </p>

  <h2 className="text-xl font-semibold text-white mt-6">🎯 Purpose of this PoC</h2>
  <ul className="list-disc pl-6 text-slate-300 space-y-1">
    <li>Test desirability and usability of a unified IP licensing system</li>
    <li>Validate whether creators can easily publish IP assets with clear usage terms</li>
    <li>Observe how companies evaluate assets and submit licensing inquiries</li>
    <li>Simulate approval, invoicing, and payment flows</li>
    <li>Collect qualitative feedback on workflow clarity and transparency</li>
  </ul>

  <h2 className="text-xl font-semibold text-white mt-6">✨ Implemented Features (PoC Scope)</h2>
  <ul className="list-disc pl-6 text-slate-300 space-y-1">
    <li>Creator registration & dashboard</li>
    <li>IP asset publishing (voice / image / video)</li>
    <li>Usage terms presets + optional notes</li>
    <li>Company-side browsing & asset detail view</li>
    <li>Inquiry submission (purpose, region, period, budget)</li>
    <li>Creator-side approval / rejection</li>
    <li>Simulated invoicing & payment flow</li>
    <li>Analytics dashboard (IP total, inquiries, approvals, payment status)</li>
    <li>Basic EN/JA multi-language toggle</li>
    <li>Auth-synchronized navigation (instant role switching)</li>
  </ul>

  <h2 className="text-xl font-semibold text-white mt-6">🚧 Out of Scope (Not included in this PoC)</h2>
  <ul className="list-disc pl-6 text-slate-300 space-y-1">
    <li>Real contracts or legally binding license documents</li>
    <li>Actual payment processing (Stripe, bank transfer, etc.)</li>
    <li>AI-based pricing recommendations</li>
    <li>Automatic rights validation / rights graph engine</li>
    <li>Complex multi-asset bundles or multi-party contracts</li>
  </ul>

  <h2 className="text-xl font-semibold text-white mt-6">🧪 Workflow Demonstrated</h2>
  <ol className="list-decimal pl-6 text-slate-300 space-y-1">
    <li>Creator registers & publishes an IP asset</li>
    <li>Company browses the catalog and selects an asset</li>
    <li>Company submits a licensing inquiry</li>
    <li>Creator approves or rejects the inquiry</li>
    <li>Creator marks “invoiced” → “paid (simulated)”</li>
    <li>Analytics dashboard updates automatically</li>
  </ol>

  <h2 className="text-xl font-semibold text-white mt-6">📌 Notes</h2>
  <p className="text-slate-300">
    This PoC focuses on validating workflow clarity and user value.
    All payment and contract steps are simulated for testing purposes.
    No real transactions or legal agreements are created.
  </p>
</section>
  );
}

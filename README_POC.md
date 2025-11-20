## IP Connect PoC

This repository contains the minimum viable demo for the IP Connect workflow described in `docs/06_PoC/poc_spec.md` section 9. The focus is functionality:

1. Creators sign up, upload IP assets with usage terms, and see inquiries.
2. Companies browse the public catalog, view asset details, and submit inquiries.
3. Creators approve or reject each inquiry in a lightweight inbox.

### Stack

- Next.js App Router (TypeScript)
- TailwindCSS (minimal styles)
- Supabase (Auth + Postgres + Storage)

### Environment variables

Create a `.env.local` file with your Supabase project credentials:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Provision three tables (`users`, `ip_assets`, `inquiries`) using `supabase/migrations/0001_init.sql`, and a public storage bucket named `ip-assets`.

### Local development

```
pnpm install
pnpm dev
```

Visit http://localhost:3000 and use the register/login pages to run through both creator and company flows.

### Spec alignment

- In-scope features: creator dashboard, IP creation, company catalog/detail pages, inquiry form, creator inbox, status updates.
- Out-of-scope work (payments, analytics, advanced filters, etc.) remains intentionally excluded per the spec.
- Basic validation ensures required fields are provided, and each action persists to Supabase for the PoC test checklist.

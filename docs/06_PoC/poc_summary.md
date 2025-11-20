## PoC Section 9 Quick Notes

- Build only the core workflow: creator uploads IP asset → company submits inquiry → creator approves or rejects.
- Must support two personas with email/password auth: creators manage IP assets and inquiries; companies browse IP listings and send inquiries.
- Creator scope: dashboard with own assets, IP creation form (title, description, category, file upload, usage terms preset, price range), inquiry inbox with approve/reject actions.
- Company scope: public IP list, detail view with asset preview, terms, price range, and inquiry form collecting purpose, region, period, optional budget, and message.
- Data model: `users` (creator/company roles), `ip_assets` (owned by creators, includes terms & pricing), `inquiries` (links IP, creator, company, tracks status pending/approved/rejected).
- Tech stack: Next.js App Router + TypeScript, TailwindCSS, Supabase (auth, Postgres, storage). Keep UI minimal, prioritize functionality.
- Out of scope: payments, contracts, analytics, advanced search, multi-language, complex roles.
- Validation checklist: both roles can sign up/login; creators can upload assets and manage inquiries; companies can browse, view details, and submit inquiries; all actions persist without crashes; basic validation blocks empty submissions.


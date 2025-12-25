# IP Connect – PoC Platform for Digital IP Licensing

A Proof-of-Concept platform that enables creators (voice actors, illustrators, choreographers) to safely and transparently license their digital IP to companies.
Built with Next.js + Supabase, this PoC validates the end-to-end licensing workflow:
	•	Creator onboarding
	•	IP registration & asset upload
	•	Public catalog & asset detail page
	•	Company licensing inquiries
	•	Creator-side approval flow

⸻

🚀 Tech Stack

Component	Technology
Frontend	Next.js (App Router), React 18, TypeScript
Backend	Supabase (Postgres + Auth + Storage)
Storage	Supabase Storage (ip-assets bucket)
Styling	Tailwind CSS
Auth	Supabase Email Auth (Magic Link + Role-based access)


⸻

🧪 PoC Scope

This PoC tests only desirability + basic workflow.
No payment, no contract automation, no multi-language support.

✔ Creator IP registration
✔ File upload to Supabase Storage
✔ IP detail preview (image / audio / video)
✔ Company inquiry submission
✔ Creator inbox & approve/reject
✔ Company dashboard to track inquiries

❌ No automated contracts
❌ No payments
❌ No price negotiation features
❌ No multi-user organization features

⸻

📦 Project Structure

ip-connect/
├─ app/
│  ├─ ip/
│  │  ├─ [id]/page.tsx           # Asset detail page
│  │  ├─ [id]/inquire/page.tsx   # Inquiry form for companies
│  │  └─ page.tsx                # Public IP catalog
│  ├─ creator/ip/new/page.tsx    # Creator: new IP asset
│  ├─ creator/inquiries/page.tsx # Creator: inquiry inbox
│  ├─ company/inquiries/page.tsx # Company: inquiry dashboard (new)
│  └─ auth/...                   # Login/Register flow
├─ lib/
│  ├─ supabaseClient.ts          # Supabase client
│  ├─ types.ts                   # Shared TypeScript types
│  └─ utils.ts                   # Helper utils
├─ supabase/
│  ├─ migrations/0001_init.sql   # Tables: users, ip_assets, inquiries
│  └─ seed/...
└─ README.md                     # ← You are here


⸻

🛠 Supabase Setup Guide

1. Create a Supabase Project
	1.	Go to https://supabase.com/dashboard
	2.	Create a new project
	3.	Get the following values:
	•	NEXT_PUBLIC_SUPABASE_URL
	•	NEXT_PUBLIC_SUPABASE_ANON_KEY

2. Create Storage Bucket

Bucket name: ip-assets
Public: enabled

This is safe for PoC, but should be private in production.

3. Apply Database Schema

Run the SQL inside:

supabase/migrations/0001_init.sql

Tables:
	•	users
	•	ip_assets
	•	inquiries

4. Configure RLS Policies

Minimum safe configuration:

-- Allow creators to insert assets
create policy "creators insert ip_assets"
on ip_assets for insert
to authenticated
with check (creator_id = auth.uid());

-- Companies can insert inquiries
create policy "companies insert inquiries"
on inquiries for insert
to authenticated
with check (company_id = auth.uid());

-- Select rules
create policy "all select ip_assets"
on ip_assets for select
to authenticated
using (true);

create policy "creator select inquiries"
on inquiries for select
to authenticated
using (creator_id = auth.uid() OR company_id = auth.uid());

⸻

🧾 Lab Run PDF Reports (Playwright)

This repo can generate a PDF report for admin-only AI Lab runs:

- HTML: `/lab/runs/[id]/report`
- PDF: `/lab/runs/[id]/report.pdf`

This project generates PDFs via a separate Node script under `apps/pdf` to avoid bundling Playwright into Next.js.

Build/install once:

- `cd apps/pdf && pnpm install && pnpm build`
- Install Playwright browsers (Chromium):
  - macOS: `pnpm exec playwright install chromium`
  - Linux (CI/containers): `pnpm exec playwright install --with-deps chromium`

Then you can open:
- HTML: `/lab/runs/[id]/report`
- PDF: `/lab/runs/[id]/report.pdf`

Notes:
- The PDF route spawns `apps/pdf/dist/generate.js` (Playwright runs outside the Next.js bundle).
- Reports always include a disclaimer and are for review/reference only.


⸻

▶️ Local Development

1. Install dependencies

pnpm install

2. Add environment variables

Create .env.local:

NEXT_PUBLIC_SUPABASE_URL=xxxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx

3. Run the dev server

Create `.env.lab` (ignored by git) and set:

cp .env.lab.example .env.lab
# Fill HF_TOKEN
docker compose -f docker-compose.lab.yml up --build
pnpm dev

Access:

http://localhost:3000


⸻

🧩 User Roles Overview

🧑‍🎨 Creators (voice / illustration / choreography)

Can:
	•	Register IP assets
	•	Upload image/audio/video files
	•	Manage inquiries (approve/reject)
	•	View own assets

🏢 Companies

Can:
	•	Browse IP assets
	•	View asset detail
	•	Submit licensing inquiries
	•	Track inquiry statuses

⸻

📝 PoC Success Metrics
	•	15+ creators onboarded
	•	10+ company inquiries
	•	3+ simulated paid transactions
	•	Qualitative validation from both sides

⸻

🚀 Next Steps (Post-PoC)
	•	Automated contract generator
	•	Payment integration (Stripe or Web3)
	•	Organization accounts (teams)
	•	Versioned IP licenses
	•	Licensing analytics dashboard

⸻

📄 License

MIT License (or preferred license)

⸻

🙌 Author

IP Connect Team
(Founder: @gashi_japan)

本リポジトリでの実装作業は docs/CODEX_RULES.md を前提とする

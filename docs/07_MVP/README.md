# 07_MVP — IP Connect

## Overview

The MVP proves that a standardized licensing workflow (Creator lists IP → Company requests → Creator approves → Deal logged) can function as a digital product. Focus is workflow clarity, not full automation or payments.

---

## 1. Goals

- Creators can publish IP assets with usage terms
- Companies can find IP and submit licensing requests
- Approval/rejection flow is smooth and trusted
- Logs store terms and interactions
- Demand is validated for YC/pre-seed

---

## 2. Target Users

- **Creators:** voice actors, illustrators, choreographers
- **Companies:** indie game devs, VTuber agencies, ad agencies, YouTube/TikTok teams

---

## 3. Feature List

### Creator-side
- Email/password sign-up (Supabase Auth)
- Profile setup: name, category, bio, links
- Upload audio/image/video assets
- Add metadata: title, description, usage categories, pricing range
- Define licensing terms: usage type, regions, duration, exclusivity, price range
- Approve / reject / modify incoming inquiries

### Company-side
- IP listing page with category filters
- Asset detail with terms, pricing, and preview
- Structured inquiry form: purpose, platforms, timeline, budget, commercial use, regions, notes

### System features
- Logging of IP data, inquiries, approvals, terms, and timestamps
- Email notifications (creator: inquiry received; company: decision sent)
- Internal admin screen to view logs, remove abusive users, monitor health

---

## 4. Out of Scope (MVP)

- Payments (Stripe)
- Automated contract generation
- Blockchain rights registry
- Multi-user teams
- Analytics dashboard
- Enterprise API
- Advanced search/filters

---

## 5. Architecture (MVP)

Tech stack: Next.js 14, React, TailwindCSS, shadcn/ui, Supabase (Auth + DB + Storage), optional Supabase Edge Functions.

**Storage:** Supabase Storage for audio, images, videos.

**Simplified data model**

```
users
  id
  email
  role (creator/company)
  category
  profile

ip_assets
  id
  user_id
  title
  description
  file_url
  category
  terms_json
  price_min
  price_max

inquiries
  id
  creator_id
  company_id
  ip_id
  message
  usage
  region
  budget
  status (pending/approved/rejected)
  created_at

logs
  id
  inquiry_id
  event_type
  timestamp
```

---

## 6. Screens & UX

- **Creator Dashboard:** upload IP, set terms, view inquiries, approve/reject
- **Public IP Listing (company view):** preview cards, category filter, links to detail
- **IP Detail Page:** asset preview, terms, price range, “Request License” button
- **Inquiry Form:** purpose, platform, budget, region, timeline, submit
- **Admin Log:** all inquiries, status, system health

---

## 7. Development Timeline (4 Weeks)

- **Week 1:** data model, auth, creator dashboard, IP upload
- **Week 2:** public listing page, IP detail, inquiry flow
- **Week 3:** approval workflow, notifications, logging, admin panel
- **Week 4:** polish, onboard PoC participants, run PoC

---

## 8. Success Criteria

**Functional**
- Creators upload IP without confusion
- Companies complete inquiry flow
- Approvals run smoothly
- Logs capture the right data

**Quantitative targets**
- 100 creators registered
- 30+ inquiries
- >50% inquiry → approval rate
- Positive feedback in interviews

---

## 9. Future Roadmap

- **v2:** contract generation, AI pricing recommendations, integrated payments, multi-language support
- **v3:** enterprise API, rights registry layer, global marketplace expansion

---

## Summary

This MVP delivers the smallest functional product needed to validate standardized IP licensing, support PoC execution, and clearly communicate the path to investors.

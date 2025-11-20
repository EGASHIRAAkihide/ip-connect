# PoC Specification – IP Connect (v0.1)

## 1. Purpose of the PoC

The goal of this PoC is to validate whether creators (voice actors, illustrators, choreographers) and companies experience tangible value from a simplified, transparent IP licensing workflow.  
The PoC tests **desirability**, **usability**, and **basic transaction flow** without full automation.

---

## 2. Target Persona

### **1. Voice Actors / VTubers**
- Want clear pricing and usage scope
- Want to avoid unclear overseas rights usage
- Desire safer and traceable licensing workflow

### **2. Illustrators**
- Receive non-standard DM-based requests
- Unsure about secondary usage terms
- Need a unified licensing page and contract clarity

### **3. Choreographers / Dancers**
- Viral choreography spreads without attribution or payment
- No standard process for ads / games / events to license choreography

---

## 3. PoC Scope

### **In Scope**
- Creator onboarding (manual)
- Uploading sample IP assets (voice / illustration / dance)
- Simple license listing page (Notion or prototype UI)
- Inquiry form & workflow simulation
- Manual approval + pricing simulation
- Basic transaction logging (spreadsheet or simple DB)

### **Out of Scope (Full product features)**
- Automated contract generation
- Full backend rights engine
- Automated pricing recommendations
- Integrated payment system
- Multi-language contract support

---

## 4. What We Want to Validate

### **Desirability**
- Do creators want a unified IP licensing system?
- Do companies prefer a standardized inquiry → approval workflow?

### **Usability**
- Can companies understand the pricing & usage terms in less than 1 minute?
- Is the inquiry → approval → confirmation flow intuitive?

### **Feasibility**
- Can we manually operate the licensing workflow?
- Are creators able to define usage terms clearly enough?

### **Viability**
- Will companies pay for usage?
- Do creators accept the proposed transaction model?

---

## 5. PoC Success Metrics (v0.1)

### Quantitative
- **50+ booth visitors (event validation)**
- **15+ creators onboarded**
- **10+ licensing inquiries from companies**
- **3 paid sample transactions simulated**

### Qualitative
- Creators say:
  - “This makes licensing easier”
  - “I want this for real”
- Companies say:
  - “The terms are clear”
  - “We can evaluate assets faster than before”

---

## 6. PoC Flow

1. Recruit creators (voice, illustration, dance)
2. Collect assets + usage terms + pricing
3. Create prototype listing (Notion or simple UI)
4. Invite companies to browse
5. Companies submit inquiries via form
6. Manual approval process  
7. Log inquiry and feedback  
8. Conduct 1:1 interviews with both sides

---

## 7. Timeline

- **Day 1–3:** Creator onboarding  
- **Day 4–6:** Prototype listing creation  
- **Day 7–10:** Company outreach & inquiry testing  
- **Day 11–14:** Interviews / Analysis / Report  

---

## 8. Deliverables

- PoC report (PDF)
- User interview notes
- Inquiry logs
- Recommendations for MVP


---

## 9. PoC Application Requirements (Minimum Implementation)

This section describes the **minimum application features** required to run the PoC. The goal is to build a simple web application that supports the core workflow:

> Creator uploads IP → Company submits inquiry → Creator approves/rejects

The focus is **functionality**, not design or automation.

---

### 9.1 In-Scope Features for the PoC App

#### A. Creator Features

- Email + password sign-up & login (simple auth)
- Creator dashboard
  - View list of own IP assets
  - Button to create a new IP asset
- IP asset creation
  - Title (text)
  - Description (long text)
  - Category (Voice / Illustration / Choreography)
  - File upload (audio / image / video)
  - Basic usage terms (preset options)
  - Price range (e.g., $100–$300)
- Inquiry inbox
  - View list of inquiries related to their IP
  - View inquiry details
  - Approve / Reject buttons (status update only)

#### B. Company-Side Features

- Public IP listing page
  - List of IP assets (cards with title + thumbnail + category)
- IP detail page
  - Asset preview (audio/image/video)
  - Terms overview
  - Price range overview
  - “Request license” button
- Inquiry form
  - Usage purpose (e.g., Ad / SNS / Game / VTuber / Event)
  - Region (JP / Global)
  - Intended usage period (free text or preset)
  - Budget (optional)
  - Free text message
  - Submit button

#### C. System Features

- Basic logging of:
  - IP asset creation
  - Inquiry creation
  - Inquiry status changes (pending → approved / rejected)
- Optional simple email notification to creators when a new inquiry is submitted (if time allows).

---

### 9.2 Out-of-Scope Features for PoC App

The following features are **explicitly excluded** from the PoC app and should **not** be implemented at this stage:

- Integrated payment system (e.g., Stripe)
- Automated contract generation
- Advanced search and filtering
- Analytics dashboards
- Multi-user teams / studios
- Enterprise admin console
- Multi-language UI support
- Roles & permissions beyond simple creator/company distinction

These may be considered in the MVP phase, not in this PoC.

---

### 9.3 Minimum Data Model

A simple relational data model is sufficient. Example (for Supabase/PostgreSQL):

```sql
-- Users: creators and companies
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('creator', 'company')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- IP assets owned by creators
CREATE TABLE ip_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'voice' | 'illustration' | 'choreography'
  file_url TEXT NOT NULL,
  terms JSONB, -- usage terms as JSON
  price_min INTEGER,
  price_max INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Licensing inquiries from companies
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_id UUID NOT NULL REFERENCES ip_assets(id),
  creator_id UUID NOT NULL REFERENCES users(id),
  company_id UUID NOT NULL REFERENCES users(id),
  purpose TEXT,
  region TEXT,
  period TEXT,
  budget INTEGER,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

This schema can be adjusted during implementation, but it captures the **minimum entities and relationships** needed for the PoC.

---

### 9.4 Screens Overview (Wireframe-Level)

The PoC app requires only a few simple screens:

1. **Creator Dashboard**
   - List of own IP assets
   - “New IP” button

2. **IP Creation / Edit Screen**
   - Form for title, description, category, file upload, terms, and price range

3. **Public IP Listing Page (Company View)**
   - Grid or list of IP cards
   - Clicking a card opens the detail page

4. **IP Detail Page**
   - Asset preview
   - Usage terms
   - Price range
   - “Request license” button

5. **Inquiry Form**
   - Purpose, region, period, budget, message
   - Submit button

6. **Creator Inquiry Inbox**
   - List of inquiries
   - Inquiry detail view with Approve / Reject buttons

No complex navigation or design system is required for PoC; clarity and reliability are prioritized over aesthetics.

---

### 9.5 Suggested Tech Stack for the PoC

The PoC should be built with a stack optimized for **speed of development**:

- **Frontend:** Next.js (React)
- **Styling:** Tailwind CSS (minimal styling)
- **Backend & Auth:** Supabase (Auth + Postgres + Storage)
- **Storage:** Supabase Storage (for audio/image/video files)
- **Deployment:** Vercel or Supabase-hosted

This stack allows rapid iteration and easy transition to an MVP later.

---

### 9.6 PoC Test Checklist

Before running the PoC with real users, verify the following:

#### Creator Flow
- [ ] Creator can sign up and log in
- [ ] Creator can upload at least one IP asset
- [ ] Creator can view an inquiry related to their IP
- [ ] Creator can change inquiry status to approved/rejected

#### Company Flow
- [ ] Company can view the public IP listing
- [ ] Company can open an IP detail page
- [ ] Company can submit an inquiry

#### System
- [ ] All key actions are stored in the database
- [ ] No critical errors occur during normal usage
- [ ] Basic validation prevents empty/invalid submissions

This completes the **minimum technical specification** required to support the PoC described in sections 1–8.
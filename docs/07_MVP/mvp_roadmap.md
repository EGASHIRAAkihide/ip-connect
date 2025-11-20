# MVP Roadmap – IP Connect (2-Week Build Plan)

## Goal

Build the smallest functional version of IP Connect that demonstrates the full licensing workflow:

> **Creator registers IP → Company browses → Company requests usage → Creator approves → Deal logged**

MVP focuses on *workflow*, not automation.

---

## Week 1

### **Day 1–2: Core Setup**
- Create project repo & folder structure
- Set up Next.js (or Remix) + Supabase
- Create DB tables:
  - users
  - creator_profiles
  - ip_assets
  - license_terms
  - inquiries
  - approvals

### **Day 3–4: Creator Side**
- Creator signup / login
- Dashboard layout
- Upload IP asset (image/audio/video URL)
- Define usage terms (price, purpose, duration, region)

### **Day 5–6: Company Side**
- IP Browsing page
- Filter by category (voice / illustration / dance)
- Asset detail page (usage terms visible)
- Inquiry submission form

---

## Week 2

### **Day 7–8: Licensing Workflow**
- Inquiry → Creator notification (email or in-app)
- Creator “Approve / Reject” interface
- Inquiry status change (Pending → Approved / Rejected)
- Logging the transaction

### **Day 9–10: Admin & Audit**
- Admin dashboard
- Event logs (CRUD operations)
- Basic analytics (views, inquiries)

### **Day 11–12: UI Polish**
- Responsive layout
- Minimal branding
- Creator-centered visual tone

### **Day 13–14: Testing & Demo Prep**
- Insert dummy data
- Create demo flow for investors
- Finalize screencast / demo script

---

## MVP Success Criteria

💠 **Functional**
- Creator can upload IP + define terms  
- Company can browse and request usage  
- Creator can approve requests  
- Basic rights log is stored  

💠 **Desirability**
- 10+ creators onboard  
- 5+ companies test browsing  
- 3+ real licensing inquiries during demo  

💠 **Fundraising Readiness**
- Live demo is repeatable  
- Architecture is explainable in 1 slide  
- MVP shows clear market validation  

---

## Additional Notes

- Payments are not included in MVP (PoC validation first)  
- Multi-language support is optional (JP→EN later)  
- Contract automation is V2  
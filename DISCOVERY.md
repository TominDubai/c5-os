# C5 OS — Discovery Document

**Company:** Concept 5 Kitchen & Wood Industries L.L.C  
**Started:** 2026-02-11  
**Status:** Discovery  

---

## 1. Overview

C5 OS is a project management and production tracking system for Concept 5, a joinery company specializing in kitchens, wardrobes, vanities, and custom woodwork. The system manages the full lifecycle from client enquiry through workshop production to site installation and handover.

### Key Differentiator from Bolsover OS
- **Two-stage delivery:** Workshop fabrication → Site installation
- **Item-level tracking:** Every piece tracked from quote to installed
- **Production scheduling:** Workshop capacity and job queuing
- **Dual QC gates:** Workshop sign-off + Site verification with photos

---

## 2. Organization Structure

### Leadership
| Name | Role |
|------|------|
| Jerry Gallagher | CEO / Founder |
| Tom Brooks | Managing Director |
| Darren Dinglasan | Production Design Director |
| Aftab Khan | General Manager |
| Jinky Restrivera | Operations Manager |

### Departments

#### Designers (~15 people)
- **Head:** Raham Bautista
- **Team:** Robinson Dsouza, Louie Bautista, Catherine Ortega, Ankita Gohil, Mari Manoj, + 6 new designers
- **3D Specialists:** Hitesh Jangir, Arun Kumar Jangid
- **Function:** Create shop drawings after payment received

#### Factory Production (~52 workshop staff)
- **Production Manager:** Gajanand Jangir
- **QS:** Danilo (quality checks)
- **QTY Take-off:** Sachin
- **Stores:** Usman
- **Workshop Team:**
  - Carpenters: 28
  - Painters: 14
  - Helpers: 10
- **Function:** Build items per production schedule, QC before dispatch

#### Project Managers (5 PMs + 38 site staff + 5 drivers)
- **PMs:** Mohammad Basim, Richard Galloway, Akash Asdeo, Dipak, Salman
- **Site Team:**
  - Carpenters: 29
  - Painters: 4
  - Helpers: 5
- **Drivers:** 5
- **Function:** Site installation, coordination, daily reports, snagging

#### Admin & Accounts (~4 people)
- **Lead:** Jean Suarez
- **Team:** April Valencia
- **Senior Estimator:** Ramus Bautista
- **Junior Estimator:** (New hire)
- **Function:** Quoting, invoicing, accounts

---

## 3. Core Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              C5 PROJECT LIFECYCLE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SALES PHASE                                                                │
│  ───────────                                                                │
│  Client Enquiry → Renderings/Concept → Ramus Quote → Client Approval        │
│                                              │                              │
│                                              ▼                              │
│                                    💰 PAYMENT RECEIVED                      │
│                                              │                              │
│  DESIGN PHASE                                │                              │
│  ────────────                                ▼                              │
│                              Raham Creates Shop Drawings                    │
│                                              │                              │
│                                              ▼                              │
│                              ✍️  DocuSign Client Approval                   │
│                                              │                              │
│  PRODUCTION PHASE                            │                              │
│  ────────────────                            ▼                              │
│                              Gajanand Schedules Production                  │
│                                              │                              │
│                                              ▼                              │
│                              Workshop Fabricates Items                      │
│                                              │                              │
│                                              ▼                              │
│                              ✅ Danilo QC (Workshop)                        │
│                                              │                              │
│  DELIVERY PHASE                              │                              │
│  ──────────────                              ▼                              │
│                                    Dispatch to Site                         │
│                                              │                              │
│  INSTALLATION PHASE                          │                              │
│  ──────────────────                          ▼                              │
│                              PM + Site Team Install                         │
│                                              │                              │
│                                              ▼                              │
│                              ✅ Danilo Site QC (with photos)                │
│                                              │                              │
│                                              ▼                              │
│                                        HANDOVER                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Critical Gates (No Bypass)

| Gate | Trigger | Owner | Requirement |
|------|---------|-------|-------------|
| **Design Start** | Payment received | Accounts | Cannot start shop drawings without payment |
| **Production Start** | DocuSign approval | Client/Tom | Cannot cut until drawings signed off |
| **Dispatch** | Workshop QC passed | Danilo | All items checked before leaving |
| **Handover** | Site QC completed | Danilo | Photo evidence of installed items |

---

## 4. Item Code System

### Format
```
26XX - K - GF - RM05 - 102
  │    │    │     │      │
  │    │    │     │      └── Item sequence number
  │    │    │     └── Room number (RM01, RM02, etc.)
  │    │    └── Floor code
  │    └── Type code
  └── Job/Project code
```

### Type Codes ✓
| Code | Type |
|------|------|
| K | Kitchen |
| W | Wardrobes |
| V | Vanity |
| T | TV Unit |
| J | Joinery (other) |

### Floor Codes
| Code | Floor |
|------|-------|
| BF | Basement Floor |
| GF | Ground Floor |
| FF | First Floor |
| SF | Second Floor |
| RF | Roof Floor |

### Rules
- Codes assigned by Ramus at quoting stage
- Same code follows item through entire lifecycle
- Code must be unique within a project
- Enables filtering, sorting, and tracking at any stage

---

## 5. Item Status Tracking

Every item moves through these statuses:

```
┌──────────────┐    ┌───────────────┐    ┌────────────┐
│ PRE-PRODUCTION │───▶│ IN PRODUCTION │───▶│ DISPATCHED │
└──────────────┘    └───────────────┘    └────────────┘
                                               │
                                               ▼
┌──────────────┐    ┌───────────────┐    ┌────────────┐
│ QS VERIFIED  │◀───│   INSTALLED   │◀───│  ON SITE   │
└──────────────┘    └───────────────┘    └────────────┘
```

| Status | Meaning | Set By |
|--------|---------|--------|
| Pre-Production | Drawings approved, waiting to be made | System (auto after DocuSign) |
| In Production | Currently being fabricated | Gajanand / Workshop |
| Dispatched | Left workshop, in transit | Usman / Driver |
| On Site | Arrived at site, not yet installed | PM |
| Installed | Fitted by site team | Site Carpenter |
| QS Verified | Checked and photographed | Danilo |

---

## 6. System Modules

### 6.1 Enquiries & Quotes
**Owner:** Ramus (Senior Estimator)

**Features:**
- Create enquiry from client request
- Attach renderings/concept images
- Build quote with item codes
- Track quote status (Draft → Sent → Approved → Rejected)
- Convert approved quote to project (on payment)

**Key Fields:**
- Client details
- Project type (Kitchen, Wardrobe, Full Fit-out, etc.)
- Location
- Renderings (file uploads)
- Quote line items with codes
- Total value
- Validity period

---

### 6.2 Projects
**Owner:** Jinky / PMs

**Features:**
- Master project record (created from approved quote)
- Project timeline
- Assigned PM
- Budget tracking
- Document storage
- Activity log

**Key Fields:**
- Project code
- Client reference
- Site address
- PM assigned
- Design status
- Production status
- Installation status
- Value / Invoiced / Paid

---

### 6.3 Design Management
**Owner:** Raham (Head of Design)

**Features:**
- Assign project to designer
- Upload shop drawings (per room/area)
- Drawing revision tracking
- DocuSign integration for approvals
- Track approval status per drawing set

**Workflow:**
1. Project assigned to designer
2. Designer creates shop drawings
3. Drawings uploaded to system
4. DocuSign envelope created
5. Client signs off
6. Status → Approved (triggers production eligibility)

---

### 6.4 Production Management
**Owner:** Gajanand (Production Manager)

**Features:**
- View approved projects ready for production
- Schedule jobs into workshop capacity
- Assign to workshop teams
- Track item production status
- Mark items complete

**Views:**
- Production queue (what's waiting)
- In-progress (what's being made)
- Workshop capacity/calendar
- Item checklist per project

---

### 6.5 QC — Workshop
**Owner:** Danilo

**Features:**
- View items ready for QC
- Checklist per item type
- Pass/Fail with notes
- Photo upload (optional at workshop)
- Sign-off timestamp
- Reject → back to production with reason

---

### 6.6 Dispatch
**Owner:** Usman (Stores) + Drivers

**Features:**
- Create dispatch note (select items)
- Assign driver
- Delivery date/time
- Site contact (PM)
- Driver confirmation (mobile)
- Track delivery status

---

### 6.7 Site Management
**Owner:** PMs

**Features:**
- View dispatched items en route
- Confirm receipt on site
- Daily reports (like Bolsover)
- Installation progress
- Mark items as installed
- Raise snags

---

### 6.8 QC — Site (Snagging)
**Owner:** Danilo

**Features:**
- Site visit scheduler
- Item-by-item QC checklist
- **Mandatory photo upload** per item
- Pass/Fail/Snag
- Snag tracking to resolution
- Final sign-off

---

### 6.9 Item Tracker (Cross-cutting)
**All Users**

**Features:**
- Search items by code, project, status
- View item journey (timeline)
- Filter by status, floor, room, type
- Bulk status updates
- Export for reporting

---

### 6.10 Dashboard & Reporting
**Owner:** Tom / Jinky / Aftab

**Features:**
- Overview of all projects by status
- Production bottlenecks
- Items stuck in status
- QC pass/fail rates
- Revenue pipeline
- PM workload

---

## 7. User Roles & Permissions

| Role | Access |
|------|--------|
| **Admin (Tom/Jerry/Aftab)** | Full access, approvals, settings |
| **Operations (Jinky)** | All modules, reports |
| **Estimator (Ramus)** | Enquiries, Quotes, Item codes |
| **Design Lead (Raham)** | Design module, project view |
| **Designer** | Assigned projects only |
| **Production Mgr (Gajanand)** | Production, scheduling |
| **QS (Danilo)** | Workshop QC, Site QC |
| **Stores (Usman)** | Dispatch, inventory |
| **PM** | Assigned projects, site, daily reports |
| **Site Staff** | Daily reports (mobile) |
| **Driver** | Dispatch confirmation (mobile) |

---

## 8. Integrations

### Required
| System | Purpose | Priority |
|--------|---------|----------|
| **DocuSign** | Drawing approvals | High (needs setup) |
| **Supabase Storage** | File/photo uploads | High |

### Future
| System | Purpose | Priority |
|--------|---------|----------|
| **Zoho Books** | Accounting sync | Medium |
| **WhatsApp** | Notifications | Low |

---

## 9. Mobile Requirements

### Site Staff App (Similar to Bolsover)
- Daily report submission
- Photo uploads
- Simple, big buttons

### Driver App
- View assigned deliveries
- Confirm pickup/delivery
- Signature capture (optional)

### QS App (Danilo)
- Site QC checklist
- Photo capture per item
- Pass/Fail/Snag buttons

---

## 10. Open Questions

1. ~~What does Gajanand currently use for scheduling?~~ **Excel**
2. ~~Are there existing spreadsheets to import?~~ **Yes, Gaju's Excel**
3. ~~Full list of item type codes?~~ **K, W, V, T, J (confirmed)**
4. ~~Workshop capacity — how many jobs can run in parallel?~~ **Defer — depends on items, revisit later**
5. ~~Standard QC checklist items per product type?~~ **Keep generic: matches drawing + finish quality**
6. Do drivers need signature capture on delivery?
7. Integration priority with Zoho Books?

---

## 11. Technical Decisions (Proposed)

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| **Codebase** | Separate from Bolsover OS | Different workflows, cleaner separation |
| **Tech Stack** | Next.js + Supabase (same as Bolsover) | Consistency, shared learning |
| **Mobile** | Expo (React Native) | Same as Bolsover mobile |
| **Hosting** | Vercel + Supabase | Same as Bolsover |

---

## 12. Next Steps

1. ✅ Discovery complete (this document)
2. ⬜ Tom to review and add missing details
3. ⬜ Create USER-FLOWS.md (detailed workflows per role)
4. ⬜ Create WIREFRAMES.md (screen designs)
5. ⬜ Create DATABASE-SCHEMA.md (tables and relationships)
6. ⬜ Set up C5 OS repo
7. ⬜ Build MVP

---

*Document created: 2026-02-11*  
*Last updated: 2026-02-11*

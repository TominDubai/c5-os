# C5 OS — User Flows

Detailed workflows for each role showing who does what, when, and what triggers the next step.

---

## Flow 1: Enquiry to Quote (Ramus)

**Actor:** Ramus (Senior Estimator)  
**Trigger:** New client enquiry received  

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENQUIRY TO QUOTE FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. Client contacts C5 (call/email/referral)
                    │
                    ▼
2. Ramus creates ENQUIRY
   • Client name, contact, location
   • Project type (Kitchen/Wardrobe/Full fit-out)
   • Source (referral, website, etc.)
   • Attach renderings/concept images
                    │
                    ▼
3. Ramus reviews renderings
   • Assesses scope
   • Notes special requirements
                    │
                    ▼
4. Ramus creates QUOTE
   • Line items with item codes (26XX-K-GF-RM01-001)
   • Descriptions
   • Unit prices
   • Quantities
   • Total calculated
   • Validity period (30 days?)
                    │
                    ▼
5. Quote status: DRAFT
                    │
                    ▼
6. Ramus sends quote to client
   • PDF export or email from system
   • Status → SENT
                    │
                    ▼
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
   APPROVED             REJECTED
   (client accepts)     (lost enquiry)
         │                   │
         ▼                   ▼
   Await Payment        Archive
         │
         ▼
   Payment Received
   (Accounts confirms)
         │
         ▼
   CREATE PROJECT
   (auto from quote)
```

**Outputs:**
- Enquiry record
- Quote with item codes
- Project created on payment

---

## Flow 2: Project Setup (Jinky/Accounts)

**Actor:** Jinky (Operations) / Jean (Accounts)  
**Trigger:** Payment received for approved quote  

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROJECT SETUP FLOW                           │
└─────────────────────────────────────────────────────────────────┘

1. Jean confirms payment received
                    │
                    ▼
2. System creates PROJECT from Quote
   • Project code assigned
   • All quote items copied as project items
   • Status: DESIGN PENDING
                    │
                    ▼
3. Jinky assigns PM to project
   • Select from available PMs
   • PM notified
                    │
                    ▼
4. Jinky assigns to Design
   • Select designer from Raham's team
   • Designer notified
   • Status → IN DESIGN
```

**Outputs:**
- Project record with assigned PM and Designer
- Items in PRE-PRODUCTION status (waiting for drawings)

---

## Flow 3: Shop Drawings & Approval (Raham's Team)

**Actor:** Raham / Designers  
**Trigger:** Project assigned to design  

```
┌─────────────────────────────────────────────────────────────────┐
│                 SHOP DRAWINGS FLOW                              │
└─────────────────────────────────────────────────────────────────┘

1. Designer receives project assignment
   • Views project details
   • Reviews renderings
   • Reviews item list from quote
                    │
                    ▼
2. Designer creates shop drawings
   • Per room/area
   • Includes all item codes
   • Upload to system (PDF/CAD)
                    │
                    ▼
3. Raham reviews drawings
   • Quality check
   • Approve for client submission
   • Status → READY FOR APPROVAL
                    │
                    ▼
4. System creates DocuSign envelope
   • Drawings attached
   • Client email as signer
   • Send for signature
                    │
                    ▼
5. Client reviews and signs
         │
         ▼
   ┌─────┴─────┐
   │           │
   ▼           ▼
SIGNED      REJECTED
   │        (with comments)
   │           │
   │           ▼
   │        Return to Step 2
   │        (revise drawings)
   │
   ▼
6. DocuSign webhook updates system
   • Drawing status → APPROVED
   • All items → PRE-PRODUCTION (ready)
   • Gajanand notified
```

**Outputs:**
- Approved shop drawings stored
- Items eligible for production scheduling

---

## Flow 4: Production Scheduling (Gajanand)

**Actor:** Gajanand (Production Manager)  
**Trigger:** Drawings approved, items ready for production  

```
┌─────────────────────────────────────────────────────────────────┐
│               PRODUCTION SCHEDULING FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. Gajanand views PRODUCTION QUEUE
   • All items in PRE-PRODUCTION
   • Filtered by project, type, priority
                    │
                    ▼
2. Gajanand schedules items
   • Select project/items
   • Assign target production week
   • Optionally assign workshop team
                    │
                    ▼
3. Items appear on PRODUCTION SCHEDULE
   • Calendar/Gantt view by week
   • Workshop team can see assignments
                    │
                    ▼
4. Production starts
   • Workshop marks item: IN PRODUCTION
   • Timestamp recorded
                    │
                    ▼
5. Item fabrication complete
   • Workshop marks item: READY FOR QC
   • Danilo notified
```

**Outputs:**
- Items scheduled with target dates
- Production progress visible
- Items queued for QC

---

## Flow 5: Workshop QC (Danilo)

**Actor:** Danilo (QS)  
**Trigger:** Items marked ready for QC  

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKSHOP QC FLOW                             │
└─────────────────────────────────────────────────────────────────┘

1. Danilo views QC QUEUE
   • Items in READY FOR QC status
   • Grouped by project
                    │
                    ▼
2. Danilo inspects item
   • Compare to production drawing
   • Check finish quality
                    │
                    ▼
3. QC Decision
         │
   ┌─────┴─────┐
   │           │
   ▼           ▼
 PASS        FAIL
   │           │
   │           ▼
   │        Log defect/reason
   │        Return to production
   │        Status → IN PRODUCTION
   │           │
   │           ▼
   │        Workshop fixes
   │        Back to Step 1
   │
   ▼
4. Item passes QC
   • Status → READY FOR DISPATCH
   • Usman notified
   • QC timestamp + Danilo's sign-off recorded
```

**Outputs:**
- QC pass/fail recorded
- Passed items available for dispatch

---

## Flow 6: Dispatch (Usman + Driver)

**Actor:** Usman (Stores), Driver  
**Trigger:** Items passed QC, PM requests delivery  

```
┌─────────────────────────────────────────────────────────────────┐
│                      DISPATCH FLOW                              │
└─────────────────────────────────────────────────────────────────┘

1. Usman views READY FOR DISPATCH
   • Items grouped by project
   • PM delivery requests (if any)
                    │
                    ▼
2. Usman creates DISPATCH NOTE
   • Select items to dispatch
   • Assign driver
   • Delivery date/time
   • Site contact (PM name + phone)
                    │
                    ▼
3. Items loaded
   • Status → DISPATCHED
   • Driver receives dispatch note (mobile)
                    │
                    ▼
4. Driver delivers to site
   • Confirms delivery (mobile)
   • Status → ON SITE
   • PM notified
```

**Outputs:**
- Dispatch note with item list
- Delivery confirmation
- Items tracked to site

---

## Flow 7: Site Installation (PM + Site Team)

**Actor:** PM, Site Carpenters  
**Trigger:** Items arrive on site  

```
┌─────────────────────────────────────────────────────────────────┐
│                   SITE INSTALLATION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. PM confirms delivery receipt
   • Checks items against dispatch note
   • Flags any missing/damaged items
                    │
                    ▼
2. PM plans installation
   • Assigns site team
   • Sets sequence (which room first, etc.)
                    │
                    ▼
3. Site team installs items
   • Carpenter marks item: INSTALLED
   • Timestamp recorded
                    │
                    ▼
4. All items installed
   • PM requests site QC
   • Danilo notified/scheduled
```

**Outputs:**
- Installation progress tracked per item
- Ready for final QC

---

## Flow 8: Site QC & Handover (Danilo + PM)

**Actor:** Danilo (QS), PM  
**Trigger:** Installation complete, QC requested  

```
┌─────────────────────────────────────────────────────────────────┐
│                  SITE QC & HANDOVER FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. Danilo visits site
   • Scheduled QC visit
                    │
                    ▼
2. Danilo inspects each installed item
   • Compare to drawing
   • Check installation quality
   • TAKE PHOTO (mandatory)
                    │
                    ▼
3. Per-item decision
         │
   ┌─────┴─────┐
   │           │
   ▼           ▼
 PASS        SNAG
   │           │
   │           ▼
   │        Log snag details
   │        Assign to site team
   │        Photo of defect
   │           │
   │           ▼
   │        Site team fixes
   │        Re-inspect
   │
   ▼
4. Item verified
   • Status → QS VERIFIED
   • Photo stored as proof
                    │
                    ▼
5. All items verified?
         │
   ┌─────┴─────┐
   │           │
   ▼           ▼
  YES         NO
   │           │
   │           ▼
   │        Return to Step 2
   │        (for remaining items)
   │
   ▼
6. PROJECT COMPLETE
   • Final sign-off
   • Handover to client
   • Status → COMPLETED
```

**Outputs:**
- Photo evidence for every installed item
- Snag list with resolutions
- Project completion record

---

## Flow 9: Daily Reports (Site Staff)

**Actor:** Site Staff (Carpenters, Helpers)  
**Trigger:** End of work day  

```
┌─────────────────────────────────────────────────────────────────┐
│                    DAILY REPORT FLOW                            │
└─────────────────────────────────────────────────────────────────┘

1. Site staff opens mobile app
   • Selects project
                    │
                    ▼
2. Fills daily report
   • Date (auto today)
   • Weather
   • Work completed
   • Issues/blockers
   • Attendance count
   • Photos (optional)
                    │
                    ▼
3. Submits report
   • PM notified
   • Report visible in project timeline
```

**Outputs:**
- Daily site activity log
- Photo documentation

---

## Flow 10: Dashboard & Monitoring (Tom/Jinky)

**Actor:** Tom (MD), Jinky (Ops Manager)  
**Trigger:** Ongoing monitoring  

```
┌─────────────────────────────────────────────────────────────────┐
│                    DASHBOARD VIEWS                              │
└─────────────────────────────────────────────────────────────────┘

OVERVIEW DASHBOARD
├── Projects by status (Design/Production/Site/Complete)
├── Revenue pipeline
├── Items stuck in status (bottleneck alerts)
└── Today's dispatches / deliveries

PRODUCTION VIEW
├── Workshop schedule (Gantt)
├── QC pass/fail rates
├── Items waiting > X days
└── Production capacity

SITE VIEW
├── Projects in installation
├── Pending QC visits
├── Open snags
└── Upcoming handovers

TEAM VIEW
├── PM workload
├── Designer workload
├── Driver schedule
└── Danilo's QC schedule
```

---

## Status Transition Summary

```
QUOTE ITEMS                    PROJECT ITEMS
────────────                   ─────────────
  (Quote approved + Paid)
         │
         ▼
                              PRE-PRODUCTION
                                    │
                        (Drawings approved)
                                    │
                                    ▼
                              IN PRODUCTION
                                    │
                          (Fabrication done)
                                    │
                                    ▼
                              READY FOR QC
                                    │
                           (Danilo passes)
                                    │
                                    ▼
                            READY FOR DISPATCH
                                    │
                             (Usman ships)
                                    │
                                    ▼
                               DISPATCHED
                                    │
                            (Driver delivers)
                                    │
                                    ▼
                                ON SITE
                                    │
                            (Carpenter fits)
                                    │
                                    ▼
                               INSTALLED
                                    │
                          (Danilo site QC)
                                    │
                                    ▼
                              QS VERIFIED ✓
```

---

*Document created: 2026-02-11*

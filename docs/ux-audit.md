# Health Arabia UX Audit

Source: Figma file `T4lscZxor3C5196h5KzSEA` (Al-Maher - Health Arabia - Final), page `Design` (351:570).
Audit date: 2026-10-25. Read-only; no Figma or code changes were made.

## Scope and access limits

- Figma account: Eslam Elbarbary, View seat. The file is owned by a Professional-plan team.
- Figma MCP limit for View/Collab seats: 20 read tool calls per month. The limit was reached during this audit, so 31 of 38 frames were not rendered.
- Repository state at audit time: no application code, no stack chosen.
- A screen that is missing from Figma means it is **not yet designed**. It does not mean the feature is out of scope.

### Evidence levels

| Level | Meaning |
|---|---|
| Visually verified | Rendered screenshot was inspected |
| Node/prototype data | Read from Figma node properties (fonts, colors, images, components, hidden layers, sizes) or prototype links |
| Layer names | Taken from text layer names only. Layer names sometimes differ from displayed text, so treat as likely, not confirmed |

## Confirmed business rules

1. The platform approves doctor and facility accounts before use.
2. Facilities submit jobs; the platform approves them before publication.
3. Doctors can apply only after account approval.
4. A facility sees each applicant anonymously: job title, specialty, and years of experience only.
5. A hospital can submit a hire request for one, multiple, or all applicants under a posted job. Each selected applicant is linked to their own request, and their identity stays hidden.
6. The platform coordinates privately with the facility. After agreement, it reveals the selected doctor's full details and creates a group chat with the doctor, facility, and platform.
7. Each facility has one account; recruitment officer details are collected during registration.
8. The home "Upload Your CV" banner is a separate path for a registered doctor who has not uploaded a CV.

## Screen inventory

| Flow | Frame | Node | Visual check |
|---|---|---|---|
| Visitor | Home | 351:571 | Verified |
| Visitor | About Us | 351:824 | Verified |
| Visitor | Countries | 351:953 | Verified |
| Visitor | Hospitals | 351:1065 | Verified |
| Visitor | Country Details | 358:1339 | Not verified |
| Visitor | Hospital Details | 371:1881 | Not verified |
| Visitor | FAQs | 351:1197 | Not verified |
| Visitor | Contact Us | 351:1563 | Not verified |
| Visitor/Doctor | Available Jobs | 351:1303 | Not verified |
| Visitor/Doctor | Job Details | 421:6082 | Not verified |
| Visitor/Doctor | Apply Job | 421:6725 | Not verified |
| Visitor/Doctor | Pop "Application Submitted" | 424:5601 | Not verified |
| Entry | Start Now | 375:1434 | Not verified |
| Entry | Join as (overlay) | 480:2254 | Not verified |
| Entry | Countries menu (overlay) | 441:3788 | Not verified |
| Doctor | Doctor Login | 375:1675 | Not verified |
| Doctor | Doctor Step 1-6 | 384:2057, 386:2338, 386:2534, 389:2716, 392:3087, 395:3255 | Not verified |
| Doctor | Pop "Your Profile Is Under Review" | 473:2723 | Not verified |
| Doctor | Home - Doctor | 427:2280 | Verified |
| Doctor | Doctor Dashboard | 430:3164 | Not verified |
| Doctor | Doctor Profile | 430:2811 | Not verified |
| Doctor | Dropdown Menu | 428:2715 | Not verified |
| Doctor | CV Upload (overlay) | 351:8170 | Verified |
| Facility | Hostpital Login | 376:1950 | Not verified |
| Facility | Hospital Step 1 / Step 2 | 418:5025, 419:5243 | Not verified |
| Facility | Pop "Sent Successfully" | 473:2743 | Not verified |
| Facility | Home - Hospital | 430:3856 | Verified |
| Facility | Hospital Dashboard | 440:2294 | Not verified |
| Facility | Hospital Profile | 430:4258 | Not verified |
| Facility | Request Medical Staff | 440:3528 | Not verified |
| Facility | Hospital Settings | 564:9584 | Not verified |
| Facility | Dropdown Menu | 430:4233 | Not verified |
| Shared | Header component (24 variants) | 551:5802 | Default variant (551:5801) only |
| Platform admin | — | — | Not yet designed |

Other material: Cover and color palettes (27:1401, 347:4292, 347:4415), Brief (229:2999), Icons page with the Vuesax library (244:2), three reference images from another site (546:2233-546:2235) with an Arabic transcription (551:2225).

Priority: **P0** blocks a confirmed business rule, **P1** broken flow or missing state, **P2** inconsistency, **P3** copy.

## Findings: visually verified

| # | Priority | Frame | Finding |
|---|---|---|---|
| V1 | P1 | Home - Hospital (430:3856) | Shows the doctor CV banner ("Ready to Begin Your Medical Career? / Upload Your CV") and the hero "Apply Now" button to a facility. Conflicts with rule 8. |
| V2 | P1 | Home - Hospital (430:3856) | The facility call to action "Ready to Build Your Medical Team?" is absent, although it appears on the visitor Home. |
| V3 | P1 | CV Upload (351:8170) | Asks for Full Name, Email, Phone, Specialty, Years of Experience, and Preferred GCC Country. Under rule 8 the user is already a registered doctor, so these fields duplicate existing profile data. |
| V4 | P2 | Home, Home - Doctor, Home - Hospital | Both stats tiles read "60 Employers"; only the captions differ. |
| V5 | P2 | Hospitals (351:1065) | All six cards repeat "Zayed Military Hospital, Abu Dhabi", over a photo labeled National Guard Hospital Dammam. |
| V6 | P2 | Home - Doctor (427:2280) | No header nav item is shown as active. |
| V7 | P2 | Home, Home - Hospital | A floating help button covers the "Permanent" badge on the first job card. It is absent on Home - Doctor. |
| V8 | P2 | Home vs. Home - Doctor/Hospital | Section order differs: the CV banner comes before Partners on Home and after it on the logged-in variants. |
| V9 | P2 | Home testimonials, footer | Brand spelled "AlMahrer"; elsewhere "ALMAHER" and "Al-Maher". |
| V10 | P3 | About Us (351:824) | Typo "Direct direct pathways". |
| V11 | P3 | Header (551:5801) | Nav label "Avilable Jobs". |
| V12 | Info | Header (551:5801) | Header shows "Nursing Services for Homes" with no matching screen. |
| V13 | Info | Reference image (546:2233) | The IRC inquiry form has the same fields as Hospital Step 1 + Step 2 (company, city, number of employees, message, "Send Inquiry"). The facility registration appears adapted from a lead form. |

Visually confirmed layout (for implementation reference):
- Home order: header, hero with search bar, stats, Latest Opportunities, CV banner, Partners, Success Stories carousel, "Build Your Medical Team" CTA, Partner With Us, footer.
- Logged-in headers replace "Nursing Services for Homes" and "Join as" with avatar, name, and a dropdown.
- Countries: Saudi Arabia (large card), Bahrain, Qatar, UAE, Oman, Kuwait, each with "See Guide".
- Hospitals: three-column cards with a "Government" badge, plus pagination.

## Findings: confirmed by node/prototype data

| # | Priority | Frame | Finding |
|---|---|---|---|
| N1 | P0 | Whole file | No platform admin screens are designed for approving doctors, facilities, jobs, or hire requests, for private coordination, or for revealing identities. |
| N2 | P0 | Whole file | No facility job submission or job status screens are designed. |
| N3 | P0 | Hospital Dashboard (440:2294) | "Request to hire" has no prototype link. No per-job applicant list, multi-select, select-all, confirmation, or request status is designed (rule 5). |
| N4 | P0 | Whole file | No identity reveal or group chat screens are designed (rule 6). |
| N5 | P0 | Job Details (421:6082) | "Apply Now" links to Apply Job from the visitor header, with no approval gate (rule 3). |
| N6 | P1 | Hospital Step 2 (419:5243) | "Back" links to Doctor Step 1 instead of Hospital Step 1. |
| N7 | P1 | Join as (480:2254) | Doctor option links to Doctor Login; facility option links to Hospital Step 1. Entry points are inconsistent. |
| N8 | P1 | Header (551:5802) | "Join as" button has a navigate action with no destination, alongside its overlay action. |
| N9 | P1 | Doctor Login, Hostpital Login | "Sign In" and "Log In to Portal" have no link. "Forgot Password?" has no link or screen. |
| N10 | P1 | Home - Doctor (427:2280) | CV banner button has no link; only the visitor Home links to CV Upload. |
| N11 | P1 | Request Medical Staff (440:3528) | Submit returns to Home - Hospital with no confirmation. |
| N12 | P1 | Multiple | Unlinked actions: Search Jobs, See More, Home "View details", Save Job, View Application, Request Medical Staff Now (Home), Edit Profile (doctor and hospital), Download CV, doctor menu Settings / Log out / Delete Account, hospital menu Log out, Send Message, Submit Your CV Securely, Nursing Services for Homes. |
| N13 | P1 | All 38 frames | Zero hidden layers and no component variants except Header. No loading, empty, validation, upload-error, or success states exist beyond the three pops. |
| N14 | P1 | All frames | Every screen is 1440px desktop; overlays are 202-800px. No mobile or tablet frames. All copy is English/LTR. |
| N15 | P2 | Hospital Dashboard (440:2294) | No candidate image fills, which is consistent with anonymous applicants (rule 4). |
| N16 | P2 | Design system | Fonts: Carlito (main), Cairo Bold (CV Upload, Hospital Profile), Alexandria Regular 18 (about two per page), Inter (once). 14 corner-radius values (16 most common). Inputs, buttons, stepper, cards, and pops are plain frames, not components. |
| N17 | Info | Prototype | Flow starting points: "Flow 1" at Home, "Flow 2" at Home - Hospital. 450 prototype links in total. |

Color variables: green-500 `#1B8A8A`, green-400 `#49A1A1`, green-50 `#E8F3F3`, blue-500 `#0A2647`, blue-400 `#3B516C`, blue-300 `#5B6E84`, blue-200 `#8E9BAA`, blue-100 `#B3BCC6`, blue-50 `#E7E9ED`, White `#FFFFFF`, Red `#FF3B30`. Unnamed: page background `#F8FAFC`, borders `#E2E8F0`, `#96C9C9`.

## Findings: inferred from layer names (needs visual confirmation)

| # | Priority | Frame | Finding |
|---|---|---|---|
| L1 | P0 | Doctor Step 1-6, Hospital Step 1-2 | No password or account credential field in either registration, although both login screens require one. Later visually verified for Doctor Step 1 (384:2057): fields are photo, full name, date of birth, country, phone only. Confirmed decision: doctors sign up and log in with mobile + password (email optional); facilities log in with the recruitment officer's email + password. **Figma gap:** neither registration flow has a password step, and Hospital Login shows email only. No OTP or new UI is planned yet. |
| L2 | P0 | Apply Job (421:6725) | Re-collects personal data (name, email, date of birth, nationality, gender, CV) that an approved doctor already provided. |
| L3 | P0 | Request Medical Staff (440:3528) | Fields: institution name, country, city, required specialty, number of positions, minimum experience, contract type, description, contact person. It references no job or applicant, so it does not match the hire-request flow (rule 5). Its purpose is unconfirmed; it should not be treated as a job-posting form without client confirmation. |
| L4 | P1 | Hospital Dashboard (440:2294) | "Available Applicants" card shows "Consultant Cardiologist / Cardiology • 12 yrs" (matches rule 4 fields) but is not grouped under a job. |
| L5 | P1 | Hospital Step 1-2 | Stepper shows 1, 2, 4 "Verification"; no step 3 or Verification screen. |
| L6 | P1 | Pops 473:2723, 473:2743 | Only "Profile Under Review" (doctor) and generic "Sent Successfully" (facility). No approved, rejected, or needs-changes states (rule 1). |
| L7 | P1 | Doctor Dashboard (430:3164) | Application statuses shown: "Applied" and "Under Review" only. |
| L8 | P2 | CV Upload, Doctor Step 6 vs. Apply Job | Max CV size 10MB vs. 5MB. |
| L9 | P2 | Job Details (421:6082) | Title "Consultant Paediatric ICU, National Guard Hospital" vs. body about a Registered Nurse at Prime Care Hospital. |
| L10 | P2 | Hospital Dashboard (440:2294) | Notifications are doctor-oriented (e.g. "matches your profile", "Interview invitation"). |
| L11 | P2 | Contact Us (351:1563) | Office London, Mon-Fri 9-6 GMT vs. footer Riyadh, Sun-Thu 9-5. |
| L12 | P2 | Hospital Settings (564:9584) | No Save button for officer details or password change. |
| L13 | P2 | Countries menu (441:3788) | Lists "All Countries" and "Saudi Arabia" only, while six countries are shown elsewhere. Node data has five text segments, so this needs visual confirmation. |
| L14 | P3 | Doctor Step 4 (389:2716) | Add button reads "+ Add Another Degree or Qualification" on the Licenses step. |
| L15 | P3 | Doctor Step 5 (392:3087) | Organization field placeholder shows "Saudi Commission for Health Specialties (SCFHS)". |
| L16 | P3 | Apply Job (421:6725) | Notes placeholder mentions "dental goals". |
| L17 | P3 | Various | Typos: "Hostpital", "Mange", "Clinc", "hospital Details" (lowercase). |

## Not yet designed (required by confirmed rules or visible actions)

These must not be treated as out of scope:

- Platform admin: doctor approval, facility approval, job approval and publishing, hire request handling, private coordination, identity reveal, group chat creation.
- Facility: job submission and editing, job list with statuses, anonymous applicants per job with select one/multiple/all, hire request confirmation and tracking, revealed doctor details.
- Doctor: account status (pending, rejected, approved), apply gate before approval, application details, settings, edit profile, full lists for applications, saved jobs, and notifications.
- Shared: group chat, forgot/reset password, email or phone verification, facility verification step, terms and privacy, error/404, loading, empty, and validation states.
- Mobile, tablet, and Arabic/RTL versions of all screens.

## Open client decisions

1. **Apply flow:** should an approved doctor apply in one step using their profile, or keep the separate Apply Job form?
2. **Request Medical Staff (440:3528):** what is this form for, given that it is not the candidate-specific hire request?
3. **Doctor role in hire requests:** does the doctor accept or decline before identity is revealed, and is the doctor notified at each stage?
4. **Job submission fields:** what fields must a facility provide when submitting a job?
5. **Browsing before approval:** can a doctor or visitor browse jobs before the doctor's account is approved?
6. **Language and devices:** are Arabic/RTL and mobile required for the first release?
7. **"Nursing Services for Homes":** what is it, and is it part of this platform?

## Pending visual verification

31 frames remain unrendered. Suggested order when access is available (Figma limit reset, a Dev/Full seat, or PNG exports):

1. Pops 424:5601, 473:2723, 473:2743 and menus 428:2715, 430:4233, 480:2254, 441:3788
2. Doctor Step 1-6
3. Hospital Step 1-2, Doctor Login, Hostpital Login
4. Doctor Dashboard, Hospital Dashboard, Doctor Profile, Hospital Profile, Request Medical Staff, Hospital Settings
5. Available Jobs, Job Details, Apply Job
6. Country Details, Hospital Details, FAQs, Contact Us, Start Now

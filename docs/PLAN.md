# SEGURO — Digital Police Report Platform for Peru
## Citizen-Side GovTech Platform — Plan v2 (Custom Auth · Supabase as DB only)

> **Key change in v2:** Supabase is used strictly as a hosted PostgreSQL database (accessed via connection string / Prisma). **No Supabase Auth, no GoTrue, no magic links.** Login, sessions, password/credential handling, OTP, and the progressive identity-validation flow are all owned by **our own backend**, purpose-built for the *denunciante* (complainant) journey.

---

## 1. Problem Definition & Target Users

Citizens who suffer *robo* (robbery) or *hurto* (theft) abandon the police-report process because they don't know requirements, face long waits, get no clear confirmation, and can't track their case.

| Cause | Consequence |
|---|---|
| Don't know requirements before going | Wasted trips, incomplete files |
| Long waits at the *comisaría* | Drop-off, frustration |
| No clear confirmation of registration | Distrust, duplicate reports |
| Can't track status | No closure, repeated calls |
| Confusion robo vs. hurto | Misclassified, legally weak reports |

**Target users (citizen side):** adult victims (18+), variable digital literacy. Edge personas: *first-timer*, *low-trust user*, *low-connectivity user*, *citizen without electronic DNI*.

**Out of scope (V1):** police back-office — but data is structured now for it.

---

## 2. Main Objectives

1. Complete a report on the **first attempt**, remotely.
2. **Guide** the citizen before/during/after.
3. **Custom progressive identity validation** that doesn't require electronic DNI.
4. Clear, verifiable **confirmation + tracking code**.
5. **Structure data** for the future police system.
6. Protect personal & biometric data **by design** — and, because auth is ours, own credential security end to end.

---

## 3. Value Proposition

> **"File a police report from home — guided, identity-verified, and trackable."**

| For the citizen | For the State / PNP |
|---|---|
| No trip to the *comisaría* | Pre-structured, validated case files |
| Knows requirements up front | Fewer incomplete/duplicate reports |
| Guided, reassuring flow | Identity pre-verification reduces fraud |
| Real confirmation + tracking | Full audit trail for legal validity |
| Works without e-DNI | Custom identity logic tuned to PNP needs |

**Differentiator:** a **bespoke complainant identity engine** (progressive, risk-based, non-blocking) instead of a generic off-the-shelf auth provider — full control over flow, data residency, and audit.

---

## 4. Complete User Journey (Before / During / After)

- **BEFORE** → land → register/login (custom) → first-timer tutorial → learn requirements, robo vs hurto, evidence, what's next.
- **DURING** → New report → progressive identity validation → fill wizard → review + consents → submit → tracking code + receipt.
- **AFTER** → "My reports" timeline → SMS/email notifications → track anytime → if identity incomplete, *pending identity review* (not blocked).

---

## 5. First-Time Experience & Guided Pseudo-Tutorial

Triggered when `users.has_filed_before = false`. Optional, skippable, resumable. 6 cards:

| Step | Title | Content |
|---|---|---|
| 1 | ¿Qué es una denuncia? | Plain definition + legal value |
| 2 | Robo vs. Hurto | Robbery = violence/threat; Theft = none |
| 3 | ¿Qué necesitas? | DNI, date/place, description, evidence |
| 4 | Evidencia permitida | Photos, receipts, screenshots, witnesses |
| 5 | ¿Qué pasa después? | Registration → review → assignment → resolution |
| 6 | ¿Cómo hago seguimiento? | Code, notifications, statuses |

Store `tutorial_completed_at` so it isn't forced again.

---

## 6. Login & Custom Complainant Identity Validation Flow

Two distinct layers.

### 6.1 Account authentication (who can log in) — built by us
- **Registration:** DNI/email/phone + password.
- **Password security:** hashed with **Argon2id** (or bcrypt) — never plaintext.
- **Sessions:** our own **JWT access token (~15 min) + rotating refresh token (httpOnly, Secure cookie)**, stored/validated in our `sessions` table (revocable).
- **Brute-force protection:** rate limiting, lockout after N failures, login audit.
- No third-party auth provider — Supabase is only where the rows live.

### 6.2 Complainant identity validation (is this really that citizen) — progressive, custom

```
[Login/Register as denunciante]  ← custom auth
        │
        ▼
(1) BASIC VALIDATION   DNI + DOB + (issue date OR verification/check digit)
        │ pass → continue   │ fail → retry (max → risk flag)
        ▼
(2) RENIEC INTEROP (future)   PIDE / gov interoperability   [MVP: mock service]
        ▼
(3) CONTACT VALIDATION   phone/email → our OTP (generated, hashed, expiring) → verify
        ▼
(4) FACIAL CAPTURE   explicit consent → front + profile → encrypted, attached to case
        ▼
(5) RISK-BASED VALIDATION   suspicious behavior / repeated fails / inconsistent data
        → extra capture OR assisted review
        ▼
(6) ASSISTED REVIEW   auto-validation fails → report = "pending identity review" (NOT blocked)
```

Every step writes to `identity_verifications`. A computed `identity_status ∈ {verified, partial, pending_review}` travels with the report to the future police system. **OTP is our own** (random code, hashed at rest, TTL, attempt cap) — not a third-party magic link.

---

## 7. Facial Capture Flow (Front + Profile)

Principles: explicit consent, purpose-limited, encrypted, minimal retention.

```
[Consent screen]  "2 face photos ONLY to verify your identity for this report.
                   Encrypted, attached to your case, used for nothing else."
   [ ] Consent required to proceed
        ▼
[Front capture]  oval guide → capture/retake → confirm
        ▼
[Profile capture] side guide → capture/retake → confirm
        ▼
[Quality check]  face present, not blurry/dark  [MVP: lightweight]
        ▼
Encrypt → store → link to report → audit entry
```

MVP: webcam (`getUserMedia`) or upload; basic client hints; encrypted blobs. Future: liveness/biometric match **only with legal + technical approval**. Metadata: `capture_type`, `captured_at`, `consent_id`.

---

## 8. Complaint Registration Flow

Wizard with draft autosave:

1. Type (Robo/Hurto + helper) → 2. When → 3. Where (+map pin) → 4. Narrative → 5. Items (repeatable: item, brand/model, value, serial/IMEI) → 6. Evidence + witnesses → 7. Review → 8. Consents (truthfulness + data) → 9. Submit → `tracking_code`, status `RECEIVED`, PDF receipt.

Draft saved every step; submit creates an immutable snapshot + audit entry.

---

## 9. Traceability & Tracking System

- Unique **`tracking_code`** (`DEN-2026-0001234`) on submit + notification.
- Track via **logged-in "My reports"** or **public lookup** (code + DNI).
- **Status timeline** with full event history.
- **Notifications** on every status change.
- **Audit log** of all changes — built now, consumed by police system later.

---

## 10. Suggested Status Labels

| Code | Citizen label (ES) | Meaning |
|---|---|---|
| `DRAFT` | Borrador | Started, not submitted |
| `RECEIVED` | Recibida | Submitted |
| `IDENTITY_PENDING` | Pendiente de verificación de identidad | Auto-validation incomplete |
| `UNDER_REVIEW` | En revisión | Police reviewing (future) |
| `ASSIGNED` | Asignada | Assigned to officer/unit |
| `INFO_REQUESTED` | Información adicional requerida | Citizen action needed |
| `IN_PROGRESS` | En investigación | Being processed |
| `RESOLVED` | Resuelta | Concluded |
| `REJECTED` | Observada / Rechazada | Invalid/duplicate (with reason) |

---

## 11. Main Modules

1. **Auth & Account (custom)** — register/login, password, sessions, lockout.
2. **Onboarding/Tutorial**
3. **Identity Verification (custom, progressive)**
4. **Facial Capture**
5. **Report Wizard**
6. **Evidence Manager**
7. **Tracking & Timeline**
8. **Notifications**
9. **Consent & Privacy Center**
10. **Receipt/Constancia**

---

## 12. MVP Scope (Hackathon)

**Must-have:**
- **Custom** register/login (password + Argon2 + JWT/refresh sessions).
- First-time tutorial.
- Basic identity validation (DNI + DOB + issue/check digit) — real rules + **mock RENIEC**.
- **Custom OTP** contact verification (code shown on-screen for demo).
- Consent + guided face capture (front + profile), encrypted storage.
- Report wizard with draft autosave.
- Submit → tracking code + receipt + status `RECEIVED`.
- "My reports" + timeline + public lookup.
- Identity-fail → `IDENTITY_PENDING` (not blocked).
- Audit log for auth, identity, status events.

**Out:** real RENIEC/PIDE, real liveness/biometrics, police back-office, paid SMS gateway, any third-party auth provider.

---

## 13. Simulated vs. Real

| Capability | Real in MVP | Simulated |
|---|---|---|
| **Custom auth (password, JWT, refresh, lockout)** | ✅ Real | |
| Report CRUD + drafts, tracking, timeline | ✅ Real | |
| **Custom OTP** (generate/hash/verify/TTL) | ✅ Real logic | Delivery shown on-screen (no paid SMS) |
| Face capture + encrypted storage | ✅ Real | Liveness/biometric match → simulated |
| Identity rules (format/check digit) | ✅ Real | |
| RENIEC / PIDE | | Mock service, canned responses |
| Risk scoring | Simple rule | Advanced ML → simulated |
| Police review | | Status advanced via seed/admin for demo |

---

## 14. Preparing Data for the Future Police System

Citizen platform = data **producer**; police system = future **consumer**.

- Normalized schema; each report carries `identity_status` + `risk_flag`.
- Immutable submission snapshot + full audit trail (incl. **our** auth/session events).
- Face images + identity evidence linked, encrypted, with consent records.
- Defined status **state machine** the police system advances.
- **API-first**; reserved nullable fields: `assigned_officer_id`, `comisaria_id`, `reviewed_at`, `review_notes`.
- Because auth is ours, we can later issue **separate credentials/roles** for police users in the same system without swapping providers.

---

## 15. Future Scalable Version

Real RENIEC/PIDE; liveness/biometrics (with legal approval + DPIA); police back-office (queue, assignment, resolution, analytics); GIS heatmaps; optional ID Perú/Gob.pe SSO **as an additional login method layered onto our custom auth**; real SMS/email/WhatsApp; native mobile app; multilingual (Quechua, Aymara); Fiscalía/PJ interop.

---

## 16. Recommended Technology Stack (v2)

| Layer | Recommendation | Notes |
|---|---|---|
| **Frontend** | React + Vite + TypeScript, Tailwind, React Hook Form | Wizard-friendly |
| **Backend** | Node.js + **NestJS** (TypeScript) | Hosts custom auth + identity modules |
| **Database** | **Supabase (managed PostgreSQL only)** | Used purely as Postgres via connection string — **no Supabase Auth, no GoTrue, no RLS-as-auth** |
| **ORM / migrations** | **Prisma** (or Drizzle) pointed at the Supabase Postgres URL | Schema + migrations owned by us |
| **Authentication** | **Custom**: Argon2id password hashing, JWT access + rotating refresh tokens, `sessions` table (revocable), rate limiting/lockout | No third-party auth provider |
| **OTP** | **Custom**: random code, hashed at rest, TTL + attempt cap | Email/SMS later; on-screen for demo |
| **Image storage** | S3-compatible (**Supabase Storage bucket** *or* AWS S3 / MinIO), server-side AES-256, signed URLs | Access controlled by **our** backend, not Supabase Auth |
| **Notifications** | Email (SMTP/SES) + SMS (Twilio later); MVP on-screen | |
| **Face capture** | Browser `getUserMedia` + canvas | |
| **PDF receipt** | pdf-lib / Puppeteer | |
| **Deployment** | Frontend: Vercel/Netlify · Backend: Railway/Render/Fly.io · DB: Supabase | |
| **Secrets** | `.env` + provider secrets manager | DB URL, JWT signing keys, encryption keys |

> Important: the React app **never** talks to Supabase directly with an anon key. All DB access goes **through our NestJS backend**, which holds the Postgres connection string and enforces auth/authorization itself. Supabase is an implementation detail of "where Postgres runs."

---

## 17. System Architecture (Simple Terms)

```
┌──────────────────────────────────────────────────────────┐
│  CITIZEN (browser / mobile web)                           │
│  React SPA — sends JWT in Authorization header            │
└───────────────┬──────────────────────────────────────────┘
                │  HTTPS (REST/JSON)
                ▼
┌──────────────────────────────────────────────────────────┐
│  BACKEND API (NestJS)  ← owns ALL logic & security        │
│  Modules: Auth(custom) · Identity(custom) · OTP ·         │
│  FaceCapture · Reports · Tracking · Notifications · Audit  │
│  Guards: JWT auth guard, rate limiter, RBAC               │
└───┬───────────────┬───────────────┬──────────────┬────────┘
    │ Prisma (conn   │               │              │
    │ string)        │               │              │
    ▼                ▼               ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌────────────┐ ┌────────────┐
│  Supabase    │ │  Encrypted   │ │ Mock RENIEC│ │ Notif.     │
│  Postgres    │ │  Storage     │ │ /PIDE svc  │ │ (email/SMS)│
│ (DB ONLY)    │ │ (bucket/S3)  │ │ (simulated)│ │            │
└──────────────┘ └──────────────┘ └────────────┘ └────────────┘

        (Future) ──► Police back-office uses the SAME backend/API
```

Plain English: the browser only ever talks to our NestJS backend. The backend checks identity/sessions itself, then reads/writes Postgres on Supabase. Supabase stores rows and (optionally) image blobs — it does **not** decide who is logged in.

---

## 18. Database Model (v2 — auth tables are ours)

```
users                         -- account + credentials (OWNED by us)
  id (uuid, pk) · role(denunciante|police-future) · email · phone
  password_hash (argon2id) · email_verified · phone_verified
  failed_login_count · locked_until · has_filed_before
  tutorial_completed_at · created_at

sessions                      -- custom session/refresh tokens (revocable)
  id · user_id(fk) · refresh_token_hash · user_agent · ip
  expires_at · revoked_at · created_at

otp_codes                     -- custom OTP (contact verification)
  id · user_id(fk) · channel(email|sms) · code_hash
  purpose(contact_verify|login_step) · attempts · expires_at · consumed_at

citizens                      -- identity profile (1:1 user)
  id · user_id(fk) · dni · first_name · last_name
  birth_date · dni_issue_date · identity_status(verified|partial|pending_review)

reports
  id · tracking_code(unique) · user_id(fk) · type(robo|hurto) · status
  occurred_at · department · province · district · location_ref · geo_lat · geo_lng
  narrative · identity_status · risk_flag
  assigned_officer_id(null) · comisaria_id(null) · reviewed_at(null) · review_notes(null)
  submitted_at · created_at · updated_at

report_items      id · report_id(fk) · name · brand_model · approx_value · serial_imei
evidence          id · report_id(fk) · file_url · file_type · description · uploaded_at
face_captures     id · report_id(fk) · user_id(fk) · capture_type(front|profile)
                  storage_url(encrypted) · consent_id(fk) · captured_at
identity_verifications
                  id · user_id(fk) · report_id(fk,null) · step(basic|reniec|contact|face|risk|assisted)
                  result(pass|fail|skipped) · attempt_no · details(jsonb) · created_at
consents          id · user_id(fk) · type(face_biometric|data_processing|truthfulness)
                  granted · text_version · granted_at
status_history    id · report_id(fk) · from_status · to_status · note · changed_by · changed_at
audit_log         id · actor(user/system) · action · entity · entity_id · meta(jsonb) · created_at
notifications     id · user_id(fk) · report_id(fk) · channel · template · status · sent_at
```

New/changed vs v1: **`sessions`** and **`otp_codes`** are first-class tables we own (previously delegated to an auth provider).

---

## 19. API Endpoints (v2 — custom auth)

**Auth & account (all custom)**
```
POST /auth/register          # dni/email/phone + password (argon2)
POST /auth/login             # returns access JWT + sets refresh cookie
POST /auth/refresh           # rotate refresh token, issue new access JWT
POST /auth/logout            # revoke session
POST /auth/otp/send          # custom OTP (contact verification)
POST /auth/otp/verify
GET  /me
PATCH /me/tutorial-complete
```

**Identity & face**
```
POST /identity/basic         # dni + birth_date + issue_date/check_digit
POST /identity/reniec-check  # mock PIDE/RENIEC
POST /consents
POST /face-captures          # multipart front/profile → encrypt + store
GET  /identity/status
```

**Reports**
```
POST /reports                # draft
PATCH /reports/:id           # autosave step
POST /reports/:id/items
POST /reports/:id/evidence
POST /reports/:id/submit     # → tracking_code, RECEIVED
GET  /reports                # my reports
GET  /reports/:id            # detail + timeline
GET  /reports/:id/receipt    # PDF
```

**Tracking (public)** `GET /track?code=DEN-2026-0001234&dni=********`
**Internal** `GET /reports/:id/history` · `POST /notifications/dispatch`

Example — login response:
```json
{
  "access_token": "eyJhbGc...",        // short-lived JWT (Authorization: Bearer)
  "token_type": "Bearer",
  "expires_in": 900,
  "user": { "id": "uuid", "role": "denunciante", "has_filed_before": false }
}
// refresh token set as httpOnly, Secure, SameSite=Strict cookie
```

---

## 20. Security, Privacy & Data Protection (v2)

Anchored to **Ley N° 29733**. Because **we own auth**, these are our responsibility:

- **Password security:** Argon2id (memory-hard), per-user salt, never logged.
- **Sessions:** short-lived JWT + **rotating** refresh tokens in httpOnly/Secure/SameSite cookies; server-side revocation via `sessions`; logout + "log out all devices."
- **Brute-force defense:** per-account + per-IP rate limiting, lockout (`failed_login_count`, `locked_until`), login audit.
- **OTP hardening:** random code, **hashed at rest**, short TTL, attempt cap, single-use.
- **JWT keys:** strong signing secret/asymmetric keys, rotation plan, short expiry.
- **Transport/at-rest:** TLS everywhere; AES-256 for face images; DB encryption at rest (Supabase-managed) + app-level encryption for sensitive fields.
- **Authorization:** RBAC in NestJS guards; the SPA never holds DB credentials; **no Supabase anon key in the client**.
- **Consent & purpose limitation:** explicit consent before face capture; images used only for that report; data minimization (no biometric templates in MVP).
- **Audit log:** auth events, identity steps, status changes (who/what/when).
- **Privacy rights:** access/rectification via Privacy Center; defined retention + deletion for biometric images.
- **Legal gate:** liveness/biometrics require DPIA + legal sign-off before production.

---

## 21. UX/UI Screens (Figma / Canva)

Already designed (8-screen Canva deck): Landing · Tutorial · Identity (basic) · Consent · Face capture · Report wizard · Confirmation · Tracking.
Add for full coverage: Register · **Login + lockout/error states** · Contact OTP · My reports list · Privacy Center · "Pending identity review" state · empty/loading/offline.

Canva editable design (Option A): edit https://www.canva.com/d/rCnbP3LsjY7QJlP · view https://www.canva.com/d/B16vJGyLCi62eqQ

---

## 22. Functional Prototype Features (demo checklist)

- [ ] Custom register + login (Argon2 + JWT/refresh), with lockout demo
- [ ] Tutorial for first-timer, skippable
- [ ] Basic identity validation (check-digit logic)
- [ ] Mock RENIEC canned response
- [ ] Custom OTP generate/verify (shown on screen)
- [ ] Consent → webcam face capture (front + profile) → encrypted store
- [ ] Report wizard + autosave
- [ ] Submit → tracking code + receipt + RECEIVED
- [ ] Identity fail → IDENTITY_PENDING (not blocked)
- [ ] My reports + timeline + public lookup
- [ ] Audit entries for auth/identity/status

---

## 23. Non-Functional Requirements

Performance (wizard <300ms, submit <2s, low-end Android) · Availability (stateless API + revocable sessions) · Security (custom auth hardening above) · Privacy (Ley 29733) · Usability (WCAG 2.1 AA, Spanish-first, ≤15 min) · Reliability (autosave, idempotent submit) · Scalability (API-first) · Maintainability (TS end-to-end, Prisma migrations) · Observability (structured logs + audit) · Portability (Dockerized; Postgres is standard — Supabase swappable for any Postgres).

---

## 24. Risks & Mitigations (v2)

| Risk | Impact | Mitigation |
|---|---|---|
| **Custom auth done wrong** | Critical security hole | Use vetted libs (Argon2, jsonwebtoken), follow OWASP ASVS, security review, no hand-rolled crypto |
| No real RENIEC in hackathon | Can't validate | Mock + progressive fallback + pending review |
| Biometric legal exposure | Compliance block | Consent, minimization, no templates in MVP, DPIA before prod |
| False rejects block victims | Citizen harm | Never hard-block → assisted review |
| Token/session theft | Account takeover | httpOnly/Secure cookies, rotation, revocation, short TTL |
| Brute force / credential stuffing | Account compromise | Rate limit, lockout, (future) MFA |
| SPA misuse of Supabase keys | DB exposure | All DB access via backend; no client-side keys |
| Scope creep | Nothing finished | Strict MVP, simulate the rest |

---

## 25. Success Metrics & KPIs

North star: **first-attempt completion rate ≥ 70%**. Also: median time to file ≤15 min · abandonment <30% · identity auto-verification ≥60% · notification delivery ≥95% · reports with face capture ≥90% · CSAT ≥4/5 · login success rate / lockout false-positive rate (new, since auth is ours).

---

## 26. Development Roadmap (Phases)

- **Phase 0 — Setup:** repo, NestJS + React scaffold, **Supabase Postgres provisioned**, Prisma schema + migrations, env/secrets.
- **Phase 1 — Core (MVP):** custom auth (register/login/refresh/lockout) → tutorial → basic identity (+mock RENIEC) → custom OTP → consent + face capture → report wizard → submit + tracking → my reports + timeline → audit. *Demo-ready.*
- **Phase 2 — Hardening:** real email/SMS, PDF polish, risk rules, accessibility, tests, **security review of custom auth (OWASP ASVS)**.
- **Phase 3 — Interop:** real RENIEC/PIDE; optional ID Perú/Gob.pe as added login method.
- **Phase 4 — Police back-office:** roles/credentials in same auth system; queue, assignment, resolution.
- **Phase 5 — Scale:** liveness/biometrics (legal-approved), GIS, mobile app, multilingual.

---

## 27. Backlog — User Stories (auth-focused additions)

- As a citizen, I want to register with DNI + password so I have an account.
- As a citizen, I want secure login with my password so only I access my reports.
- As a citizen, I want to stay logged in safely (refresh tokens) without re-entering my password constantly.
- As a citizen, I want to be protected if someone guesses my password (lockout).
- As a citizen, I want to verify my phone/email via a code so I get updates.
- Plus all v1 stories: tutorial, progressive identity, face capture, non-blocking pending review, wizard + autosave, tracking code, timeline, notifications, encrypted purpose-limited biometrics, audit trail, police-ready data.

---

## 28. Pitch Structure (Hackathon)

1. Hook → 2. Problem (abandonment funnel) → 3. Victim persona → 4. Solution (guided, verified, trackable) → 5. **Live demo** (custom login → progressive identity → face capture → file → tracking) → 6. Real vs. simulated (honest slide) → 7. GovTech-ready: **we own identity & auth** (data residency, audit, tailored to PNP) + privacy by design → 8. KPIs → 9. Roadmap → 10. Ask: pilot with one comisaría.

> Talking point: "We deliberately built our **own** complainant identity and auth engine instead of an off-the-shelf provider — so the State controls the data, the audit trail, and the verification rules."

---

## 29. Final Recommendation — How to Build V1

1. **Stack:** React + NestJS + **Supabase Postgres (DB only)** + Prisma. The frontend talks **only** to NestJS; the backend holds the Postgres URL and enforces everything.
2. **Own auth, but don't hand-roll crypto.** Use Argon2id + a maintained JWT library; implement rotating refresh tokens in a `sessions` table; rate-limit and lock out. Follow **OWASP ASVS** as your checklist. Highest-risk area — budget time for a security pass.
3. **Keep auth and identity validation as separate layers.** Auth = "can log in." Identity validation = "is the real citizen," progressive and **non-blocking** (`pending_review` is the safety net and differentiator).
4. **Build the vertical slice first:** register → login → tutorial → basic identity (mock RENIEC) → custom OTP → consent + face capture → wizard → submit → tracking. One full journey must work live.
5. **Treat data as the product.** Clean, normalized rows + audit (incl. auth/session/identity events) with reserved police fields → V2 police back-office becomes a plug-in, not a rewrite.
6. **Privacy by design, non-negotiable:** consent, encryption, minimization, plain-language notice; defer real biometrics until legal approval + DPIA.

**One line:** *Run one trustworthy end-to-end report flow on a custom, OWASP-aligned auth + progressive identity engine, with Supabase as plain Postgres behind our backend — simulate the integrations, but make the data, auth, and privacy real.*

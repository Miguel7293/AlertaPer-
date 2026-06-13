# SEGURO — Citizen Digital Police-Report Platform (MVP)

Citizen-side GovTech platform for filing robbery/theft police reports in Peru: guided tutorial,
custom auth, **email + facial onboarding**, complaint registration with suspects/witnesses, and
**code-only public tracking that shows the office a report is currently in**.

> **State:** MVP on **Supabase Postgres via Prisma**. Data model follows the proposed Spanish schema
> (`denunciante` / `servidor_publico` split, `comisaria`, `oficinas`, `servidor_denuncia` routing,
> `estado` lookup, `sospechosos`, `testigos`, …). Authentication and identity verification are
> **custom-built** (Supabase is used only as the database, not for auth). See [docs/PLAN.md](docs/PLAN.md).

## Structure
```
backend/    NestJS API — auth · verificacion · denuncias · seguimiento (in-memory store)
frontend/   React + Vite + Tailwind citizen app
docs/       PLAN.md
```

## Database setup (Supabase, one time)
1. In Supabase → **SQL Editor**, paste **all** of [db/schema.sql](db/schema.sql) and **Run**
   (creates the 17 tables + `sessions`/`otp_codes` infra + seeds estado/roles/comisaria/oficinas).
   It's idempotent — safe to re-run.
2. Supabase → **Project Settings → Database → Connection string**. Copy the **URI** and paste it into
   `backend/.env` as `DATABASE_URL` (use the pooled/transaction one, port 6543, keep `?pgbouncer=true`).
   Set `DIRECT_URL` to the direct connection (port 5432) — only needed for `prisma db pull`/migrations.

## Run it (two terminals)

### Backend
```powershell
cd backend
copy .env.example .env        # then paste your DATABASE_URL / DIRECT_URL
npm install
npm run prisma:generate       # generate the Prisma client
npm run start:dev             # http://localhost:3000  (connects to Supabase + seeds demo)
```

### Frontend
```powershell
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

> Prisma model lives in [backend/prisma/schema.prisma](backend/prisma/schema.prisma) (mapped to your
> snake_case tables). Since the tables already exist, you can also regenerate the model from the live DB
> with `npm run db:pull`. Inspect data with `npm run db:studio`.

## Demo account (seeded)
- **DNI:** `12345678` · **password:** `Demo1234` (email + facial already verified)
- Seeded report `DEN-2026-0001001`, routed **Mesa de Partes → Sección de Investigación**.

## Flow
1. **Register** with full data (names, DNI, birth date, email, password).
2. **Onboarding gate** — dashboard stays locked until both are done:
   - **Email verification** (code shown on screen for the demo).
   - **Facial capture** — consent + front + two laterals (webcam, with upload fallback). Encrypted at rest.
3. **Dashboard** → **Nueva denuncia**: tipo → cuándo/dónde → relato → objetos → sospechosos → testigos → revisar → enviar.
4. On submit: tracking code, auto-assigned **comisaría** (by distrito), routed to **Mesa de Partes**.
5. **Consultar por código** (public, no login) → shows the **current office** + status only.

## Key endpoints
```
POST /auth/register · /auth/login · /auth/refresh · /auth/logout · GET /auth/me
POST /auth/email/send · /auth/email/verify
POST /verificacion/consentimiento · /verificacion/captura-facial · /verificacion/reniec · GET /verificacion/estado
POST /denuncias · PATCH /denuncias/:id · POST /denuncias/:id/{objetos,sospechosos,testigos,evidencias,enviar}
GET  /denuncias · /denuncias/:id · /denuncias/:id/constancia
GET  /seguimiento?codigo=DEN-2026-0000000        (public, code only → current office)
```

## What's real vs. simulated (MVP)
| Real | Simulated |
|---|---|
| Custom auth: password hashing, JWT access + rotating refresh (httpOnly cookie) | RENIEC/PIDE lookup (mock) |
| Email + facial onboarding gate | Email/OTP delivery (code shown on screen) |
| Denuncia CRUD, objetos/sospechosos/testigos, office routing, public lookup | Liveness/biometric matching |
| Facial captures encrypted at rest (AES-256-GCM) | Police back-office (officers/offices seeded) |

## Schema-adaptation notes (per analysis)
- FKs the diagram typed `int` are implemented as `uuid` to match the PKs they reference.
- `denuncias.estado` → `estado_id` → seeded `estado` lookup table.
- No `status_history` table in the schema → report movement/timeline is the **`servidor_denuncia`** office routing.
- `denunciante.contrasena_hash` added per the chosen password-auth model.
- `sessions` / `otp_codes` kept as internal auth infrastructure (not part of the ER diagram).

## Toward production
- Persistence is on **Prisma → Supabase Postgres** (done). Add an `audit_log` table to persist the audit trail.
- Swap `bcryptjs` for **Argon2id** in `auth.service.ts` / `verificacion`.
- Replace mock RENIEC + on-screen codes with real PIDE + email/SMS gateways; set cookie `secure: true`.

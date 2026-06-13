# SEGURO — Citizen Digital Police-Report Platform (MVP)

Citizen-side GovTech platform for filing robbery/theft police reports in Peru: guided tutorial,
custom auth, progressive identity validation, front+profile facial capture, and complaint tracking.

> **State:** MVP. The backend runs on an **in-memory store — no database yet** (by request).
> Authentication and identity validation are **custom-built** (no third-party auth provider).
> Supabase is planned only as managed Postgres later. See [docs/PLAN.md](docs/PLAN.md).

## Structure

```
backend/    NestJS API (custom auth, identity, reports, tracking) — in-memory store
frontend/   React + Vite + Tailwind citizen app
docs/       PLAN.md (full product/architecture plan)
```

## Run it (two terminals)

### 1. Backend
```powershell
cd backend
copy .env.example .env
npm install
npm run start:dev
# → http://localhost:3000
```

### 2. Frontend
```powershell
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## Demo account (seeded on startup)
- **DNI:** `12345678`
- **Password:** `Demo1234`
- A pre-submitted report exists so public tracking works immediately.

## Demo flow
1. Open http://localhost:5173 → **Iniciar denuncia** (register) or **Login** with the demo account.
2. First-time users get the **guided tutorial**.
3. **Nueva denuncia** runs the full flow: identity (DNI + birth date + check digit) → mock RENIEC →
   contact OTP (code shown on screen) → biometric consent → front + profile face capture →
   report wizard (type, place, narrative, items) → review → submit.
4. Get a **tracking code**, view the **status timeline**, or use **Hacer seguimiento** (code + DNI).

## What's real vs. simulated (MVP)
| Real | Simulated |
|---|---|
| Custom auth: password hashing, JWT access + rotating refresh (httpOnly cookie), lockout | RENIEC/PIDE lookup (mock) |
| Report CRUD, drafts, submit, tracking, timeline, audit log | OTP delivery (code returned on screen) |
| Custom OTP logic, consent records | Liveness/biometric matching |
| Face capture encrypted at rest (AES-256-GCM on disk) | Police back-office (status seeded for demo) |

## Notes for production
- Swap the `InMemoryStore` seam for Prisma → Supabase Postgres (no controller changes).
- Swap `bcryptjs` for **Argon2id** (documented choice) in `auth.service.ts`.
- Replace the mock RENIEC service and on-screen OTP with real PIDE + SMS/email gateways.
- Set cookie `secure: true` behind HTTPS and rotate JWT secrets.

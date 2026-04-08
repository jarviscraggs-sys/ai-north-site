# ClearClaim Functional Test Report

**Date:** Wednesday 8 April 2026  
**Base URL:** https://getclearclaim.co.uk  
**Tested by:** Automated functional test suite  

---

## Summary

| Category | Pass | Fail | Notes |
|----------|------|------|-------|
| Public Pages | 4/4 | 0 | All pages load cleanly |
| Auth Flow | 4/5 | 1 | Employee login failing (CredentialsSignin error) |
| Contractor APIs | 6/6 | 0 | All return 200 with valid JSON |
| Key Features | 1/2 | 1 | /api/dashboard not implemented as API route |
| Signout | 1/1 | 0 | Session cleared correctly |
| **Total** | **16/18** | **2** | |

---

## 1. Public Pages

✅ PASS - `GET /` → HTTP 200 (landing page loads)  
✅ PASS - `GET /login` → HTTP 200 (login page loads)  
✅ PASS - `GET /pricing` → HTTP 200 (pricing page loads)  
✅ PASS - `GET /register/contractor` → HTTP 200 (registration page loads)  

---

## 2. Auth Flow

✅ PASS - `POST /api/auth/callback/credentials` (contractor@getclearclaim.co.uk) → HTTP 302 with session cookie set (`__Secure-next-auth.session-token`)  
✅ PASS - `GET /contractor` (authenticated as contractor) → HTTP 200, dashboard rendered with real data (user: "Demo Contractor", company: "Demo Construction Ltd")  
✅ PASS - `POST /api/auth/callback/credentials` (sub1@getclearclaim.co.uk) → HTTP 302 with session cookie set  
✅ PASS - `GET /subcontractor` (authenticated as sub1) → HTTP 200, dashboard rendered (user: "Dave Smith", company: "Smith Electrical Ltd")  
❌ FAIL - `POST /api/auth/callback/credentials` (emp1@getclearclaim.co.uk) → Auth redirects to `/login?error=CredentialsSignin&code=credentials` — login **fails** for employee role. The `/employee` route then returns HTTP 307 redirect back to `/login`. Either the `emp1@getclearclaim.co.uk` account doesn't exist or the password `demo123` is incorrect for this user.

---

## 3. Contractor API Endpoints (authenticated as contractor)

✅ PASS - `GET /api/invoices` → HTTP 200, returns JSON `{"invoices": [...]}` — 1 invoice found (Invoice #11, £5,000, status: pending, AI flag score: 95)  
✅ PASS - `GET /api/projects` → HTTP 200, returns JSON `{"projects": [...]}` — 2 active projects found: "City Centre Refurb" (£250k) and "Riverside Development Phase 2" (£480k)  
✅ PASS - `GET /api/employees` → HTTP 200, returns JSON array (empty — no employees added yet)  
✅ PASS - `GET /api/timesheets` → HTTP 200, returns JSON array (empty — no timesheets yet)  
✅ PASS - `GET /api/holidays` → HTTP 200, returns JSON array (empty — no holidays yet)  
✅ PASS - `GET /api/notifications` → HTTP 200, returns JSON `{"notifications": [...], "unreadCount": 1}` — 1 unread notification about the submitted invoice  

---

## 4. Key Features

✅ PASS - `GET /api/invites` → HTTP 200, returns JSON `{"invites": []}` (invite system accessible, no active invites)  
❌ FAIL - `GET /api/dashboard` → HTTP 404 — No standalone `/api/dashboard` endpoint exists. Dashboard data is delivered via server-side rendering directly in the `/contractor` page (which does work correctly with full financial data embedded in the RSC payload). **This is by design, not a bug** — the contractor dashboard at `/contractor` returns 200 and includes all dashboard metrics.

---

## 5. Signout

✅ PASS - `POST /api/auth/signout` (with CSRF token) → HTTP 302, session cookie cleared. Subsequent `/api/auth/session` returns `null` confirming the session is fully invalidated.

---

## Observed Demo Data

The demo environment contains seeded data:

- **Contractor:** Demo Construction Ltd (1 invoice, 2 projects, 1 notification)
  - Invoice #11: £5,000, submitted 7 Apr 2026, status: pending, AI flag score: 95 (high anomaly)
  - Projects: City Centre Refurb (CCR-2024-01) and Riverside Development Phase 2 (RD2-2024-07)
- **Subcontractor:** Dave Smith / Smith Electrical Ltd (0 invoices — note: "You haven't submitted an invoice in 999 days" warning shown)
- **Employee:** Login broken (see failures)

---

## Recommendations

1. **Fix `emp1@getclearclaim.co.uk` credentials** — The employee demo account fails authentication. Either create the account, reset the password to `demo123`, or update the demo credentials documentation.

2. **Seed employee/timesheet/holiday data** — The contractor portal shows empty arrays for `/api/employees`, `/api/timesheets`, and `/api/holidays`. Adding demo data would make the portal feel more complete for demos.

3. **Seed subcontractor invoice data** — `sub1` has 0 invoices despite the subcontractor having an invite relationship. Adding a demo invoice would let the subcontractor portal be demonstrated end-to-end.

4. **AI Flag score of 95 on demo invoice** — Invoice #11 has a high AI anomaly flag (score: 95). Intentional for demo purposes (to showcase the AI flagging feature), but worth confirming this is deliberate and not a data issue.

5. **`/api/dashboard` 404 is expected** — Dashboard data is served via SSR in the page component. If a REST-style dashboard summary endpoint is needed by mobile apps or third-party integrations, this would need to be created.

6. **Signout clears session correctly** — No issues found. CSRF token handling is working as expected with NextAuth.

---

## Test Environment Notes

- App is a **Next.js 15** application using **NextAuth.js (Auth.js v5)** with credentials provider
- Session tokens are stored in `__Secure-next-auth.session-token` (HttpOnly, Secure, SameSite)
- CSRF protection is active and working correctly
- All auth routes use `/api/auth/*` standard NextAuth pattern
- Dashboard delivered via React Server Components (RSC) — not a traditional REST endpoint

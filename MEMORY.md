# Long-Term Memory

## ClearClaim — Construction Management Platform

### Deployment (Live as of 6 Apr 2026)
- **Live URL:** https://clearclaim-production.up.railway.app
- **Custom domain:** getclearclaim.co.uk (DNS propagating)
- **Hosting:** Railway (Node.js persistent server)
- **GitHub repo:** https://github.com/jarviscraggs-sys/clearclaim
- **GitHub account:** jarviscraggs-sys
- **Local dev:** http://localhost:3002

### Environment Variables (Railway)
- NEXTAUTH_URL = https://getclearclaim.co.uk
- NEXTAUTH_SECRET = a8f3k2m9p1q7r5s6t4u0v2w8x1y3z9
- GROQ_API_KEY = (set — Groq Llama 3.3 70B for AI chatbot)

### Demo Credentials (local dev only)
- Contractor: contractor@clearclaim.co.uk / demo123
- Subcontractor: sub1@clearclaim.co.uk / demo123
- Employee: emp1@clearclaim.co.uk / demo123

### Tech Stack
- Next.js 16 App Router, TypeScript, Tailwind CSS
- SQLite (better-sqlite3), NextAuth v5
- Nodemailer (Ethereal for dev, configure SMTP for prod)
- Groq API (Llama 3.3 70B) for AI chatbot

### Features Built
- 3 portals: Contractor / Subcontractor / Employee
- Invoice management, CIS, retention, variations, disputes
- Timesheets, holidays, compliance tracker
- Projects, cash flow forecast, payroll
- QuickBooks/Xero export, CIS returns, monthly reports
- AI chatbot on all portals (Groq)
- PWA support, notifications, audit trail
- Self-serve registration + invite system
- Landing page + pricing page at getclearclaim.co.uk

### Pricing
- Free: 1 month trial
- Pro: £149/mo
- Enterprise: £399/mo
- Subcontractors always free

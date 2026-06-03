# 🎟️ Lotto Win - Lottery Platform

Complete lottery website built with Next.js, Supabase, and TailwindCSS.

## Features

✅ User Registration & Login (Phone-based)
✅ Wallet System with Balance Management
✅ Live Lottery Draws
✅ Ticket Purchase System
✅ Deposit/Payment Management
✅ Admin Control Panel
✅ Fraud Detection System
✅ Winner Selection Algorithm

## Tech Stack

- **Frontend:** Next.js 15 + React 19 + TailwindCSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Supabase)
- **Auth:** NextAuth.js + Custom JWT
- **ORM:** Drizzle ORM
- **UI Components:** Lucide React Icons

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/th9610610610-cell/Lotto-Win-.git
cd Lotto-Win-
npm install
```

### 2. Setup Supabase

- Create Supabase project at https://supabase.com
- Get your DATABASE_URL
- Create `.env.local` from `.env.local.example`

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Test Accounts

| Role | Username | Password |
|------|----------|----------|
| User | `01712345678` | `user123` |
| Admin | `admin` | `admin123` |

## File Structure

```
src/
├── lib/
│   ├── db.ts
│   ├── schemas.ts
│   ├── utils.ts
│   └── fraud-detection.ts
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx
│   ├── login/
│   ├── register/
│   ├── draws/
│   ├── wallet/
│   ├── deposit/
│   ├── my-tickets/
│   ├── profile/
│   ├── lw-secure-7x9k/
│   ├── admin/
│   └── api/
└── components/
    ├── Navbar.tsx
    └── Common.tsx
```

## License

MIT
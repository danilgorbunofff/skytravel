# SkyTravel (React + Express + MySQL)

Full-stack scaffold with React (Vite), Express (TypeScript), and Prisma (MySQL).

## Structure
- `client/` React + Vite (TypeScript)
- `server/` Express API (TypeScript)
- `server/prisma/` Prisma schema + migrations

## Setup
1. Install dependencies: `npm install`
2. Create env files:
   - `cp server/.env.example server/.env`
   - `cp client/.env.example client/.env`
3. Update `server/.env` with MySQL credentials.
4. Run Prisma migration + client generate:
   - `npm --workspace server run prisma:generate`
   - `npm --workspace server run prisma:migrate`
5. Start dev servers:
   - `npm run dev`

## Notes
- The homepage uses API data for SkyTravel offers (`/api/tours`).
- The admin panel uses `/api/admin/tours` for CRUD.
- Partner tours remain static placeholders for now.

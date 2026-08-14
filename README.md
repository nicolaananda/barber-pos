# StayCool POS

Point-of-sale and barbershop management application for Staycool Hairlab. The repository contains a Vite/React single-page frontend and an Express API backed by MySQL through Prisma.

## Current stack

- Frontend: React 19, TypeScript, Vite 7, React Router, Tailwind CSS 4, Zustand, SWR, and Vite PWA.
- Backend: Node.js, Express 5, CommonJS, Prisma 5, and MySQL.
- Authentication: username/password login, bcrypt password hashes, and bearer JWTs. The frontend stores the token in `localStorage`; protected API requests send `Authorization: Bearer <token>`. The backend validates `JWT_SECRET`, token revocation/version, and the current database user role.

The application includes POS checkout, bookings, customers, barber scheduling, services, transaction history, expenses, payroll, dashboards, and analytics.

## Requirements

- Node.js 20 or newer.
- npm.
- MySQL reachable through `DATABASE_URL`.

## Setup

1. Install all dependencies:

   ```bash
   npm install
   npm run install:all
   ```

2. Create the backend environment file:

   ```bash
   cp backend/.env.example backend/.env
   ```

   At minimum, set:

   ```env
   DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/barber_pos"
   JWT_SECRET="replace-with-a-long-random-secret"
   PORT=3001
   ```

   `backend/.env.example` documents optional WhatsApp, backup, R2 storage, AI analytics, edit PIN, and booking-blackout settings.

3. Generate the Prisma client and apply the schema using the migration workflow appropriate for the target database:

   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate deploy
   cd ..
   ```

   The old HTTP seed route is intentionally not mounted. Do not use it for setup.

4. Start both development servers:

   ```bash
   npm start
   ```

   - Frontend: http://localhost:7781
   - Backend API: http://localhost:3001/api

   Vite proxies `/api` to `http://localhost:3001`, so the default frontend development setup needs no separate API URL.

## Scripts

### Root

```bash
npm start             # backend server and Vite dev server concurrently
npm run install:all   # install frontend and backend dependencies
npm run build         # build frontend, install backend lockfile dependencies, generate Prisma client
npm run deploy:vps    # run deploy-vps.sh
```

### Frontend

```bash
npm run dev --prefix frontend      # Vite on port 7781
npm run lint --prefix frontend     # ESLint
npm run build --prefix frontend    # TypeScript project build and Vite production build
npm run preview --prefix frontend  # preview production output (Vite default port 4173)
```

### Backend

```bash
npm run server --prefix backend    # Express on PORT, default 3001
```

## Production

The frontend build is written to `frontend/dist`. The Express process reads `backend/.env`; deploy it behind a reverse proxy and serve the built frontend according to the target environment. `deploy-vps.sh` contains the repository's VPS deployment workflow.

## License

Private software developed for Staycool Hairlab.

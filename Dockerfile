FROM node:20-alpine

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

# Install frontend dependencies
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Copy backend and frontend source code
COPY backend ./backend
COPY frontend ./frontend

# Generate Prisma client for backend
WORKDIR /app/backend
RUN npx prisma generate

# Expose frontend and backend ports
EXPOSE 7763
EXPOSE 7764

# Jalankan frontend (Vite) di 7763 dan backend (Express) di 7764 dalam satu container
CMD sh -c "\
  cd /app/backend && PORT=7764 npm run server & \
  cd /app/frontend && npm run dev -- --host 0.0.0.0 --port 7763 & \
  wait -n \
"

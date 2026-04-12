FROM node:20-slim

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

# Build frontend for production
WORKDIR /app/frontend
RUN npm run build

# Expose port (backend serves frontend static files)
EXPOSE 7764

# Run backend only (server.js serves frontend/dist as static files)
WORKDIR /app/backend
CMD ["sh", "-c", "PORT=7764 node server.js"]

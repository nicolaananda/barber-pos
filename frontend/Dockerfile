# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

ARG GIT_COMMIT_COUNT=0
ARG GIT_COMMIT_HASH=unknown
ARG GIT_BRANCH=unknown
ENV GIT_COMMIT_COUNT=$GIT_COMMIT_COUNT
ENV GIT_COMMIT_HASH=$GIT_COMMIT_HASH
ENV GIT_BRANCH=$GIT_BRANCH

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

RUN apk add --no-cache wget

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

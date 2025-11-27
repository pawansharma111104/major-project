## Multi-stage Dockerfile
# Builds the Vite client and bundles the server, then runs the production server

FROM node:20-slim AS builder
WORKDIR /app

# Copy package files and install all deps (dev + prod) for the build
COPY package.json package-lock.json ./
RUN npm ci

# Copy the entire repository and build (client + server)
COPY . .
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app

# Only install production dependencies in the runtime image
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy built artifacts from the builder
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "dist/index.js"]

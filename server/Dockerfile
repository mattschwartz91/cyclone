FROM node:20-slim

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PORT=3000

COPY package.json package-lock.json ./
# Install native build dependencies for sqlite3
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/* \
    && npm ci --omit=dev --ignore-scripts \
    && npm rebuild sqlite3 --build-from-source

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 CMD curl -f http://localhost:3000/api/status || exit 1

CMD ["node", "server.js"]

# Build + run the MCP server on a slim Node 22 image.
FROM node:22-slim

WORKDIR /app

# Install dependencies first so this layer caches across source-only changes.
# The package-lock is copied when present (the trailing * keeps it optional).
COPY package.json package-lock.json* ./
RUN npm install

# Compile TypeScript to dist/.
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]

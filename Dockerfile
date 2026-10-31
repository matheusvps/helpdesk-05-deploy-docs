# API image. The frontend is deployed separately as a static site (see render.yaml).
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
EXPOSE 3000
# Pending migrations are applied on every start, before the API accepts requests.
CMD ["sh", "-c", "node dist/migrate-cli.js && node dist/server.js"]

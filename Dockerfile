FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY project.inlang/settings.json project.inlang/
COPY messages messages
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY drizzle ./drizzle
COPY scripts ./scripts
USER node
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate.js && node build"]

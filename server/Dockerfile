FROM node:22.16.0-bookworm-slim AS build

RUN corepack enable
WORKDIR /workspace

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @bclick/config build
RUN pnpm --filter @bclick/server build

FROM node:22.16.0-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /workspace
RUN corepack enable \
 && mkdir -p /var/lib/bclick/uploads \
 && chown -R node:node /workspace /var/lib/bclick
COPY --from=build --chown=node:node /workspace /workspace

USER node
EXPOSE 3000
CMD ["pnpm", "--filter", "@bclick/server", "start"]

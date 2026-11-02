FROM node:24.13.1-bookworm-slim AS build
WORKDIR /src
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @isnadi/web build
RUN node apps/server/scripts/cli.ts build
RUN pnpm --config.inject-workspace-packages=true --filter isnadibot deploy --prod /runtime \
  && rm -f /runtime/node_modules/.pnpm/node_modules/isnadibot \
  && mkdir -p /runtime/node_modules/isnadibot \
  && mv /runtime/dist /runtime/node_modules/isnadibot/dist

FROM node:24.13.1-bookworm-slim
ENV NODE_ENV=production T3CODE_MODE=web T3CODE_HOST=0.0.0.0 T3CODE_PORT=3773 T3CODE_NO_BROWSER=true ISNADI_HOME=/data ISNADI_INSTALL_ROOT=/opt/isnadi ISNADI_BIN_DIR=/usr/local/bin ISNADI_REMOTE_CONTAINER=1 ISNADI_SERVER_ENTRYPOINT=/opt/isnadi/node_modules/isnadibot/dist/bin.mjs ISNADI_SERVER_COMMAND=/usr/local/bin/isnadi
WORKDIR /opt/isnadi
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /runtime ./
COPY --from=build /src/LICENSE ./LICENSE
COPY --from=build /src/apps/server/package.json ./package.json
COPY scripts/isnadi-remote-admin.sh ./remote-admin
COPY scripts/initialize-remote-identity.sh ./initialize-remote-identity.sh
COPY deploy/docker/isnadi-entrypoint.sh /usr/local/bin/isnadi
RUN mkdir -p /data /workspace node/bin \
  && ln -s /usr/local/bin/node node/bin/node \
  && node -p "require('./package.json').version" > VERSION \
  && chmod 755 remote-admin initialize-remote-identity.sh /usr/local/bin/isnadi \
  && chown node:node /data /workspace
USER node
EXPOSE 3773
VOLUME ["/data", "/workspace"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3773/.well-known/t3/environment >/dev/null || exit 1
ENTRYPOINT ["isnadi"]
CMD ["serve"]

# Builds one image that serves both the website and the API. Build it from the repo root.

FROM node:22-alpine AS website
WORKDIR /app/registration/frontend
COPY registration/frontend/package.json registration/frontend/package-lock.json ./
RUN npm ci
COPY registration/frontend ./
COPY registration/shared ../shared
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/registration/backend
COPY registration/backend/package.json registration/backend/package-lock.json ./
RUN npm ci --omit=dev
COPY registration/backend ./
COPY registration/shared ../shared
# The shared form rules need this to load as ES modules.
COPY package.json /app/package.json
COPY --from=website /app/registration/frontend/dist ../frontend/dist
USER node
EXPOSE 4001
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4001) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "server.js"]

# syntax=docker/dockerfile:1

# Production image: builds the static export and serves it with nginx.
# No tests here; test.Dockerfile and CI own those. Build from the repo root:
#   docker build -f infra/docker/frontend/prod.Dockerfile -t gethired-frontend .
#   docker run --rm -p 127.0.0.1:8080:80 gethired-frontend
# See README.md in this folder.

# Stage 1: build. Needs Node and devDependencies (TypeScript, Tailwind).
FROM node:22-slim AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY frontend/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx next build

# Stage 2: serve. Only nginx and the out/ files ship; Node and node_modules
# stay behind in the build stage.
FROM nginx:1.27-alpine AS runtime
COPY infra/docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/out /usr/share/nginx/html
EXPOSE 80

# syntax=docker/dockerfile:1


# A failing check fails the build. Build from the repo root:
#   docker build -f infra/docker/frontend/test.Dockerfile .
# Playwright's image is Ubuntu 24.04 (noble), the same OS as the CI runner,
# with Chromium and its system libraries preinstalled. The tag must match the
# @playwright/test version in frontend/package-lock.json.
FROM mcr.microsoft.com/playwright:v1.63.0-noble AS test
WORKDIR /app

# Package files first, so the install layer is reused until dependencies change.
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY frontend/ .
ENV NEXT_TELEMETRY_DISABLED=1

# Fast checks first.
RUN npm run typecheck
RUN npm run lint
RUN npm run test

# E2E needs the static export; playwright.config.ts serves out/ itself.
RUN npx next build
ENV CI=true
RUN npx playwright test

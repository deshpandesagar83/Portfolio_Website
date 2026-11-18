# syntax=docker/dockerfile:1

FROM node:22-slim AS dev
# By default, Next.js collects telemetry data whenever you run build or start commands
ENV NEXT_TELEMETRY_DISABLED=1

USER node
WORKDIR /home/node/app
RUN mkdir -p node_modules .next
EXPOSE 3000

CMD ["sh", "-c", "[ -x node_modules/.bin/next ] || npm ci; exec npm run dev"]

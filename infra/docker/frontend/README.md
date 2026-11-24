# Frontend Docker images

Three Dockerfiles, one per job. Run every command from the **repo root**.

| File | Job | Runs tests | Output |
|---|---|---|---|
| `dev.Dockerfile` + `compose.dev.yaml` | Day-to-day work: dev server and every npm command | No (run them on demand) | A running container on `localhost:3000` |
| `test.Dockerfile` | Everything CI checks, before you push | Yes, all of them | Pass or fail. The image itself isn't used |
| `prod.Dockerfile` | The built site served by nginx | No | A ~20 MB image serving the site on port 80 |

```
infra/docker/frontend/
├── dev.Dockerfile             + dev.Dockerfile.dockerignore
├── compose.dev.yaml           included by the root compose.yaml
├── test.Dockerfile            + test.Dockerfile.dockerignore
├── prod.Dockerfile            + prod.Dockerfile.dockerignore
├── nginx.conf                 used by prod.Dockerfile
└── README.md
```

## Shared rules

- **Build context is the repo root** (the trailing `.` in each command). The Dockerfiles live in `infra/`, but they need `frontend/` and `infra/docker/frontend/nginx.conf`, and a build can only read files inside its context.
- **Each Dockerfile has its own ignore file**, named `<name>.Dockerfile.dockerignore` and placed next to it. Docker uses that file instead of a `.dockerignore` at the root of the context. Each one is an allow-list: ignore everything, then let back in only what that image needs. This keeps `.git`, `backend/`, `planning/`, `.env*` files and your Windows `node_modules` out of every build.
- **Dependencies are copied before the source.** `package.json` and `package-lock.json` are copied first, then `npm ci` runs, then the rest of `frontend/` is copied. Docker caches each step, so editing a component doesn't rerun the install. Only changing the lockfile does.
- **`--mount=type=cache,target=/root/.npm`** keeps npm's download cache on your machine between builds, outside the image. When the lockfile changes, only new packages are downloaded.
- **Multi-stage when it earns it.** `dev` and `test` are a single stage each. `prod` has two stages because the tools needed to build the site (Node, `node_modules`) shouldn't ship in the image that serves it. Add stages when a file needs to split *build* from *ship*, or needs a target you can stop at. Don't add them as labels.

---

## dev.Dockerfile: development container

**Purpose:** run `next dev` and every npm command (`install`, `lint`, `test`, ...) inside Linux instead of on Windows. Package install scripts run in the container, not on your machine.

**Use it**

Run these from the repo root or any folder inside it. Compose finds the root `compose.yaml` by walking up parent folders, and that file includes `compose.dev.yaml`.

```bash
# start the dev server at http://localhost:3000 (first start runs npm ci)
docker compose up

# any npm command, in a throwaway container
docker compose run --rm app npm install <package>
docker compose run --rm app npm run lint
docker compose run --rm app npm test

# after the lockfile changes (pull, branch switch): reinstall
docker compose run --rm app npm ci

# rebuild the image after editing dev.Dockerfile
docker compose build

# stop; add -v to also delete node_modules/.next volumes (forces a fresh install)
docker compose down
```

**Why there's a root `compose.yaml`:** it includes this folder's `compose.dev.yaml` with `project_directory: .`, so every path inside `compose.dev.yaml` is relative to the repo root (`context: .`, `./frontend:/app`). Moving `compose.dev.yaml` means updating only the `path:` line in the root file. Its fixed `name: website` keeps container and volume names the same on every machine, whatever the clone folder is called. Running `compose.dev.yaml` directly with `-f` resolves `.` to `infra/docker/frontend/` and breaks. If you need to, add `--project-directory .`.

**How it works**

1. **`node:22-slim`**: Node 22 matches CI. *slim* is Debian with glibc, which is the best-supported platform for Next's SWC and Tailwind's native binaries.
2. **No source is copied in.** Compose bind-mounts `frontend/` at `/home/node/app` (the `WORKDIR`; the two must match), so your edits on Windows are live in the container and `next dev` hot-reloads them. Files the container writes, such as `package-lock.json` after `npm install`, appear in your repo.
3. **`node_modules` and `.next` are named volumes.** They sit on top of the bind mount, so the container uses its own Linux-built dependencies and never touches the Windows copies in `frontend/node_modules`. Linux binaries don't run on Windows and vice versa, so the two must stay separate. The Dockerfile creates both folders owned by `node`, and each volume copies that ownership when it's first created.
4. **Runs as `node`, not root.** Compose also drops all Linux capabilities (`cap_drop: ALL`) and blocks privilege escalation (`no-new-privileges`).
5. **The port is bound to `127.0.0.1`**, so other devices on your network can't reach the dev server.
6. **Start command:** `[ -x node_modules/.bin/next ] || npm ci; exec npm run dev`. On first start the volume is empty, so dependencies are installed. Later starts skip straight to `next dev`. The `node_modules` volume doesn't update on its own when the lockfile changes, so run `npm ci` as shown above.

**What "safer" covers, and what it doesn't**

- ✅ Install scripts and dev tooling can't read your Windows home folder, SSH keys, AWS credentials or browser data. None of those are mounted.
- ✅ They run as an unprivileged user with no capabilities.
- ⚠️ `frontend/` is mounted read-write, so a malicious package *could* modify project files. Review diffs before committing.
- ⚠️ The container has network access, which npm needs. A malicious script could send out whatever it can read, which is your frontend source.
- ⚠️ Your editor still reads `frontend/node_modules` on Windows for autocomplete. If you stop installing on the host, that folder goes stale. Either accept that, or open the project with VS Code's Dev Containers extension so the editor works inside the container too.

**If hot reload doesn't pick up edits:** file-change events from a Windows folder don't always reach the container. The most reliable fix is to keep the repo inside the WSL filesystem (for example `\\wsl$\Ubuntu\home\<you>\...`). That's also much faster.

---

## test.Dockerfile: local CI

**Purpose:** run exactly what CI runs, in the same order, before you push. If any check fails, the build fails at that step and shows the output.

**Use it**

```bash
docker build -f infra/docker/frontend/test.Dockerfile .

# full, unfolded test output
docker build -f infra/docker/frontend/test.Dockerfile --progress=plain .
```

**How it works**

1. **`mcr.microsoft.com/playwright:v1.63.0-noble`** is Ubuntu 24.04, the same OS as the `ubuntu-24.04` CI runner, with Chromium and its system libraries preinstalled. **Its tag must match `@playwright/test` in `frontend/package-lock.json`.** Bump both together, or Playwright won't find its browsers.
2. `npm ci`, then copy the source (see Shared rules).
3. Checks, fastest first, so cheap failures surface early: `typecheck` → `lint` → `test` (Vitest) → `next build` → `playwright test`.
4. The e2e tests run against the real static export. `playwright.config.ts` starts `serve out` itself. `CI=true` turns on the same behaviour as GitHub Actions: 2 retries, `test.only` rejected, and a fresh server every run.
5. Every `RUN` is cached. If nothing in `frontend/` changed since the last green build, it finishes in seconds. After a failure, the rebuild resumes from the failed step.

**When a test fails:** the build stops, later checks don't run, and the error output is printed. Playwright traces stay inside the failed build. To debug an e2e failure interactively, run `npx playwright test` in the dev container or on the host.

**Not covered:** the image is ~1.5 GB and only used as a pass/fail signal. Delete old ones with `docker image prune`.

---

## prod.Dockerfile: production image

**Purpose:** build the static site and serve it with nginx. No tests: `test.Dockerfile` and CI gate the code before it gets here.

**Use it**

```bash
docker build -f infra/docker/frontend/prod.Dockerfile -t gethired-frontend .
docker run --rm -p 127.0.0.1:8080:80 gethired-frontend
# http://localhost:8080
```

**How it works**

1. **Stage `build`** (`node:22-slim`): `npm ci` installs all dependencies, including the devDependencies the build needs (TypeScript, Tailwind), then `next build` writes the static export to `/app/out`. `next.config.ts` sets `output: 'export'`, so no Node server is needed afterwards.
2. **Stage `runtime`** (`nginx:1.27-alpine`): only `out/` and `nginx.conf` are copied in. Node, `node_modules` and the source stay behind in the build stage, and the final image is ~20 MB.
3. **`nginx.conf`** follows the Next.js static-exports guide. `try_files $uri $uri.html $uri/` resolves `/workflow/` to `workflow/index.html` (because `trailingSlash: true`), and unknown paths get your exported `404.html`.

**How it relates to deployment:** the live site is the same `out/` files served from S3 and CloudFront, not this container. Use this image to preview the production build exactly as visitors get it, or as the base if you ever move hosting to a container platform. That would be an always-on server, so it costs more than S3.

---

## Extending

- **CI uses these files:** have the GitHub workflow run `docker build -f infra/docker/frontend/test.Dockerfile .` so local runs and CI run the same checks.
- **CI needs the site files:** add an `export` stage to a Dockerfile (`FROM scratch` + `COPY --from=<stage> /app/out /`) and build it with `--target export --output type=local,dest=frontend/out`.
- **Backend:** give it its own folder, `infra/docker/backend/`, with the same layout.

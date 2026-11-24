
# Run DEV
```bash
docker compose --profile frontend-dev up
```
```bash
docker compose --profile frontend-dev run --rm app npm install <package>
```
```bash
docker compose --profile frontend-dev down -v
```
```bash
docker compose --profile frontend-dev up --build
```

# Run Tests
```bash
docker build -f infra/docker/frontend/test.Dockerfile -t website-frontend-test .
```
## full output for every step, instead of collapsed log lines
```bash
docker build -f infra/docker/frontend/test.Dockerfile --progress=plain -t website-frontend-test .
```
## rerun every check even if nothing changed
```bash
docker build -f infra/docker/frontend/test.Dockerfile --no-cache -t website-frontend-test .
```

## Remove image
```bash
docker rmi website-frontend-test
```
```bash
docker rmi website-frontend-dev
```
```bash
docker image prune
```

## Clear Cache
```bash
docker builder prune
```


# Build
```bash
docker build -f infra/docker/frontend/prod.Dockerfile -t frontend-build .
docker run --rm -p 127.0.0.1:8080:80 frontend-build
```
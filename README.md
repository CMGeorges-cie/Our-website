# Here are your Instructions

## Docker local dev + CI/CD prepped setup

- `backend/Dockerfile`: Python/FastAPI service, non-root user, dev defaults to local Mongo.
- `frontend/Dockerfile`: React/CRACO build stage + nginx production stage.
- `docker-compose.yml`: brings up MongoDB + backend + frontend.

### Run locally

```bash
docker compose up --build
```

### Health checks

- Backend: http://localhost:8000/docs
- Frontend: http://localhost:3000
- Mongo: mongodb://localhost:27017 (via mongo shell or Compass)

### Security/DevOps

- Secrets are read from env vars, not baked into images.
- Use `docker compose --env-file .env.dev ...` for local secret management.
- For CI/CD, use deployment pipeline secrets for `MONGO_URL`, `JWT_SECRET`, etc.

### Healthcheck + test automation (CI/CD workflow)

1. Compose readiness:
   - `docker compose up --build --detach`
   - `docker compose ps` (check health state)
2. Backend health endpoint:
   - `curl -f http://localhost:8000/api/healthz`
3. Run the automated tests:
   - Backend: `docker compose exec backend pytest -q backend/tests`
   - Frontend: `cd frontend && yarn test --watchAll=false`
4. Build artifacts for staging:
   - `docker compose build backend frontend`
   - push images to registry (GitHub Container Registry / Docker Hub).
5. In staging pipeline:
   - Deploy latest images.
   - Verifier `GET /api/healthz` and smoke tests.

> Ce workflow s’intègre dans GitHub Actions / GitLab CI / Azure DevOps.
>
> 1. Build
> 2. Test
> 3. Scan (SAST/Dependabot)
> 4. Deploy staging
> 5. Canary/healthcheck

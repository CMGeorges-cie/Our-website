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

## Production Deployment

### Database Migration

**Important**: When deploying to production, you must migrate static data to the database.

#### Prerequisites
- MongoDB Atlas cluster configured
- Production environment variables set:
  ```bash
  APP_ENV=production
  MONGO_URL=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
  DB_NAME=our_website_prod
  ```

#### Migration Steps
1. **Backup production database** (recommended):
   ```bash
   mongodump --uri="$MONGO_URL" --db=our_website_prod --out=backup_$(date +%Y%m%d_%H%M%S)
   ```

2. **Run migration script**:
   ```bash
   cd backend
   python migrate_production.py
   ```

3. **Verify migration**:
   ```bash
   python verify_migration.py
   ```

4. **Deploy updated code**:
   ```bash
   docker compose -f docker-compose.prod.yml up --build -d
   ```

#### What gets migrated
- **Services**: 3 core services (Déco Touché, Mobilier, Tech Services)
- **Pricing Configs**: 17 pricing configurations across all service types
- **System Configs**: Tax rates, margin targets, payment percentages

See `PRODUCTION_DEPLOYMENT.md` for detailed instructions.

### Environment Variables

#### Development
```bash
APP_ENV=development
MONGO_URL=mongodb://localhost:27017
DB_NAME=our_website_dev
JWT_SECRET=your-dev-secret
```

#### Production
```bash
APP_ENV=production
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=our_website_prod
JWT_SECRET=your-prod-secret
RESEND_API_KEY=your-resend-key
```

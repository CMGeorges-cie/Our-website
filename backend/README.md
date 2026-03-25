# Backend Local Development (MongoDB)

## Goal

Use a local MongoDB instance in development only (not production).

## Local MongoDB setup (recommended)

### Option A: Docker (easy)

1. Install Docker Desktop (Windows).
2. Run:
   ```bash
   docker run -d --name ourwebsite-mongo -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=devuser -e MONGO_INITDB_ROOT_PASSWORD=devpass mongo:7.0
   ```
3. Verify:
   ```bash
   docker ps
   mongo --host localhost --port 27017 -u devuser -p devpass --authenticationDatabase admin
   ```

### Option B: native local MongoDB service

- Install from https://www.mongodb.com/try/download/community
- Start `mongod` with defaults (27017).

## Environment variables

The backend loads config from `.env` by default, and we have a dev-specific file at `backend/.env.dev`:

- `APP_ENV=development`
- `MONGO_URL=mongodb://localhost:27017`
- `DB_NAME=our_website_dev`

If you need a custom connection string:

```bash
export MONGO_URL='mongodb://<user>:<pass>@localhost:27017'
export DB_NAME='our_website_dev'
export APP_ENV=development
```

## Startup

From `backend/`:

```bash
pip install -r requirements.txt
uvicorn server:app --reload
```

## Notes

- In `server.py`, dev defaults are now used if env vars are missing.
- For production, set `APP_ENV=production` and provide secure values in env vars.

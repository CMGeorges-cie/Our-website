# Deployment And Staging

The repository currently documents two important runtime shapes:

- local development with Docker Compose
- a production or staging-style deployment with frontend, backend, and MongoDB/Atlas separated by environment variables

## Local Docker topology

```mermaid
flowchart LR
    Browser["Browser"] --> Frontend["frontend container\nnginx serving CRA build\nport 3000 -> 80"]
    Frontend --> Backend["backend container\nFastAPI + Uvicorn\nport 8000"]
    Backend --> Mongo["mongodb container\nMongo 7.0\nmounted at ./data/db"]
```

Local shape is derived from `docker-compose.yml`.

## Target staging topology

```mermaid
flowchart TB
    Dev["Developer"] --> Git["Git repository"]
    Git --> Build["Build / deploy pipeline\nmanual or CI-driven"]

    subgraph Staging["Staging environment"]
        Frontend["Frontend runtime\nReact build served by nginx or static host"]
        Backend["Backend runtime\nFastAPI service"]
        Env["Environment config\nAPP_ENV, MONGO_URL, DB_NAME,\nJWT_SECRET, CORS_ORIGINS, APP_URL"]
    end

    Browser["Tester / stakeholder browser"] --> Frontend
    Frontend --> Backend
    Frontend --> Analytics["Optional analytics tags"]
    Backend --> Atlas["MongoDB Atlas or managed Mongo instance"]
    Backend --> Resend["Resend email API"]
    Backend --> PDF["On-demand PDF generation"]
    Env --> Frontend
    Env --> Backend
    Build --> Frontend
    Build --> Backend
```

## Deployment view

```mermaid
flowchart LR
    Browser["Browser"] --> Edge["Web host / nginx / static host"]
    Edge --> FrontendBuild["Frontend build assets"]
    Edge --> ApiNode["Application host\nFastAPI app"]
    ApiNode --> PdfEngine["PDF generation"]
    ApiNode --> DbNode["MongoDB\nour_website_* database"]
    ApiNode --> EmailNode["Resend\ntransactional email API"]
```

## Notes

- `docker-compose.yml` shows the local composition of MongoDB, backend, and frontend.
- `docker-compose.prod.yml` shows the environment variables expected by the backend and frontend for a hosted environment.
- `PRODUCTION_DEPLOYMENT.md` documents Atlas-backed deployment and data migration, which is why the staging diagram treats MongoDB as an external managed dependency.
- The frontend currently consumes backend URLs from `REACT_APP_BACKEND_URL` in code even though compose examples mention `REACT_APP_API_URL`, so environment coordination matters in staging.

# UML Documentation

This folder captures the practical UML needed to understand and operate this repository.

## Contents

- [System overview](./system-overview.md): high-level component diagram for the frontend, backend, database, and external integrations.
- [Deployment and staging](./deployment-staging.md): runtime topology for local Docker and the target staging shape.
- [Backend domain model](./backend-domain.md): module and entity relationships inside the FastAPI backend.
- [Key flows](./flows.md): sequence diagrams for lead submission, admin login, and client portal access.

## Scope

The diagrams are based on the current code and deployment files, especially:

- `frontend/src/App.js`
- `frontend/src/lib/api.js`
- `frontend/src/pages/admin/AdminLogin.jsx`
- `frontend/src/pages/ClientPortalPage.jsx`
- `frontend/src/lib/utils.js`
- `backend/server.py`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `PRODUCTION_DEPLOYMENT.md`

## Reading notes

- The backend is implemented as a single large FastAPI module in `backend/server.py`, so the UML groups behavior by domain area instead of by many separate packages.
- The deployment diagrams show the documented target topology, not a claim that CI/CD automation already exists in the repository.

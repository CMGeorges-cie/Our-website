# System Overview

This diagram shows the main runtime components and how the app is split between public site, admin tooling, API, and supporting services.

```mermaid
flowchart LR
    Visitor["Visitor / Client"] --> Frontend["React frontend\npublic pages + client portal + admin UI"]
    Admin["Admin / Staff"] --> Frontend

    Frontend --> Router["React Router routes\npublic, portal, admin"]
    Frontend --> Analytics["GA4 / Meta Pixel\noptional browser-side analytics"]
    Frontend --> API["FastAPI backend\n/api, /api/v1, /api/v1/admin"]

    API --> Auth["JWT auth helpers\nlogin, refresh, bearer validation"]
    API --> PublicDomain["Public domain endpoints\nleads, content, services, blog, portal"]
    API --> AdminDomain["Admin domain endpoints\nCRM, quotes, invoices, projects, pricing, policies"]
    API --> PDF["PDF generation\nquotes + invoices"]
    API --> Email["Email delivery via Resend"]
    API --> Mongo["MongoDB collections"]
    API --> Audit["Audit log records"]

    Mongo --> Leads["leads"]
    Mongo --> Clients["clients"]
    Mongo --> Quotes["quotes"]
    Mongo --> Invoices["invoices"]
    Mongo --> Projects["projects"]
    Mongo --> Content["content + catalog data"]
    Mongo --> Portal["client_portal_access"]
    Mongo --> Blog["blog_posts"]
    Mongo --> Users["users"]
    Mongo --> Logs["audit_logs"]
```

## Notes

- The route split comes from `frontend/src/App.js`, which defines public pages, a client portal route at `/portail-client`, and protected admin routes under `/admin`.
- The frontend talks to the backend through a shared Axios client in `frontend/src/lib/api.js`.
- Backend responsibilities are concentrated in `backend/server.py`, which defines Pydantic models, authentication helpers, API routers, PDF generation, seed flows, and collection access.
- Optional analytics are initialized in `frontend/src/App.js` through `REACT_APP_GA4_ID` and `REACT_APP_META_PIXEL_ID`.

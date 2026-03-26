# Key Request Flows

These sequence diagrams document the highest-value behaviors shared across the public site, admin area, and client portal.

## Public lead submission

```mermaid
sequenceDiagram
    actor Visitor
    participant Form as React lead form
    participant API as FastAPI /api/v1/leads
    participant Recaptcha as reCAPTCHA verifier
    participant DB as MongoDB leads
    participant Audit as audit_logs
    participant Email as Resend email

    Visitor->>Form: Complete quote / lead form
    Form->>API: POST /api/v1/leads
    API->>Recaptcha: Verify token when provided
    Recaptcha-->>API: valid / invalid
    alt invalid token
        API-->>Form: 400 reCAPTCHA verification failed
    else valid or skipped
        API->>DB: insert lead document
        API->>Audit: create_audit_log("lead_created")
        API->>Email: queue admin notification
        API->>Email: queue client confirmation
        API-->>Form: Return Lead payload
    end
```

Based on `create_lead(...)` in `backend/server.py` and the shared API client in `frontend/src/lib/api.js`.

## Admin login and protected admin access

```mermaid
sequenceDiagram
    actor Admin
    participant Login as AdminLogin.jsx
    participant API as FastAPI /api/v1/auth/login
    participant Users as MongoDB users
    participant Audit as audit_logs
    participant Browser as localStorage
    participant Layout as AdminLayout.jsx

    Admin->>Login: Submit email and password
    Login->>API: POST /api/v1/auth/login
    API->>Users: find user by email
    API->>API: verify password hash
    alt invalid or disabled account
        API-->>Login: 401 error
    else success
        API->>Audit: create_audit_log("user_login")
        API-->>Login: access_token + refresh_token + user
        Login->>Browser: setAuthData(access_token, user)
        Login->>Layout: navigate to /admin/dashboard
        Layout->>Browser: isAuthenticated()
        Layout-->>Admin: Render protected admin routes
    end
```

Based on:

- `frontend/src/pages/admin/AdminLogin.jsx`
- `frontend/src/components/layout/AdminLayout.jsx`
- `frontend/src/lib/utils.js`
- `backend/server.py` login and auth helper functions

## Client portal invitation and portal data access

```mermaid
sequenceDiagram
    actor Staff as Admin staff
    participant AdminUI as Admin clients screen
    participant API as FastAPI portal endpoints
    participant DB as MongoDB
    participant Email as Resend
    actor Client
    participant Portal as ClientPortalPage.jsx

    Staff->>AdminUI: Create portal access for client
    AdminUI->>API: POST /api/v1/admin/clients/{client_id}/portal-access
    API->>DB: load client
    API->>DB: deactivate prior portal tokens
    API->>DB: insert new client_portal_access record
    API->>Email: send portal link with token
    API-->>AdminUI: portal_url

    Client->>Portal: Open /portail-client?token=...
    Portal->>API: GET /api/v1/portal/access?token=...
    API->>DB: validate active token and expiry
    API-->>Portal: client_id
    Portal->>API: GET /api/v1/portal/data/{client_id}?token=...
    API->>DB: load client, quotes, invoices, projects
    API-->>Portal: aggregated portal payload
    Client->>Portal: Download quote or invoice PDF
    Portal->>API: GET /api/v1/portal/{quote|invoice}/{id}/pdf?token=...
    API->>DB: revalidate access and load document
    API-->>Portal: Streaming PDF response
```

Based on:

- portal access endpoints in `backend/server.py`
- `frontend/src/pages/ClientPortalPage.jsx`
- shared portal API helpers in `frontend/src/lib/api.js`

## Flow observations

- Public and admin flows both depend on the same backend service, but only admin routes require JWT bearer authentication.
- The client portal uses tokenized access records in MongoDB instead of admin JWTs.
- Email and audit logging are side effects that recur across lead capture, login, CRUD changes, and portal access issuance.

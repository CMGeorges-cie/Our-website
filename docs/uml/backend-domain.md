# Backend Domain Model

The backend is organized as one FastAPI module with several domain clusters. The diagram below focuses on the main persistent entities and the relationships the API exposes.

```mermaid
classDiagram
    class User {
      +id
      +email
      +full_name
      +role
      +password_hash
      +is_active
    }

    class Lead {
      +id
      +full_name
      +email
      +phone
      +service_type
      +status
      +source
      +items[]
    }

    class LeadItem {
      +item_type
      +brand
      +quantity
      +notes
    }

    class Client {
      +id
      +full_name
      +email
      +phone
      +status
      +address
      +city
    }

    class Quote {
      +id
      +lead_id
      +client_id
      +status
      +lines[]
      +subtotal
      +total_with_tax
    }

    class QuoteLine {
      +description
      +quantity
      +unit_price
      +total
    }

    class Invoice {
      +id
      +client_id
      +quote_id
      +status
      +lines[]
      +payments[]
      +balance_due
    }

    class Project {
      +id
      +client_id
      +title
      +service_type
      +status
      +estimated_hours
    }

    class ClientPortalAccess {
      +id
      +client_id
      +email
      +access_token
      +expires_at
      +is_active
    }

    class BlogPost {
      +id
      +slug
      +title
      +status
      +published_at
    }

    class DiscountCode {
      +id
      +code
      +discount_type
      +discount_value
      +is_active
    }

    class PricingItem {
      +id
      +service_type
      +category
      +base_price
      +is_active
    }

    class Policy {
      +id
      +policy_type
      +title
      +version
      +is_active
    }

    class AuditLog {
      +id
      +action
      +entity_type
      +entity_id
      +user_id
      +created_at
    }

    Lead "1" --> "0..*" LeadItem : contains
    Lead "0..1" --> "1" Client : converts to
    Lead "1" --> "0..*" Quote : source for
    Client "1" --> "0..*" Quote : receives
    Client "1" --> "0..*" Invoice : billed by
    Client "1" --> "0..*" Project : owns
    Client "1" --> "0..*" ClientPortalAccess : gets
    Quote "1" --> "0..*" QuoteLine : contains
    Quote "0..1" --> "0..*" Invoice : may generate
    User "1" --> "0..*" AuditLog : performs actions
    BlogPost "1" --> "0..*" AuditLog : lifecycle tracked
    DiscountCode "1" --> "0..*" AuditLog : changes tracked
    PricingItem "1" --> "0..*" AuditLog : changes tracked
    Policy "1" --> "0..*" AuditLog : changes tracked
```

## Backend module clusters

```mermaid
flowchart LR
    Entry["FastAPI app\nbackend/server.py"] --> Auth["Auth helpers\nJWT + bearer auth"]
    Entry --> Public["Public API\nleads, content, blog, portal"]
    Entry --> Admin["Admin API\nCRM + finance + content"]
    Entry --> Seed["Seed and migration helpers"]
    Entry --> Docs["Health and utility routes"]

    Public --> Collections1["leads, portfolio_media, faqs,\ncontent_pages, blog_posts, client_portal_access"]
    Admin --> Collections2["clients, quotes, invoices, projects,\ndiscount_codes, pricing_items, policies, audit_logs"]
    Auth --> Users["users collection"]
    Seed --> Catalog["services, pricing_configs,\nsystem_configs, service_types, item_types, brands, sources"]
```

## Notes

- The entity list mirrors Pydantic models declared in `backend/server.py`, including `Lead`, `Client`, `Quote`, `Invoice`, `Project`, `ClientPortalAccess`, `BlogPost`, `DiscountCode`, `PricingItem`, `Policy`, and `AuditLog`.
- Relationship direction follows the API behavior. For example, `POST /api/v1/admin/leads/{lead_id}/convert-to-client` turns a lead into a client, and portal records are created through `POST /api/v1/admin/clients/{client_id}/portal-access`.
- Audit logging is a cross-cutting concern implemented through `create_audit_log(...)` and reused across login, CRUD, blog, portal, pricing, policy, and invoice flows.

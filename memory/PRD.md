# CMGeorges - Product Requirements Document

## Project Overview
**Company:** CMGeorges
**Location:** Montreal & Rive-Sud, Quebec
**Services:** 
- Déco Touché (Peinture/Rénovation)
- Mobilier & Installation (IKEA, JYSK)
- CMGeorges Tech (Web development)

**Tech Stack:** React + FastAPI + MongoDB

## Live Preview
**URL:** https://cmgeorges-staging.preview.emergentagent.com

## Test Credentials
- **Admin Email:** admin@cmgeorges.com
- **Admin Password:** admin123

---

## What's Been Implemented

### Phase 1: Core Infrastructure (COMPLETE)
- [x] Full-stack application scaffolding (React + FastAPI + MongoDB)
- [x] CMGeorges branding applied (colors, logo, fonts)
- [x] Public site navigation and layout
- [x] Admin panel layout with authentication

### Phase 2: Public Site (COMPLETE)
- [x] Homepage with hero section, services overview
- [x] Services page
- [x] Mobilier page
- [x] Portfolio page
- [x] Contact page
- [x] Soumission (Lead submission) form with service selection
- [x] FAQ page
- [x] Privacy Policy page
- [x] Terms of Service page
- [x] Warranty page
- [x] SEO geo-targeted pages:
  - /services-peinture-montreal
  - /services-peinture-longueuil
  - /services-peinture-brossard
  - /services-peinture-laval
  - /services-saint-laurent
- [x] robots.txt and sitemap.xml

### Phase 3: Backend CRM APIs (COMPLETE)
- [x] User authentication (JWT with access/refresh tokens)
- [x] Leads CRUD (create, read, update)
- [x] Clients CRUD 
- [x] Quotes creation with automatic calculations:
  - Quebec taxes (TPS 5%, TVQ 9.975%)
  - Contingency fees (10-20%)
  - Market price comparison
  - Payment terms (30% deposit, 30% milestone, 40% final)
- [x] Invoices CRUD with:
  - Auto-generated invoice numbers (CMG-YYYY-XXXX)
  - Payment tracking
- [x] Projects CRUD with status tracking
- [x] Admin statistics dashboard
- [x] CEO dashboard with financial metrics

### Phase 4: Admin Frontend CRM (COMPLETE)
- [x] Admin login page
- [x] Dashboard with statistics overview
- [x] Leads management page with filters
- [x] Lead detail view
- [x] Clients management page
- [x] Invoices management page
- [x] Projects management page
- [x] Revenue/CEO dashboard with:
  - Monthly revenue tracking
  - Profit margins by division
  - Conversion rate visualization
  - Revenue chart (6 months)
  - Top services breakdown

### Phase 5: Integrations (CONFIGURED)
- [x] Resend API configured for emails
- [x] Google reCAPTCHA v2 configured
- [x] Google Analytics 4 configured
- [x] Meta Pixel configured

---

## Bugs Fixed

### Critical - SEO Pages Blank Screen (FIXED - Feb 18, 2026)
**Issue:** Pages like `/services-peinture-montreal` showed blank white screen
**Root Cause:** Routes in App.js used `/services/:city` pattern but URLs were `/services-peinture-montreal`
**Solution:** Added static routes for each SEO page with explicit city prop

### Minor - Admin Login Logo (FIXED - Feb 18, 2026)
**Issue:** Logo appeared as white square on admin login
**Solution:** Replaced external image with inline styled logo

---

## Testing Status
- **Backend Tests:** 25/25 passed (100%)
- **Frontend Tests:** 100% pages functional
- **Test Report:** /app/test_reports/iteration_3.json

---

## Upcoming Tasks (Priority Order)

### P0 - High Priority
1. **Email Integration Testing** - Test actual email delivery via Resend
2. **reCAPTCHA Integration** - Wire up to forms

### P1 - Medium Priority
1. **Blog Section** - Create blog listing and article pages
2. **Quote PDF Generation** - Generate downloadable PDF quotes
3. **Invoice PDF Generation** - Generate downloadable PDF invoices

### P2 - Lower Priority
1. **Client Detail Page** - View/edit individual client
2. **Project Detail Page** - View/edit individual project
3. **Lead to Client Conversion Flow** - UI for converting leads

---

## Future/Backlog Tasks

### DevSecOps
- Rate limiting implementation
- Security headers (CSP, HSTS)
- Database backup automation
- CI/CD pipeline with GitHub Actions

### UX Improvements
- Mobile CTA sticky button
- Form auto-save draft
- Dashboard real-time updates

### Additional Features
- Multi-language support (EN/FR)
- Client portal for viewing quotes/invoices
- SMS notifications via Twilio
- Calendar integration for scheduling

---

## Technical Architecture

```
/app
├── backend/
│   ├── .env              # Environment variables
│   ├── requirements.txt  # Python dependencies
│   ├── server.py         # FastAPI application (all routes & models)
│   └── tests/            # Pytest test files
└── frontend/
    ├── .env              # React environment variables
    ├── package.json      # Node dependencies
    ├── public/
    │   ├── robots.txt
    │   └── sitemap.xml
    └── src/
        ├── App.js        # Router configuration
        ├── components/   # Reusable UI components
        │   ├── layout/   # Layout components
        │   └── ui/       # Shadcn UI components
        ├── lib/          # Utilities and API client
        └── pages/        # All application pages
            ├── admin/    # Admin CRM pages
            └── ...       # Public pages
```

## Key API Endpoints

### Public
- `POST /api/v1/leads` - Submit lead from form
- `POST /api/v1/contact` - Contact form submission
- `GET /api/v1/services` - Get services list
- `GET /api/v1/portfolio` - Get portfolio items
- `GET /api/v1/pricing` - Get pricing info

### Auth
- `POST /api/v1/auth/login` - Admin login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user

### Admin
- `GET/PATCH /api/v1/admin/leads` - Leads management
- `GET/POST/PATCH /api/v1/admin/clients` - Clients management
- `GET/POST /api/v1/admin/quotes` - Quotes management
- `GET/POST/PATCH /api/v1/admin/invoices` - Invoices management
- `GET/POST/PATCH /api/v1/admin/projects` - Projects management
- `GET /api/v1/admin/stats` - Dashboard statistics
- `GET /api/v1/admin/ceo-dashboard` - CEO financial dashboard

---

## Database Collections (MongoDB)
- `users` - Admin/staff users
- `leads` - Customer leads
- `clients` - Converted clients
- `quotes` - Price quotes
- `invoices` - Customer invoices
- `projects` - Active projects
- `portfolio_media` - Portfolio items
- `contact_messages` - Contact form submissions
- `audit_logs` - System audit trail

---

*Last Updated: February 18, 2026*

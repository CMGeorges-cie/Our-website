# CMGeorges - Product Requirements Document

## Original Problem Statement
Site web complet pour CMGeorges (Montréal / Rive-Sud) avec 3 divisions:
1. **Déco Touché** - Peinture, entretien et rénovation légère
2. **Fourniture & Installation Mobilier** - Service clé en main IKEA/JYSK
3. **CMGeorges Tech** - Solutions web, développement et DevOps

### Business Rules
- Soumissions avec imprévu automatique 10-20%
- Prix avant taxes + TPS (5%) + TVQ (9.975%) séparées
- Comparatif prix marché vs prix CMGeorges
- Téléphone affiché: 514-386-1743

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: JWT avec rôles (admin/staff)

## User Personas
1. **Propriétaires résidentiels** - Cherchent rénovation ou assemblage mobilier
2. **Acheteurs IKEA/JYSK** - Besoin assemblage professionnel
3. **Entreprises** - Besoin solutions tech

## Core Requirements
- [x] Homepage avec 3 cartes services
- [x] Page Mobilier dédiée
- [x] Formulaire soumission dynamique (items mobilier)
- [x] Portfolio avec filtres
- [x] Admin dashboard avec statistiques
- [x] Pipeline leads (new/contacted/quoted/won/lost)
- [x] Génération soumissions HTML imprimable
- [x] Calculs automatiques (TPS/TVQ/imprévu)
- [x] Authentification admin/staff
- [x] Sticky CTA mobile

## What's Been Implemented (Feb 2026)
### Backend
- FastAPI avec tous les endpoints CRUD
- Modèles MongoDB (users, leads, lead_items, quotes, quote_lines, portfolio_media, audit_logs)
- Auth JWT avec rôles admin/staff
- Seed data avec données démo
- Health check endpoint

### Frontend
- Navigation responsive avec glass morphism
- Homepage avec hero, services, testimonials
- Pages: Services, Mobilier, Portfolio, Contact, Soumission
- Admin: Login, Dashboard, Leads list, Lead detail, Quote view
- Branding: bleu profond (#1a365d) + or (#d4af37)
- Fonts: Outfit (headings), Plus Jakarta Sans (body)

## Backlog (P0/P1/P2)
### P0 (Critical) - Done
- [x] Core public pages
- [x] Lead capture form
- [x] Admin authentication
- [x] Quote generation

### P1 (Important)
- [ ] Email notifications on new lead
- [ ] PDF generation (instead of HTML print)
- [ ] Search functionality in admin
- [ ] Admin user management

### P2 (Nice to have)
- [ ] Google Analytics integration
- [ ] Live chat widget
- [ ] SMS notifications
- [ ] Multi-language (FR/EN)

## Next Tasks
1. Add email notification when lead is created
2. Implement PDF generation for quotes
3. Add admin user management UI
4. SEO optimization (meta tags, sitemap)

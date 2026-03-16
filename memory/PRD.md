# CMGeorges / ServiceFlow — Product Requirements Document

**Dernière mise à jour:** 16 Mars 2026  
**Stack:** React + FastAPI + MongoDB  
**Langue:** Français

---

## Vision Produit

**CMGeorges** = Entreprise de services (déco, rénovation) — Montréal & Rive-Sud  
**ServiceFlow** = Plateforme SaaS CRM pour entreprises de services (vendable à d'autres entreprises)

---

## Architecture

```
/app
├── backend/
│   ├── server.py          # FastAPI app principale (4200+ lignes)
│   ├── routers/           # [NEW] Routeurs modulaires v2
│   │   ├── auth.py        # Authentification mobile-ready
│   │   ├── projects.py    # Projets avec multi-tenant
│   │   └── mobile.py      # API mobile optimisée
│   ├── services/
│   │   └── database.py    # [NEW] Repository multi-tenant
│   ├── middleware/
│   │   └── tenant.py      # [NEW] Isolation multi-tenant
│   ├── schemas/
│   │   └── base.py        # [NEW] Modèles Pydantic partagés
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── components/layout/AdminLayout.jsx
│   │   ├── lib/api.js
│   │   └── pages/
│   │       ├── admin/
│   │       └── client/
│   └── tests/e2e/
└── mobile/                 # [NEW] Structure app React Native
    ├── src/
    │   ├── screens/
    │   ├── components/
    │   ├── services/api.ts  # Client API mobile
    │   └── navigation/
    └── README.md
```

---

## Ce Qui est Implémenté

### Phase 1 ✅ (Complétée)

#### Branding & Visual
- [x] Animation Vanta.js NET sur page login (fond violet/or)
- [x] Branding ServiceFlow sur login + sidebar admin
- [x] Badge "CMGeorges Workspace" dans sidebar
- [x] Logo lion couronné ServiceFlow sur toutes les pages
- [x] Thème dark/light avec toggle

#### CRM Admin (CRUD complet)
- [x] Leads (liste + détail + suppression)
- [x] Clients (liste + créer + modifier + supprimer + détail)
- [x] Factures (liste + créer + supprimer + PDF + email)
- [x] Projets (liste + créer + supprimer + détail)
- [x] Soumissions/Devis (vue + PDF + email)
- [x] Blog (CRUD complet)
- [x] Codes Promo (CRUD complet)
- [x] Tarification (CRUD complet)
- [x] Politiques (CRUD complet)
- [x] Gestion Utilisateurs (CRUD + rôles + reset mdp)

#### Système de Notifications ✅
- [x] Icône cloche dans le header admin avec badge compteur
- [x] Page /admin/notifications - Centre de notifications
- [x] API endpoints: GET list, GET unread-count, PATCH mark-read
- [x] Notifications automatiques: nouveaux leads, factures, paiements

### Phase 2 ✅ (Projets Améliorés)

#### Gestion des Tâches de Projet
- [x] Modèle de tâches (title, description, status, due_date)
- [x] API: CRUD tâches de projet
- [x] UI: Liste de tâches avec checkboxes
- [x] Barre de progression interactive

#### Messagerie Interne ✅
- [x] Messages par projet (admin/client)
- [x] Notifications email
- [x] Timeline des événements

### Phase 3 🚧 (En Cours - Mars 2026)

#### Architecture Multi-Tenant ✅
- [x] Middleware d'extraction tenant_id depuis JWT
- [x] TenantContext pour isolation des requêtes
- [x] TenantRepository avec filtres automatiques
- [x] Routeurs v2 avec isolation complète

#### API Mobile v2 ✅
- [x] Endpoints optimisés pour React Native
- [x] Check-in/Check-out avec GPS
- [x] Upload photos (base64)
- [x] Dashboard mobile
- [x] Sync offline
- [x] Tracking temps et matériaux

#### Structure Mobile ✅
- [x] Architecture projet React Native
- [x] Client API TypeScript
- [x] Documentation endpoints

---

## API Endpoints v2 (Mobile)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/v2/auth/login` | POST | Connexion (8h token) |
| `/api/v2/auth/refresh` | POST | Refresh token |
| `/api/v2/auth/me` | GET | Info utilisateur |
| `/api/v2/auth/mobile/device-token` | POST | Push notifications |
| `/api/v2/mobile/dashboard` | GET | Stats dashboard |
| `/api/v2/mobile/sync/projects` | GET | Sync projets |
| `/api/v2/mobile/sync/today` | GET | Projets du jour |
| `/api/v2/mobile/checkin` | POST | Arrivée sur site |
| `/api/v2/mobile/checkout` | POST | Départ + signature |
| `/api/v2/mobile/photos` | POST | Upload photo |
| `/api/v2/mobile/projects/{id}/status` | PATCH | Statut rapide |
| `/api/v2/mobile/materials` | POST | Log matériaux |
| `/api/v2/mobile/time` | POST | Log temps |
| `/api/v2/projects` | GET/POST | CRUD projets |
| `/api/v2/projects/my-assignments` | GET | Mes assignations |
| `/api/v2/projects/{id}/tasks` | GET/POST | Tâches |
| `/api/v2/projects/{id}/messages` | GET/POST | Messages |

---

## Identifiants de Test

| Role | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@cmgeorges.com | strongpassword123 |
| Test | test@cmgeorges.com | testpassword |
| Staff | staff@cmgeorges.com | staffpassword123 |

---

## Intégrations

| Service | Statut | Notes |
|---------|--------|-------|
| Resend | ✅ | Email devis + factures + notifications |
| Stripe | ✅ | Abonnements SaaS + paiements factures |
| Google reCAPTCHA | ⛔ Désactivé | Attente clé v2 Checkbox |
| Vanta.js | ✅ | Animation NET sur login |
| fpdf/pyfpdf | ✅ | PDF quotes + invoices |

---

## Backlog Priorisé

### P0 (Critique) - En Cours
- [x] Architecture multi-tenant (backend)
- [x] API Mobile v2
- [ ] Initialisation projet React Native complet
- [ ] Tests E2E API v2

### P1 — Prochaine Phase
- [ ] App mobile technicien (React Native)
  - [ ] Écran de login
  - [ ] Liste des projets
  - [ ] Détail projet + tâches
  - [ ] Check-in/Check-out
  - [ ] Upload photos
- [ ] Portail client mobile
- [ ] Push notifications (Firebase)

### P2 — Phase 4
- [ ] Catalogue de services
- [ ] Système Produits + Installation
- [ ] Gestion inventaire
- [ ] Contrats de maintenance
- [ ] Dashboard Analytics avancé

### P3 — Futur
- [ ] Migration PostgreSQL
- [ ] API publique ServiceFlow
- [ ] Marketplace de services

---

## Routes de l'Application

| Route | Description |
|-------|-------------|
| / | Site public CMGeorges |
| /serviceflow | Landing page ServiceFlow |
| /serviceflow/pricing | Tarification SaaS |
| /connexion | Choix connexion (Admin/Client) |
| /admin/login | Connexion admin |
| /admin/dashboard | Dashboard CRM |
| /admin/projects | Gestion projets |
| /client/login | Portail client |
| /client/dashboard | Dashboard client |

---

## Notes Techniques

- JWT auth avec tenant_id intégré
- MongoDB avec exclusion `_id` systématique
- API v1 (legacy) + v2 (mobile-optimized)
- Thème: gold-500 = #d4af37, fond = #0f0f1a
- Hot reload frontend/backend activé

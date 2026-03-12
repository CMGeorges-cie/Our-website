# CMGeorges / ServiceFlow — Product Requirements Document

**Dernière mise à jour:** 12 Mars 2026  
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
│   ├── server.py       # FastAPI app (3600+ lignes, à découper en Phase 4)
│   ├── models.py
│   ├── features.py
│   ├── tests/          # Tests pytest
│   │   └── test_notifications.py
│   └── .env
└── frontend/
    ├── src/
    │   ├── App.js
    │   ├── components/layout/AdminLayout.jsx   # Sidebar + notification bell
    │   ├── lib/api.js                          # Toutes les requêtes API
    │   ├── lib/utils.js
    │   └── pages/
    │       ├── admin/          # Panel admin (thème noir/or)
    │       │   └── AdminNotifications.jsx  # Centre de notifications
    │       ├── client/         # Portail client
    │       │   ├── ClientLogin.jsx
    │       │   └── ClientDashboard.jsx
    │       └── ServiceFlowPricing.jsx  # /serviceflow/pricing
    └── tests/e2e/
        └── notifications.spec.ts
```

---

## Ce Qui est Implémenté

### Phase 1 ✅ (Complétée)

#### Branding & Visual
- [x] Animation Vanta.js NET sur page login (fond violet/or)
- [x] Branding ServiceFlow sur login + sidebar admin
- [x] Badge "CMGeorges Workspace" dans sidebar

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
- [x] Gestion Utilisateurs (CRUD + rôles + reset mdp + activer/désactiver)

#### Système de Notifications ✅ (NEW - Mars 2026)
- [x] Icône cloche dans le header admin avec badge compteur non-lus
- [x] Page /admin/notifications - Centre de notifications
- [x] API endpoints: GET list, GET unread-count, PATCH mark-read, DELETE
- [x] Notifications automatiques: nouveaux leads, factures créées, paiements reçus, changements statut projet
- [x] Emails envoyés via Resend + notifications in-app stockées en DB
- [x] Filtres: Toutes / Non lues + bouton "Tout marquer lu"
- [x] Actions: Voir détails, marquer lu, supprimer

#### Portail Client
- [x] Inscription et connexion client (/client/login)
- [x] Dashboard client (projets, factures, statuts)
- [x] Paiement facture en ligne via Stripe

#### ServiceFlow SaaS
- [x] Page tarification publique (/serviceflow/pricing)
- [x] Plans: Starter 29$/mois, Pro 79$/mois, Business 149$/mois
- [x] Stripe checkout pour abonnements SaaS
- [x] Stripe checkout pour paiements factures
- [x] Webhooks Stripe

#### Backend
- [x] Multi-tenant foundation (tenant_id field, client router isolation)
- [x] Endpoints gestion utilisateurs admin
- [x] Client portal auth (register, login, dashboard, projects, invoices)
- [x] SaaS subscription endpoints
- [x] Invoice payment endpoints
- [x] Notification endpoints (list, unread-count, mark-read, delete)

---

## Identifiants de Test

| Role | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@cmgeorges.com | strongpassword123 |
| Test | test@cmgeorges.com | testpassword |
| Staff | staff@cmgeorges.com | staffpassword123 |
| Client test | testclient@email.com | password123 |

---

## Intégrations

| Service | Statut | Notes |
|---------|--------|-------|
| Resend | ✅ | Email devis + factures + notifications |
| Stripe | ✅ | Abonnements SaaS + paiements factures |
| Google reCAPTCHA | ⛔ Désactivé | Attente clé v2 Checkbox |
| Google Analytics 4 | ✅ | Setup de base |
| Meta Pixel | ✅ | Setup de base |
| Vanta.js | ✅ | Animation NET sur login |
| fpdf/pyfpdf | ✅ | PDF quotes + invoices |

---

## Backlog Priorisé

### P0 (Critique)
- [ ] reCAPTCHA: clé "v2 Checkbox" requise

### P1 — Phase 2 (Prochaine)
- [ ] Projects: barre de progression interactive + tâches + timeline + photos
- [ ] Projects: bouton "Modifier" opérationnel + rapport d'intervention
- [ ] Messagerie interne par projet (fil de discussion client/admin)
- [ ] Work Orders (interventions terrain + check-in/out + signature)
- [ ] Calendrier de planification + assignation techniciens

### P2 — Phase 3
- [ ] Gestion des dépenses (matériaux, carburant, déplacements)
- [ ] Gestion immeubles (Buildings, Units, Tenants, Maintenance Requests)
- [ ] Inventaire (outils, pièces, stock)
- [ ] Tableaux de bord avancés + export CSV/PDF
- [ ] Suivi des heures par projet

### P3 — Phase 4
- [ ] App mobile React Native (client + technicien)
- [ ] Firebase Push Notifications
- [ ] Architecture multi-tenant complète (isolation par tenantId dans TOUTES les collections)
- [ ] Refactoring server.py en modules (routers/, models/, services/)
- [ ] Migration PostgreSQL (à confirmer)

### P4 — Futur
- [ ] CRM avancé (segmentation, campagnes marketing, relances auto)
- [ ] Contrats et abonnements récurrents pour clients
- [ ] API publique ServiceFlow
- [ ] Tableau de bord super-admin (multi-tenant view)

---

## Routes de l'Application

| Route | Description |
|-------|-------------|
| / | Site public CMGeorges |
| /serviceflow/pricing | Page tarification ServiceFlow |
| /client/login | Portail client connexion/inscription |
| /client/dashboard | Tableau de bord client |
| /admin/login | Connexion admin ServiceFlow |
| /admin/dashboard | Dashboard CRM |
| /admin/notifications | Centre de notifications |
| /admin/users | Gestion utilisateurs et rôles |
| /admin/leads | Gestion des leads |
| /admin/clients | Gestion des clients |
| /admin/projects | Gestion des projets |
| /admin/invoices | Gestion des factures |
| /admin/revenue | Analytics revenus |
| /admin/blog | Blog admin |
| /admin/discounts | Codes promo |
| /admin/pricing | Grille tarifaire |
| /admin/policies | Politiques |

---

## Notes Techniques

- Bcrypt pour les mots de passe (sel valide requis)
- JWT auth pour admin + client (tokens séparés en localStorage)
- MongoDB `_id` exclu de toutes les réponses API
- Stripe via `emergentintegrations` library (clé `sk_test_emergent`)
- Vanta.js via npm (`yarn add vanta three`)
- Thème admin: gold-500 = #d4af37, fond = #0f0f1a
- Notifications stockées dans collection `notifications` MongoDB

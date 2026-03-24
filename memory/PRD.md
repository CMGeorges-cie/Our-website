# CMGeorges / ServiceFlow — Product Requirements Document

**Dernière mise à jour:** 24 Mars 2026  
**Stack:** React + FastAPI + MongoDB  
**Langue:** Français

---

## Vision Produit

**CMGeorges** = Entreprise de services (déco, rénovation) — Montréal & Rive-Sud  
**ServiceFlow** = Plateforme SaaS CRM pour entreprises de services

---

## Architecture

```
/app
├── backend/
│   ├── server.py          # FastAPI app principale
│   ├── routers/           # Routeurs modulaires v2
│   │   ├── auth.py        # Authentification mobile-ready
│   │   ├── projects.py    # Projets avec multi-tenant
│   │   ├── mobile.py      # API mobile optimisée
│   │   └── catalog.py     # Catalogue de services [NEW]
│   ├── services/
│   │   └── database.py    # Repository multi-tenant
│   ├── middleware/
│   │   └── tenant.py      # Isolation multi-tenant
│   └── schemas/base.py    # Modèles Pydantic partagés
├── frontend/
│   ├── src/
│   │   ├── lib/api.js     # Client API (v1 + v2)
│   │   └── pages/admin/
│   │       └── AdminCatalog.jsx [NEW]
│   └── tests/e2e/
└── mobile/                 # App React Native
    ├── App.tsx
    ├── package.json
    └── src/
        ├── screens/
        │   ├── auth/LoginScreen.tsx
        │   └── technician/
        │       ├── HomeScreen.tsx
        │       ├── ProjectsScreen.tsx
        │       └── ProjectDetailScreen.tsx
        ├── services/api.ts
        ├── hooks/useAuth.tsx
        ├── navigation/RootNavigator.tsx
        └── utils/constants.ts
```

---

## Ce Qui est Implémenté

### Phase 1 ✅ (CRM Admin)
- [x] Leads, Clients, Factures, Projets (CRUD complet)
- [x] Devis, Blog, Codes Promo, Tarification, Politiques
- [x] Système de Notifications complet
- [x] Thème dark/light premium noir/or
- [x] Branding ServiceFlow avec logo lion

### Phase 2 ✅ (Projets Améliorés)
- [x] Gestion des tâches de projet avec progression
- [x] Messagerie interne par projet
- [x] Timeline des événements

### Phase 3 ✅ (Architecture Multi-Tenant & Mobile)
- [x] Middleware d'isolation multi-tenant (TenantContext)
- [x] TenantRepository avec filtres automatiques
- [x] API v2 mobile-ready avec endpoints optimisés
- [x] Structure React Native complète
- [x] Écrans: Login, Home, Projects, ProjectDetail

### Phase 4 ✅ (Catalogue de Services)
- [x] API CRUD /api/v2/catalog
- [x] Catégories: peinture, mobilier, tech, entretien, installation
- [x] Types de prix: fixe, horaire, par unité, sur devis
- [x] Services en vedette
- [x] Interface admin complète avec recherche et filtres
- [x] Endpoint seed-defaults avec 9 services CMGeorges

---

## API Endpoints

### V1 (Legacy Web)
| Route | Description |
|-------|-------------|
| `/api/v1/auth/*` | Authentification |
| `/api/v1/admin/*` | CRUD CRM |
| `/api/v1/client/*` | Portail client |

### V2 (Mobile-Ready)
| Route | Description |
|-------|-------------|
| `/api/v2/auth/login` | Login (8h token) |
| `/api/v2/auth/refresh` | Refresh token |
| `/api/v2/auth/me` | Info utilisateur |
| `/api/v2/mobile/dashboard` | Stats technicien |
| `/api/v2/mobile/sync/*` | Sync offline |
| `/api/v2/mobile/checkin` | Check-in GPS |
| `/api/v2/mobile/checkout` | Check-out + signature |
| `/api/v2/mobile/photos` | Upload photos |
| `/api/v2/projects/*` | CRUD projets |
| `/api/v2/catalog` | **Catalogue services** |
| `/api/v2/catalog/public` | Services publics |
| `/api/v2/catalog/packages/*` | Forfaits |

---

## Identifiants de Test

| Role | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@cmgeorges.com | strongpassword123 |

---

## Tests

- **Iteration 8:** 35 tests (34 passed, 1 xfail corrigé)
- Backend: 18 tests API
- Frontend: 16 tests E2E

---

## Backlog Priorisé

### P0 ✅ Complété
- [x] Architecture multi-tenant
- [x] API Mobile v2
- [x] Catalogue de services
- [x] Fix logo /connexion

### P1 — Prochaine Phase
- [ ] Publier app React Native sur TestFlight/Play Store
- [ ] Push notifications (Firebase)
- [ ] Mode offline avec sync

### P2 — Phase 5
- [ ] Système Produits + Installation (inventaire)
- [ ] Contrats de maintenance
- [ ] Intégration catalogue dans création de devis

### P3 — Futur
- [ ] Migration PostgreSQL
- [ ] Dashboard Analytics avancé
- [ ] Marketplace de services

---

## Routes Frontend

| Route | Description |
|-------|-------------|
| `/` | Site public CMGeorges |
| `/serviceflow` | Landing page SaaS |
| `/connexion` | Choix connexion |
| `/admin/catalog` | **Catalogue services** |
| `/admin/*` | Dashboard CRM |
| `/client/*` | Portail client |

---

## Intégrations

| Service | Statut |
|---------|--------|
| Resend | ✅ Email |
| Stripe | ✅ Paiements |
| Vanta.js | ✅ Animation |
| fpdf2 | ✅ PDF |
| reCAPTCHA | ⛔ Désactivé |

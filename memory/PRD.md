# CMGeorges - Product Requirements Document

## Project Overview
**Company:** CMGeorges  
**Location:** Montréal & Rive-Sud, Québec  
**Services:** 
- Déco Touché (Peinture/Rénovation)
- Mobilier & Installation (IKEA, JYSK)
- CMGeorges Tech (Développement web)

**Tech Stack:** React + FastAPI + MongoDB

## Live Preview
**URL:** https://cmgeorges-staging.preview.emergentagent.com

## Test Credentials
- **Admin Email:** admin@cmgeorges.com
- **Admin Password:** admin123

---

## What's Been Implemented ✅

### Phase 1: Core Infrastructure (COMPLETE)
- [x] Full-stack application (React + FastAPI + MongoDB)
- [x] CMGeorges branding (couleurs, logo, polices)
- [x] Navigation et mise en page du site public
- [x] Panel admin avec authentification JWT

### Phase 2: Site Public (COMPLETE)
- [x] Page d'accueil avec hero section
- [x] Page Services
- [x] Page Mobilier
- [x] Page Portfolio
- [x] Page Contact
- [x] Formulaire de Soumission avec sélection de service
- [x] Page FAQ
- [x] Politique de confidentialité
- [x] Conditions d'utilisation
- [x] Page Garantie
- [x] Pages SEO géo-ciblées:
  - /services-peinture-montreal
  - /services-peinture-longueuil
  - /services-peinture-brossard
  - /services-peinture-laval
  - /services-saint-laurent
- [x] robots.txt et sitemap.xml

### Phase 3: Section Blog (COMPLETE) ✨ NEW
- [x] Page liste des articles `/blog`
- [x] Page article détaillé `/blog/:slug`
- [x] Filtrage par catégories
- [x] Compteur de vues
- [x] Tags et métadonnées SEO
- [x] Admin CRUD pour les articles
- [x] Articles de démonstration créés

### Phase 4: Backend CRM APIs (COMPLETE)
- [x] Authentification utilisateur (JWT)
- [x] Leads CRUD (création, lecture, mise à jour)
- [x] Clients CRUD 
- [x] Création de devis avec calculs automatiques:
  - Taxes du Québec (TPS 5%, TVQ 9.975%)
  - Frais de contingence (10-20%)
  - Comparaison prix du marché
  - Termes de paiement (30% dépôt, 30% étape, 40% final)
- [x] Factures CRUD avec:
  - Numéros de facture auto-générés (CMG-YYYY-XXXX)
  - Suivi des paiements
- [x] Projets CRUD avec suivi de statut
- [x] Dashboard statistiques admin
- [x] Dashboard CEO avec métriques financières

### Phase 5: Génération PDF (COMPLETE) ✨ NEW
- [x] PDF pour devis/soumissions
- [x] PDF pour factures
- [x] Design professionnel avec branding CMGeorges
- [x] Téléchargement via API admin
- [x] Téléchargement via portail client

### Phase 6: Portail Client (COMPLETE) ✨ NEW
- [x] Accès sécurisé par token
- [x] Création d'accès via admin
- [x] Envoi automatique d'email avec lien d'accès
- [x] Consultation des devis
- [x] Consultation des factures
- [x] Consultation des projets
- [x] Téléchargement PDF depuis le portail
- [x] Page `/portail-client?token=XXX`

### Phase 7: Admin Frontend CRM (COMPLETE)
- [x] Page de connexion admin
- [x] Dashboard avec statistiques
- [x] Gestion des leads avec filtres
- [x] Vue détaillée des leads
- [x] Gestion des clients
- [x] Gestion des factures
- [x] Gestion des projets
- [x] Dashboard CEO/Revenus

### Phase 8: Intégrations (CONFIGURED)
- [x] Resend API configuré pour emails ✅ FONCTIONNEL
- [x] Google reCAPTCHA v2 intégré (code prêt, clé à configurer)
- [x] Google Analytics 4 configuré
- [x] Meta Pixel configuré

---

## Testing Status
- **Backend Tests:** 100% passés
- **Frontend Tests:** 100% pages fonctionnelles
- **Rapports de tests:** `/app/test_reports/`

---

## Configuration requise par le client

### reCAPTCHA
Le code reCAPTCHA est intégré mais désactivé car la clé fournie était invalide.
Pour activer:
1. Créer une clé reCAPTCHA v2 "Checkbox" sur https://www.google.com/recaptcha/admin
2. Ajouter la clé site dans `frontend/.env` → `REACT_APP_RECAPTCHA_SITE_KEY=...`
3. Ajouter la clé secrète dans `backend/.env` → `RECAPTCHA_SECRET_KEY=...`

### Emails Resend
Les emails sont fonctionnels mais limités en mode test:
- Les emails sont envoyés à l'adresse admin configurée
- Pour envoyer aux clients: vérifier un domaine sur resend.com/domains

---

## Upcoming Tasks (Backlog)

### P1 - Moyen terme
1. **Gestion du Blog Admin** - Interface complète pour créer/modifier des articles
2. **Export CSV** - Export des leads, clients, factures

### P2 - Plus tard
1. **Notifications SMS** - Intégration Twilio
2. **Calendrier** - Prise de rendez-vous en ligne
3. **Multi-langue** - Support EN/FR complet

### P3 - Futur
1. **CI/CD Pipeline** - GitHub Actions
2. **Rate limiting** - Protection API
3. **Backups automatiques** - MongoDB

---

## Technical Architecture

```
/app
├── backend/
│   ├── .env              # Variables d'environnement
│   ├── requirements.txt  # Dépendances Python
│   ├── server.py         # Application FastAPI
│   └── tests/            # Tests Pytest
└── frontend/
    ├── .env              # Variables React
    ├── package.json      # Dépendances Node
    ├── public/
    │   ├── robots.txt
    │   └── sitemap.xml
    └── src/
        ├── App.js        # Configuration Router
        ├── components/   # Composants UI
        ├── lib/          # Utilitaires et API client
        └── pages/        # Pages de l'application
            ├── admin/    # Pages CRM admin
            ├── BlogPage.jsx
            ├── BlogPostPage.jsx
            ├── ClientPortalPage.jsx
            └── ...
```

## Key API Endpoints

### Public
- `GET /api/v1/blog` - Liste des articles
- `GET /api/v1/blog/:slug` - Article par slug
- `POST /api/v1/leads` - Soumettre un lead
- `GET /api/v1/portal/data/:client_id` - Données portail client

### Admin
- `GET/POST/PATCH /api/v1/admin/blog` - Gestion blog
- `GET /api/v1/admin/quotes/:id/pdf` - PDF soumission
- `GET /api/v1/admin/invoices/:id/pdf` - PDF facture
- `POST /api/v1/admin/clients/:id/portal-access` - Créer accès portail

---

*Dernière mise à jour: 21 février 2026*

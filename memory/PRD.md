# CMGeorges - Product Requirements Document

## Project Overview
**Company:** CMGeorges  
**Location:** Montréal & Rive-Sud, Québec  
**Tech Stack:** React + FastAPI + MongoDB

## Live Preview
**URL:** https://business-hub-222.preview.emergentagent.com

## Test Credentials
- **Admin Email:** admin@cmgeorges.com
- **Admin Password:** admin123

---

## What's Been Implemented ✅

### Phase 1-6: (Complete - See Previous)
- Full-stack CRM application
- Public site with SEO pages
- Blog section
- PDF generation
- Client Portal
- Email integration

### Phase 7: Admin Theme Redesign (COMPLETE)
- [x] **Thème noir et or** - Design luxueux avec sidebar noire et accents dorés
- [x] **Loading animation** - Lion doré animé lors du chargement
- [x] **Page détail client** - Route `/admin/clients/:id` avec toutes les infos client
- [x] **Page détail facture** - Route `/admin/invoices/:id` avec PDF et historique paiements
- [x] **Page détail projet** - Route `/admin/projects/:id` avec progression
- [x] **Boutons PDF** - Download et Print pour soumissions/factures
- [x] **Bouton Envoyer** - Pour envoyer documents par email
- [x] **Image multiculturelle** - Section teamwork avec mains diverses

### Phase 8: CRM Expansion (COMPLETE - Feb 21) ✨ NEW
- [x] **Codes Promo** - Page admin `/admin/discount-codes` avec CRUD complet
  - Création de codes avec type (pourcentage/fixe), valeur, dates validité
  - Activation/désactivation des codes
  - Gestion des limites d'utilisation
- [x] **Grille Tarifaire** - Page admin `/admin/pricing` avec CRUD complet
  - Onglets par type de service (Déco Touché, Mobilier, Tech)
  - Prix de base, fourchette de prix, unités
  - Catégories configurables
- [x] **Politiques** - Page admin `/admin/policies` avec CRUD complet
  - Types: CGV, Confidentialité, Garantie, Annulation, Paiement
  - Éditeur de contenu avec versionning
  - Vue prévisualisation
- [x] **reCAPTCHA v2** - Réactivé sur le formulaire de soumission
  - Clé site: 6LfOYW8sAAAAAAPWutXG5N24yxCHQkQ-C2UOWLQ21
  - Note: Nécessite configuration domaine dans Google reCAPTCHA Admin

### Bug Fixes (Feb 21)
- [x] Fix: Bouton "Voir" dans les tableaux admin → Pages blanches
- [x] Fix: Routes manquantes pour `/admin/clients/:id`, `/admin/invoices/:id`, `/admin/projects/:id`

---

## Testing Status
- **Backend:** 100% (19/19 tests passed) - CRM expansion
- **Frontend:** 100% - All 3 new pages functional
- **Theme:** Black and gold applied consistently
- **PDF:** Download and print working
- **Test Report:** `/app/test_reports/iteration_4.json`

---

## Files Created/Updated This Session

### New Files (Phase 8)
- `/frontend/src/pages/admin/AdminDiscountCodes.jsx` - Gestion codes promo
- `/frontend/src/pages/admin/AdminPricing.jsx` - Grille tarifaire
- `/frontend/src/pages/admin/AdminPolicies.jsx` - Politiques

### Updated Files (Phase 8)
- `/frontend/src/components/layout/AdminLayout.jsx` - 3 nouveaux liens navigation
- `/frontend/src/App.js` - 3 nouvelles routes admin
- `/frontend/.env` - Clé reCAPTCHA ajoutée
- `/backend/.env` - Clé secrète reCAPTCHA mise à jour

---

## Upcoming Tasks (Backlog)

### P0 - Immediate
1. **Simplifier formulaires soumission** - Retirer logique "prix du marché"
2. **Fonctionnalité Imprimer/Envoyer** - Boutons pour documents

### P1 - High Priority
1. **CRUD complet** - Create/Update/Delete pour Clients, Factures, Projets
2. **Portail Client** - Implémentation complète
3. **Gestion Blog Admin** - Interface CRUD pour articles
4. **Envoi de documents par email** - Via Resend

### P2 - Medium Priority
1. **Export CSV** - Leads, clients, factures
2. **Dashboard CEO** - Graphiques plus détaillés
3. **Filtres avancés** - Dates, montants, etc.

### P3 - Future
1. **Notifications SMS** - Twilio
2. **Calendrier rendez-vous**
3. **Multi-langue EN/FR**
4. **CI/CD Pipeline**
5. **Sécurité DevOps** - Rate limiting, headers

---

## Technical Notes

### New Admin Routes
```
/admin/discount-codes → AdminDiscountCodes
/admin/pricing → AdminPricing
/admin/policies → AdminPolicies
```

### New Backend Endpoints
```
GET/POST /api/v1/admin/discount-codes
PATCH/DELETE /api/v1/admin/discount-codes/{id}
GET/POST /api/v1/admin/pricing
PATCH/DELETE /api/v1/admin/pricing/{id}
GET/POST /api/v1/admin/policies
PATCH/DELETE /api/v1/admin/policies/{id}
```

### Color Palette (Admin Theme)
- Background: `#000000` (black)
- Cards: `#0f0f0f` / `#1f1f1f` (dark gray)
- Primary Accent: `#d4af37` (gold)
- Gold variations: 
  - Light: `#f5d742`
  - Medium: `#e8c547`  
  - Dark: `#a67c00`
- Text: White / Gray-400

---

*Last Updated: February 21, 2026*

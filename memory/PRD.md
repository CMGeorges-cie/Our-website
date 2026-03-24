# CMGeorges / ServiceFlow — PRD

**Mise à jour:** 24 Mars 2026  
**Stack:** React + FastAPI + MongoDB

---

## Vision

**CMGeorges** = Entreprise de services (Montréal)  
**ServiceFlow** = Plateforme SaaS CRM multi-tenant

---

## Implémenté

### CRM Admin ✅
- Leads, Clients, Projets (CRUD)
- Notifications système
- Thème dark/light premium noir/or

### Projets V2 ✅
- Tâches avec progression
- Messagerie interne
- Timeline des événements

### Multi-Tenant & Mobile ✅
- API v2 mobile-ready
- TenantContext isolation
- Structure React Native complète

### Catalogue de Services ✅
- CRUD services avec catégories
- Prix fixe/horaire/unité/devis
- 12 services CMGeorges

### Facturation Style Joist/Invoice Fly ✅ [NOUVEAU]
- **Page liste factures** avec stats (total, en attente, payé, en retard)
- **Modal création** professionnelle:
  - Sélection client + date échéance
  - Intégration catalogue de services (bouton Catalogue)
  - Lignes avec Description, Qté, Prix unit., Total
  - Remise (%, fixe)
  - Modalités de paiement (immédiat, net15, net30, acompte, personnalisé)
  - Option acompte avec pourcentage
  - Calcul automatique TPS (5%) + TVQ (9.975%)
  - Notes/Conditions
- **Page détail** professionnelle:
  - En-tête avec logo et info entreprise
  - Info client avec avatar
  - Tableau des lignes
  - Calcul complet (sous-total, remise, taxes, total)
  - Badge PAYÉE si soldé
  - Historique des paiements
- **Actions**: PDF, Imprimer, Envoyer par email, Enregistrer paiement
- **Conversion devis → facture**

---

## API Endpoints

### V1 (Web)
- `/api/v1/auth/*`, `/api/v1/admin/*`, `/api/v1/client/*`

### V2 (Mobile)
- `/api/v2/auth/*`, `/api/v2/mobile/*`, `/api/v2/projects/*`, `/api/v2/catalog/*`

---

## Identifiants

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@cmgeorges.com | strongpassword123 |

---

## Backlog

### P1 - Prochaine
- [ ] App React Native sur stores
- [ ] Push notifications
- [ ] Mode offline

### P2
- [ ] Intégrer catalogue dans création devis
- [ ] Système Produits + Inventaire
- [ ] Contrats de maintenance

### P3
- [ ] Dashboard Analytics
- [ ] Migration PostgreSQL
- [ ] Marketplace

---

## Structure

```
/app
├── backend/
│   ├── server.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── projects.py
│   │   ├── mobile.py
│   │   └── catalog.py
│   ├── services/database.py
│   └── middleware/tenant.py
├── frontend/
│   └── src/pages/admin/
│       ├── AdminInvoices.jsx    [REFAIT - Style Joist]
│       ├── AdminInvoiceDetail.jsx [REFAIT - Pro layout]
│       └── AdminCatalog.jsx
└── mobile/
    └── src/screens/...
```

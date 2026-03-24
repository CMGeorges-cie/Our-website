# CMGeorges / ServiceFlow — PRD

**Mise à jour:** 24 Mars 2026  
**Stack:** React + FastAPI + MongoDB

---

## Ce qui est implémenté

### CRM Admin
- Leads, Clients, Projets (CRUD complet)
- Notifications système
- Thème dark/light premium noir/or

### Projets V2
- Tâches avec progression
- Messagerie interne
- Timeline des événements

### Multi-Tenant & Mobile
- API v2 mobile-ready
- TenantContext isolation (partielle)
- Structure React Native complète

### Catalogue de Services
- CRUD services avec catégories
- 12 services CMGeorges

### Facturation Style Joist
- Page liste avec stats
- Modal création avec intégration catalogue
- Calcul TPS/TVQ automatique
- Remises et acomptes
- Page détail professionnelle

### Signature Électronique (In-App)
- Composant SignaturePad avec react-signature-canvas
- Dialog de signature complet (texte légal, info signataire)
- Backend endpoints pour factures et devis
- Affichage signature sauvegardée

### Lien de Signature Publique (DocuSign style)
- **Page publique** `/sign/:type/:token` avec aperçu document complet
- **Backend API** `GET/POST /api/public/sign/invoice/{token}` et `/api/public/sign/quote/{token}`
- **Envoi lien par email** `POST /api/v1/admin/invoices/{id}/send-signature-link`
- **Token sécurisé** SHA256 avec expiration 72h
- **Routage corrigé** sous `/api` prefix pour Kubernetes

### Emails & Notifications
- Templates email professionnels ServiceFlow
- Liens email corrigés avec FRONTEND_URL
- Notifications pour leads, factures, paiements, projets

---

## Architecture Fichiers

```
/app
├── backend/
│   ├── .env                    # FRONTEND_URL ajouté
│   ├── server.py               # Monolithique (à refactorer)
│   ├── routers/
│   │   ├── auth.py
│   │   ├── catalog.py
│   │   ├── mobile.py
│   │   ├── projects.py
│   │   └── public_signature.py # Prefix /api/public/sign
│   ├── middleware/
│   │   └── tenant.py
│   ├── services/
│   │   └── database.py
│   └── tests/
│       └── test_public_signature.py
├── frontend/
│   └── src/
│       ├── components/ui/
│       │   └── signature-pad.jsx
│       ├── lib/api.js
│       └── pages/
│           ├── PublicSignaturePage.jsx  # Appelle /api/public/sign/...
│           └── admin/
│               ├── AdminInvoices.jsx
│               └── AdminInvoiceDetail.jsx
└── mobile/
    └── src/...
```

---

## API Clés

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/public/sign/invoice/{token}` | Non | Récupérer facture pour signature publique |
| `POST /api/public/sign/invoice/{token}` | Non | Soumettre signature publique |
| `GET /api/public/sign/quote/{token}` | Non | Récupérer devis pour signature publique |
| `POST /api/public/sign/quote/{token}` | Non | Soumettre signature publique devis |
| `POST /api/v1/admin/invoices/{id}/send-signature-link` | Oui | Envoyer lien signature par email |
| `POST /api/v1/admin/quotes/{id}/send-signature-link` | Oui | Envoyer lien signature devis |
| `POST /api/v1/admin/invoices/{id}/signature` | Oui | Ajouter signature in-app |
| `DELETE /api/v1/admin/invoices/{id}/signature` | Oui | Supprimer signature |

---

## Bugs Corrigés (24 Mars 2026)

- **URLs email cassées** : `http:///admin/invoices/...` → `https://serviceflow-preview.preview.emergentagent.com/admin/invoices/...`
- **Routage signature publique** : Endpoints déplacés sous `/api` pour compatibilité Kubernetes ingress
- **`.env` corrompu** : STRIPE_API_KEY et FRONTEND_URL concaténés sur même ligne

---

## Backlog

### P0 - Critique
- [ ] Isolation multi-tenant complète (audit toutes les requêtes DB)
- [ ] Déployer première version utilisable

### P1 - Priorité
- [ ] Inclure signature dans PDF
- [ ] Système Produits + Installation + Inventaire
- [ ] Intégration Stripe complète (webhooks cycle de vie)

### P2
- [ ] Portail client complet avec RBAC
- [ ] App React Native sur stores
- [ ] Réactiver reCAPTCHA formulaire public
- [ ] Connecter "Imprimer et Envoyer" au backend email

### P3
- [ ] Dashboard Analytics
- [ ] Migration PostgreSQL
- [ ] Simplifier formulaire devis (retirer "market price")

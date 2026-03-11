# CMGeorges - Product Requirements Document

**Dernière mise à jour:** Mars 2026  
**Stack:** React + FastAPI + MongoDB  
**Langue:** Français (répondre toujours en français)

---

## Description du Projet

Site web complet pour **CMGeorges** (Décoration & Rénovation à Montréal et Rive-Sud).  
Composé d'un site public et d'un panneau d'administration CRM complet.

---

## Architecture

```
/app
├── backend/
│   ├── server.py       # FastAPI app (monolithique, 2800+ lignes)
│   ├── models.py       # Modèles Pydantic supplémentaires
│   ├── features.py     # Features supplémentaires
│   └── .env            # MONGO_URL, DB_NAME, RESEND_API_KEY, etc.
└── frontend/
    ├── src/
    │   ├── App.js              # Routeur principal
    │   ├── components/
    │   │   ├── layout/AdminLayout.jsx  # Layout admin noir/or
    │   │   └── LoadingSpinner.jsx      # Composant chargement (non intégré)
    │   ├── lib/
    │   │   ├── api.js          # Toutes les requêtes API
    │   │   └── utils.js        # Utilitaires
    │   └── pages/
    │       ├── admin/          # Toutes les pages admin
    │       └── ...             # Pages publiques
    └── .env                    # REACT_APP_BACKEND_URL
```

---

## Ce Qui a Été Implémenté

### Site Public
- [x] Page d'accueil avec image multiculturelle
- [x] Formulaire de soumission (sans reCAPTCHA pour l'instant)
- [x] Pages SEO géo-ciblées
- [x] Blog public (liste + détail d'articles)
- [x] Pages légales (FAQ, Politique de confidentialité, CGU)
- [x] Google Analytics 4 + Meta Pixel (configurés)

### Backend CRM
- [x] Authentification JWT (users, admin/staff roles)
- [x] CRUD complet: Leads, Clients, Quotes, Invoices, Projects
- [x] CRUD: Blog, Discount Codes, Pricing Items, Policies
- [x] Génération PDF (quotes + invoices)
- [x] Envoi email par Resend (soumissions + envoi documents)
- [x] Logs d'audit
- [x] Rate limiting

### Admin Panel (thème noir & or)
- [x] Dashboard avec métriques
- [x] Gestion Leads (liste + détail + suppression)
- [x] Gestion Clients (liste + créer + modifier + supprimer + détail)
- [x] Gestion Factures (liste + créer + supprimer + télécharger PDF + envoyer email)
- [x] Gestion Projets (liste + créer + supprimer + détail)
- [x] Gestion Quotes/Soumissions (vue + télécharger PDF + envoyer email)
- [x] Revenus (analytics)
- [x] Blog Admin (créer + modifier + supprimer articles)
- [x] Codes Promo (CRUD complet)
- [x] Tarification (CRUD complet)
- [x] Politiques (CRUD complet)

---

## Identifiants de Test

- **Admin:** admin@cmgeorges.com / strongpassword123
- **Test:** test@cmgeorges.com / testpassword
- **Staff:** staff@cmgeorges.com / staffpassword123

---

## Intégrations 3rd Party

| Service | Statut | Notes |
|---------|--------|-------|
| Resend | ✅ Configuré | Envoi emails (soumissions + documents PDF) |
| Google reCAPTCHA | ⛔ Désactivé | Clé invalide (type incorrect) - attente nouvelle clé |
| Google Analytics 4 | ✅ Configuré | Basic setup |
| Meta Pixel | ✅ Configuré | Basic setup |
| fpdf/pyfpdf | ✅ Actif | Génération PDF quotes + invoices |

---

## Backlog Priorisé

### P0 (Critique - Bloquant)
- [ ] reCAPTCHA: Demander nouvelle clé "v2 Checkbox" à l'utilisateur

### P1 (Important)
- [ ] Intégrer LoadingSpinner dans le routing de l'app
- [ ] Tester l'envoi d'email réel via Resend avec une vraie adresse
- [ ] Portail client (stubs backend existent, frontend à créer)

### P2 (Améliorations)
- [ ] Analytics personnalisés GA4 + Meta Pixel (événements conversions)
- [ ] Migration PostgreSQL (à confirmer avec l'utilisateur)
- [ ] DevSecOps: headers sécurité avancés, CI/CD
- [ ] Refactoring backend: séparer server.py en routers/models/services
- [ ] Page admin Leads: ajouter bouton "Créer lead" manuellement

### P3 (Futur)
- [ ] Notifications push/email pour nouveaux leads
- [ ] Tableau de bord amélioré avec graphiques interactifs
- [ ] Import/Export CSV pour clients et factures
- [ ] Système de rappels pour factures en retard

---

## Problèmes Connus

1. **reCAPTCHA désactivé** - Clé invalide (type "v2 invisible" au lieu de "v2 checkbox")
2. **Resend non testé** - API configurée mais envoi réel non validé
3. **server.py monolithique** - Devrait être découpé en modules

---

## Notes Techniques

- `formatCurrency`, `formatDateShort`, `getStatusLabel`, etc. sont dans `lib/utils.js`
- L'authentification utilise JWT via `Authorization: Bearer <token>`
- Le thème admin utilise Tailwind custom colors: `gold-500` = #d4af37, `gold-600` = #b8962e
- MongoDB `_id` exclu de toutes les réponses API (projection `{"_id": 0}`)
- Bcrypt utilisé pour les mots de passe (sel valide requis)

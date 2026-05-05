# Déco Touché — PRD

**Mise à jour:** 5 Mai 2026  
**Stack:** React + FastAPI + MongoDB  
**Marque:** Déco Touché (anciennement CMGeorges)

---

## Fonctionnalités complètes et testées

### Rebranding (5 Mai 2026)
- CMGeorges → Déco Touché (logo, nav, footer, admin, emails, PDFs)
- ServiceFlow/Tech supprimés du site principal
- Navigation: Accueil, Services, Portfolio, Blog, FAQ, Contact
- Footer: Professionnel & Assuré, info@decotouche.ca, TPS/TVQ

### Pages de services
- `/services/peinture` — Peinture intérieure & extérieure (tarifs, étapes, FAQ)
- `/services/renovation` — Rénovation légère (planchers, moulures, gyproc)
- `/services/entretien` — Entretien général (réparations, nettoyage)
- `/services/mobilier` — Installation mobilier (IKEA, montage)

### CRM Admin
- Leads, Clients, Projets (CRUD complet)
- Dashboard CEO avec stats

### Facturation
- Création, PDF, envoi email
- Calcul TPS/TVQ automatique
- Signature électronique (in-app + DocuSign public)
- Lien de paiement pour dépôt (Stripe)

### Dépôt obligatoire (Stripe)
- Page `/paiement?invoice={id}` publique
- Options 30% ou 50%
- Redirection Stripe Checkout
- Webhook auto-enregistrement du paiement
- Pages succès/annulation

### Portfolio
- 5 vrais projets (photos HEIC → JPEG converties)
- Filtres: Tous, Peinture & Rénovation, Mobilier
- Admin CRUD avec photos avant/après

### Réseaux Sociaux
- Admin: Gérer posts Instagram/TikTok
- Affichage sur page d'accueil avec liens

### Portail Client
- Connexion/Inscription
- Dashboard (projets, factures, stats)
- Mon profil (modification nom, email, téléphone, adresse)
- Paiement factures en ligne

### Tests
- 34 tests pytest (`/app/backend/tests/test_build.py`)
- Commande: `cd /app/backend && pytest tests/test_build.py -v`

---

## Connexions
- **Admin:** admin@cmgeorges.com / strongpassword123
- **URL:** /admin/login

---

## Backlog

### P1
- [ ] Stripe clé live (paiements réels)
- [ ] Formulaire soumission amélioré (upload photos)
- [ ] Signature incluse dans PDF exporté

### P2
- [ ] Site séparé CMGeorges Tech
- [ ] App React Native mobile
- [ ] Dashboard Analytics avancé
- [ ] Isolation multi-tenant
- [ ] Migration PostgreSQL

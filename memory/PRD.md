# Déco Touché — PRD

**Mise à jour:** 5 Mai 2026  
**Stack:** React + FastAPI + MongoDB  
**Marque:** Déco Touché (anciennement CMGeorges)

---

## Fonctionnalités complètes et testées

### Rebranding
- CMGeorges → Déco Touché (logo, nav, footer, admin, emails, PDFs)
- Navigation: Accueil, Services, Portfolio, Blog, FAQ, Contact
- Footer: Professionnel & Assuré, info@decotouche.ca, TPS/TVQ

### Pages de services
- `/services/peinture` — Peinture intérieure & extérieure
- `/services/renovation` — Rénovation légère
- `/services/entretien` — Entretien général
- `/services/mobilier` — Installation mobilier

### CRM Admin
- Leads, Clients, Projets (CRUD complet)
- Dashboard CEO avec stats et revenus

### Facturation
- Création, PDF, envoi email
- Calcul TPS/TVQ automatique
- Signature électronique (in-app + DocuSign public)
- Lien de paiement pour dépôt (Stripe)

### Dépôt obligatoire (Stripe)
- Page `/paiement?invoice={id}` publique
- Options 30% ou 50%, Stripe Checkout
- Webhook auto-enregistrement

### Portfolio
- 5 vrais projets (photos HEIC → JPEG)
- Filtres: Peinture & Rénovation, Mobilier

### Réseaux Sociaux
- Admin: Gérer posts Instagram/TikTok
- Section sur page d'accueil avec liens

### Formulaire soumission avec upload photos
- Upload jusqu'à 5 photos (JPEG, PNG, HEIC, WebP)
- Conversion HEIC → JPEG auto
- Photos attachées au lead
- Max 10MB par fichier

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
- [ ] Signature incluse dans PDF exporté

### P2
- [ ] Site séparé CMGeorges Tech
- [ ] App React Native mobile
- [ ] Dashboard Analytics avancé
- [ ] Isolation multi-tenant
- [ ] Migration PostgreSQL

# Déco Touché — PRD

**Mise à jour:** 13 Juin 2026
**Stack:** React + FastAPI + MongoDB
**Marque:** Déco Touché (anciennement CMGeorges)

---

## Fonctionnalités complètes et testées

### Rebranding
- CMGeorges → Déco Touché (logo, nav, footer, admin, emails, PDFs)
- Config centralisée: `/app/frontend/src/config/brand.js` & `/app/backend/config/brand.py`

### Pages de services (tarifs « À partir de X$ »)
- `/services/peinture` — Peinture intérieure & extérieure
- `/services/renovation` — Rénovation légère (plancher flottant **3.50$/pi²**) + **Promo TV murale été 2026**
- `/services/entretien` — Visite 140$, Forfait Basique 200$, Forfait Premium 450$
- `/services/mobilier` — Assemblage IKEA/PAX/etc., tarifs préfixés « À partir de »
- `/services/demolition` — Démolition légère

### CRM Admin
- Leads, Clients, Projets, Devis, Factures (CRUD complet)
- Dashboard CEO avec stats et revenus
- **NEW (juin 2026)** Assistant IA Claude Sonnet 4.5 pour brouillons de devis et factures

### Authentification sécurisée (admin + client)
- JWT + bcrypt
- **2FA** (TOTP via QR code ou code par email)
- **Mot de passe oublié** — flow public rate-limité (3 req / 15 min) pour admins ET clients
  - Lien email valide 60 min, à usage unique
  - Reset retourne le rôle pour rediriger correctement
- **Changement de mot de passe / email** dans `/admin/profile`
- Mot de passe temporaire expirable 48h pour admin nouvellement provisionné

### Facturation
- Création, PDF, envoi email
- Calcul TPS/TVQ automatique
- Signature électronique (in-app + DocuSign public)
- Lien de paiement Stripe LIVE (dépôt 30-50%)

### Portfolio
- 5 vrais projets avec carrousel multi-photos
- Tag automatique Avant/Après sur les 2 dernières photos
- Admin: gestion ordre / ajout / suppression

### Portail Client
- Connexion/Inscription
- Dashboard (projets, factures, stats)
- Mon profil + paiement factures en ligne
- **Mot de passe oublié** depuis `/client/login` (lien `?from=client`)

### Tests
- 34 tests pytest backend (`/app/backend/tests/test_build.py`)
- 10 nouveaux tests (`test_auth_reset_and_ai_drafts.py`) couvrant reset + IA

---

## Intégrations
- **Stripe** (LIVE) — paiements & dépôts
- **Resend** — emails (reset, 2FA, notifications)
- **Claude Sonnet 4.5** via Emergent LLM Key — brouillons devis/factures
- reCAPTCHA (à réactiver sur /leads)

---

## Connexions
- **Admin:** admin@cmgeorges.com / strongpassword123
- **URL:** /admin/login (admin) · /client/login (client)
- **Reset:** /mot-de-passe-oublie (admin) · /mot-de-passe-oublie?from=client (client)

---

## Backlog

### P0
- [ ] Object Storage (S3/R2) pour photos uploadées (actuellement éphémère sur /uploads)

### P1
- [ ] Réactiver vérification reCAPTCHA backend sur /api/leads
- [ ] Isolation multi-tenant complète (`tenantId` scoping)
- [ ] Print & Send des PDF facture/devis

### P2
- [ ] Site séparé CMGeorges Tech
- [ ] App React Native mobile
- [ ] Dashboard Analytics avancé
- [ ] Migration PostgreSQL
- [ ] Refactor server.py (~5000 lignes → /routers)
- [ ] Suppression du warning React hydration `<span data-ve-dynamic>` dans `<tbody>` sur MobilierPage

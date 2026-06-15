# Déco Touché — PRD

**Mise à jour:** 15 Juin 2026
**Stack:** React + FastAPI + MongoDB
**Marque:** Déco Touché (anciennement CMGeorges)

---

## Fonctionnalités complètes et testées

### Rebranding
- CMGeorges → Déco Touché (logo, nav, footer, admin, emails, PDFs)
- Config centralisée: `/app/frontend/src/config/brand.js` & `/app/backend/config/brand.py`

### Pages de services (tarifs « À partir de X$ »)
- `/services/peinture`, `/services/renovation` (+**Promo TV murale été 2026**), `/services/entretien` (Visite 140$, Forfait Basique 200$, Premium 450$), `/services/mobilier`, `/services/demolition`

### CRM Admin
- Leads, Clients, Projets, Devis, Factures (CRUD complet)
- Dashboard CEO avec stats et revenus
- **Assistant IA Claude Sonnet 4.5** pour brouillons de devis et factures (boutons "Générer avec IA")

### Authentification sécurisée
- **httpOnly cookies** (`dt_access_token`, `dt_refresh_token`, HttpOnly + Secure + SameSite=Lax) — protection XSS
- Backward compat avec Authorization: Bearer header
- JWT + bcrypt
- **2FA** (TOTP via QR ou code par email)
- **Mot de passe oublié** — flow rate-limité 3 req / 15 min pour admins ET clients
- **Changement mot de passe/email** dans `/admin/profile`
- Mot de passe temporaire expirable 48h pour admin nouvellement provisionné

### Facturation
- Création, PDF, envoi email, signature électronique
- Stripe LIVE (dépôt 30-50%, signatures DocuSign style)

### Portfolio (7 projets)
1. Porte intérieure — Réparation moulures
2. Peinture mur jaune → blanc
3. Réparation gypse + peinture
4. Remplacement robinet de cuisine
5. Rénovation chambre - lit & plancher
6. **NEW** Changement de comptoir de cuisine (5 photos carrousel)
7. **NEW** Installation TV murale (3 photos carrousel)

### Portail Client
- Connexion/Inscription/Mot de passe oublié
- Dashboard (projets, factures, profil)
- Paiement factures en ligne

### Tests automatisés
- 34 tests `tests/test_build.py`
- 10 tests `tests/test_auth_reset_and_ai_drafts.py` (reset + IA)
- 6 tests `tests/test_cookie_auth.py` (cookies httpOnly)
- 30 tests `tests/test_router_refactor.py` (blog/policies/pricing/discounts extraits + reCAPTCHA + CORS)
- Total : 80 tests backend passants

---

## Intégrations actives
- **Stripe LIVE** — paiements & dépôts
- **Resend** — emails transactionnels
- **Claude Sonnet 4.5** via Emergent LLM Key — brouillons IA
- **Cloudflare R2** — stockage photos persistantes
- **reCAPTCHA v2** — actif sur `/api/v1/leads` et `/api/v1/contact` (v2 checkbox + compat v3 score)

---

## Connexions
- **Admin:** admin@cmgeorges.com / strongpassword123
- **URL:** /admin/login (admin) · /client/login (client)
- **Reset:** /mot-de-passe-oublie (admin) · /mot-de-passe-oublie?from=client (client)

---

## Backlog

### P0
- [x] Object Storage Cloudflare R2 — DONE (14 Juin 2026)

### P1
- [ ] Isolation multi-tenant complète (`tenantId` scoping)
- [ ] Refactor `AdminInvoices.jsx` (935 lignes → composants séparés)
- [ ] Refactor `build_auth_router` (383 lignes) dans `auth_extensions.py`
- [ ] Continuer le découpage de `server.py` (~4600 lignes restantes) — leads/contact, clients, invoices, projects, AI, signatures
- [ ] Audit dépendances React hooks (50 warnings)
- [ ] Remplacer `key={index}` par stable ID (47 instances)
- [ ] Print & Send PDF facture/devis
- [ ] Mettre à jour les tests stale `test_cmgeorges_api.py` / `test_notifications.py` pour reCAPTCHA actif

### P2
- [ ] App React Native mobile
- [ ] Dashboard Analytics avancé
- [ ] Migration PostgreSQL
- [ ] Site séparé CMGeorges Tech
- [ ] Suppression warning React hydration `<span data-ve-dynamic>` dans `<tbody>` (MobilierPage)

---

## Historique des sécurisations majeures
- **15 Juin 2026**: Refactor `server.py` — extraction de 4 routers (`blog`, `policies`, `pricing`, `discounts`) → 520 lignes en moins. Suit le pattern `build_xxx_router(db, deps)`. Réactivation `reCAPTCHA` sur `/api/leads` + `/api/contact` (avec fix v2/v3 compatible). Fix CORS critique (allow_origins explicite + regex preview, compatible httpOnly cookies). 100% des 30 nouveaux tests passent.
- **13 Juin 2026**: httpOnly cookies (dt_access_token + dt_refresh_token), test passwords env vars, hook deps fix (ClientDashboard, AdminLeadDetail)
- **5 Juin 2026**: 2FA TOTP+Email, Forgot Password, Profile management
- **2 Juin 2026**: Portfolio multi-carousel, brand centralization, DOMPurify XSS protection

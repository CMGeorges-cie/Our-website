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
- 30 tests `tests/test_router_refactor.py` (blog/policies/pricing/discounts + reCAPTCHA + CORS)
- 40 tests `tests/test_iter16_refactor.py` (leads/contact/clients + auth_ext modulaire)
- 35 tests `tests/test_iter17_refactor.py` (quotes/invoices + PDF + 2FA hardening)
- Total : 155 tests backend passants

---


### Version mobile de gestion — PWA `/m` (Oct 2026)
- Interface téléphone dédiée `/m` (login 2FA `/m/login`), onglets bas : Accueil, Leads, Projets, Factures, Plus
- Modules : Dashboard (revenus du mois, stats, actions rapides), Leads (filtres, statut, notes, convertir client), Soumissions (création + brouillon IA Claude, envoi courriel, lien signature, PDF), Clients (CRUD en bottom sheet, solde, accès portail), Projets (CRUD, statut, tâches/progression, journal, rapport PDF), Factures (création + IA, statut, lien de paiement copier/texto/partager, enregistrer paiement, courriel, PDF, signature), Revenus (vue CEO), Notifications, Profil (mot de passe, 2FA TOTP/courriel)
- Terrain : Appeler / Texto / Courriel / GPS (Google Maps) en un clic ; photos de chantier caméra/galerie → Cloudflare R2
- Backend : `POST/DELETE /api/v1/admin/projects/{id}/photos[/{photo_id}]` (R2, HEIC→JPEG, événement journal)
- PWA : `/m-manifest.json` (scope `/m/`), `/m-sw.js` (fallback hors-ligne `/m-offline.html`), icônes `/m-icon-*.png`, bouton « Installer l'application »
- Code : `/app/frontend/src/mobile/` (MobileLayout, pages/, components/)
- Tests : iteration_20 (backend 9/9, frontend OK) + `tests/test_mobile_pwa_photos.py`

### Sécurité + Fiabilité + Contenu unifié (Oct 2026)
- SEC-001 corrigé : garde globale `staff_guard` (server.py) → /api/v1/admin/*, /api/v1/ai/*, /api/v2/* réservés admin/staff (client → 403)
- SEC-002 : route /seed supprimée (+ bouton démo AdminLogin) ; SEC-003 : IA limitée 40/h/utilisateur ; 2FA : 5 essais/15 min + challenge non réutilisable
- Paramètres du site (`/admin/site-settings`, collection `site_settings`) : modalités de paiement par défaut (30/30/40 + note <500 $) + règles par service (murs d'accent 50/50), avis clients + lien/note Google, confiance (Assuré, nb clients optionnel). Public : GET /api/v1/site-settings
- Prix publics 100 % catalogue (`/api/v2/catalog/public`) : Services, Peinture, Rénovation, Entretien, Mobilier, Démolition, Murs d'accent ; « Sur devis » si aucun prix. Nouvelles catégories catalogue : accent_walls, demolition, hvac (migration `migrations/data_fixes.py`)
- Données de test : détection (`services/test_data.py`), exclues des stats et pages publiques ; nettoyage avec aperçu dans Paramètres du site
- Tableau de bord : revenus = paiements réellement reçus par mois calendaire ; à encaisser inclut overdue
- Accueil : RBQ retiré, « 100+ » géré par admin, avis depuis paramètres ; Conditions/FAQ/Footer dynamiques
- Services Climatiseurs & TV/Tech ajoutés (+ options soumission hvac/maintenance/tech)
- PWA /m : erreur/session expirée explicites, projet terminé = 100 %, coordonnées provisoires désactivées, instructions d'installation inline
- Tests : iteration_21 (backend 24/24, frontend ~100 %)

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
- [ ] Valider la PWA /m sur un vrai iPhone/Android (installation + hors-ligne) après redéploiement
- [ ] Après redéploiement : lancer « Nettoyer les données de test » en production et saisir les vrais avis Google
- [ ] App native React Native (`/app/mobile`) publiée App Store / Play Store — après validation de la PWA `/m`
- [x] Object Storage Cloudflare R2 — DONE (14 Juin 2026)

### P1
- [ ] Pages dédiées Climatiseurs et TV/Tech (actuellement cartes → soumission)
- [ ] Agenda des chantiers + relances ; heures/matériaux/dépenses par projet (marge réelle, remplace coûts estimés 40 %)
- [ ] Synchro automatique des avis Google (API Places — clé requise)
- [ ] Isolation multi-tenant complète (`tenantId` scoping)
- [ ] Refactor `AdminInvoices.jsx` (935 lignes → composants séparés)
- [ ] Continuer le découpage de `server.py` (~3544 lignes restantes) — **PROJECTS router** (~600 l, 13+ endpoints avec photos/tasks/timeline/messages/reports)
- [ ] Configurer Resend domain `cmgeorges.ca` pour envoyer aux emails autres que `cmgeorges.cie@gmail.com` (https://resend.com/domains)
- [ ] Audit dépendances React hooks (50 warnings)
- [ ] Remplacer `key={index}` par stable ID (47 instances)
- [ ] Print & Send PDF facture/devis

### P2
- [ ] App React Native mobile
- [ ] Dashboard Analytics avancé
- [ ] Migration PostgreSQL
- [ ] Site séparé CMGeorges Tech
- [ ] Suppression warning React hydration `<span data-ve-dynamic>` dans `<tbody>` (MobilierPage)

---

## Historique des sécurisations majeures
- **17 Sept 2026**: Extraction Projects router (13 endpoints, 549 lignes) vers `routers/admin_projects.py`. Modèles Project* déplacés dans `models/__init__.py`. Endpoint PDF rapport corrigé (Brand.NAME/Brand.ADDRESS interpolés). `server.py` : 3552 → **3002 lignes (-42% depuis le début: 5137→3002)**.
- **8 Sept 2026**: Feature paiement — `routers/public_payment.py` + page publique `/facture/payer/:token` (Stripe CAD + Interac + Wise). Migration `portfolio_migration.py` idempotente. Deployment: **PASS ✅**.
- **15 Juin 2026 (round 3)**: Refactor `server.py` round 3 — extraction PDF vers `services/pdf.py` + routers `quotes.py`/`invoices.py`. Modèles Quote/Invoice/Signature déplacés. Hardening `/2fa/email/activate` (current_password requis). Bug PDF `{BRAND.EMAIL}` littéral corrigé. `server.py` : 4268 → 3544 lignes.
- **15 Juin 2026 (round 2)**: Extraction leads/contact/clients + modèles partagés dans `models/`. Refactor `auth_extensions.py` (556 l) → 4 sous-modules `routers/auth_ext/`.
- **15 Juin 2026 (round 1)**: Extraction blog/policies/pricing/discounts. Réactivation reCAPTCHA + Fix CORS critique.
- **13 Juin 2026**: httpOnly cookies + hook deps fix
- **5 Juin 2026**: 2FA TOTP+Email, Forgot Password, Profile management

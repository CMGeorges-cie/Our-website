# Déco Touché — PRD

**Mise à jour:** 5 Mai 2026  
**Stack:** React + FastAPI + MongoDB  
**Marque:** Déco Touché (anciennement CMGeorges)

---

## Rebranding accompli (5 Mai 2026)

### CMGeorges → Déco Touché
- Logo, navigation, footer, pages admin — tout rebrandé
- Services Tech supprimés — exclusivement peinture/rénovation/entretien/mobilier
- Navigation: Accueil, Services, Portfolio, Blog, FAQ, Contact
- Footer: Déco Touché + licence RBQ + TPS/TVQ
- Email: info@decotouche.ca

### Nouvelles pages de services
- `/services/peinture` — Peinture intérieure & extérieure
- `/services/renovation` — Rénovation légère
- `/services/entretien` — Entretien général
- `/services/mobilier` — Installation de mobilier

### Fonctionnalités complètes
- CRM Admin (Leads, Clients, Projets)
- Facturation Joist-style (PDF, signatures, calcul TPS/TVQ)
- Signature électronique (in-app + DocuSign public)
- Catalogue de services (12 items)
- Portfolio admin (CRUD avec photos avant/après)
- Réseaux Sociaux (liens TikTok/Instagram sur le site)
- Suite de tests: 30 tests pytest

### Connexions Admin
- **Email:** admin@cmgeorges.com
- **Mot de passe:** strongpassword123

---

## Backlog

### P0 — Prochain
- [ ] Portail client (connexion, historique factures, modification infos)
- [ ] Dépôt obligatoire 30-50% (paiement en ligne)
- [ ] Formulaire soumission amélioré (upload photos)

### P1
- [ ] Stripe live (paiements réels)
- [ ] Webhooks Stripe cycle de vie
- [ ] Signature dans PDF exporté

### P2
- [ ] Site séparé CMGeorges Tech
- [ ] App React Native mobile
- [ ] Dashboard Analytics avancé
- [ ] Isolation multi-tenant complète
- [ ] Migration PostgreSQL

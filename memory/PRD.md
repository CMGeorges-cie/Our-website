# CMGeorges / ServiceFlow — PRD

**Mise à jour:** 24 Mars 2026  
**Stack:** React + FastAPI + MongoDB

---

## Ce qui est implémenté et fonctionnel

### CRM Admin
- Leads CRUD (liste, détail, conversion en client)
- Clients CRUD (liste, détail, modification)
- Projets CRUD avec tâches, timeline, messagerie
- Notifications système (in-app + email)
- Thème dark/light premium noir/or

### Facturation Style Joist
- Création factures avec calcul TPS/TVQ automatique
- Liste factures avec stats
- Détail facture professionnelle
- Génération PDF
- Paiements (enregistrement, suivi)
- Remises et acomptes

### Signature Électronique
- Signature in-app (admin capture signature client)
- Lien signature publique (DocuSign style)
- Email avec lien sécurisé (token 72h)
- Page publique `/sign/:type/:token`

### Catalogue de Services
- CRUD 12 services prédéfinis
- Intégration avec facturation

### Portfolio (NOUVEAU)
- Admin: Ajouter/modifier/supprimer projets réalisés
- Photos avant/après
- Catégories par service
- Page publique `/portfolio`

### Réseaux Sociaux (NOUVEAU)
- Admin: Gérer les posts Instagram/TikTok/Facebook/YouTube
- Affichage sur la page d'accueil
- Liens vers les posts originaux sur les plateformes
- Les visiteurs cliquent → redirigés vers la vidéo/post

### Dashboard & Revenus
- Statistiques leads, clients, factures
- Dashboard CEO avec revenus mensuels

### Suite de Tests (NOUVEAU)
- 30 tests pytest (`/app/backend/tests/test_build.py`)
- Couvre: Auth, Endpoints publics, Leads, Clients, Factures, Projets, Portfolio, Réseaux Sociaux, Catalogue, Signature publique, Dashboard, Notifications
- Commande: `cd /app/backend && pytest tests/test_build.py -v`

---

## Connexions Admin
- **Email:** admin@cmgeorges.com
- **Mot de passe:** strongpassword123
- **URL:** /admin/login

---

## Backlog

### P0 - Prochaine
- [ ] Isolation multi-tenant complète
- [ ] Stripe clé live (paiements réels)
- [ ] Déploiement production

### P1
- [ ] Inclure signature dans PDF
- [ ] Portail client complet (connexion, historique, modification infos)
- [ ] Webhooks Stripe (cycle de vie abonnements)
- [ ] Système Produits + Installation + Inventaire

### P2
- [ ] App React Native sur stores
- [ ] Réactiver reCAPTCHA
- [ ] Dashboard Analytics avancé

### P3
- [ ] Migration PostgreSQL

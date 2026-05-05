# Guide de déploiement — CMGeorges

> Stack : **React (frontend)** + **FastAPI (backend)** + **MongoDB Atlas**
> Stratégie de branches : `dev` → `staging` → `main` (prod)
> Domaine : `cmgeorges.com` (déjà acheté)

---

## 0. Prérequis communs (à faire UNE SEULE fois)

### 0.1 MongoDB Atlas (base de données prod)

1. Créer un compte sur https://cloud.mongodb.com
2. Créer un **Projet** `CMGeorges`
3. Créer **3 clusters gratuits (M0)** ou **1 cluster M10** avec 3 bases :
   - `cmgeorges_dev`
   - `cmgeorges_staging`
   - `cmgeorges_prod`
4. Dans **Database Access** → créer un utilisateur `cmg_app` avec mot de passe fort
5. Dans **Network Access** → ajouter `0.0.0.0/0` (ou les IPs de Render/Vercel/Fly)
6. Récupérer la chaîne de connexion :
   ```
   mongodb+srv://cmg_app:<password>@cluster0.xxxxx.mongodb.net/cmgeorges_prod?retryWrites=true&w=majority
   ```

### 0.2 Variables d'environnement (à préparer pour chaque env)

**Backend (`backend/.env`)**
```bash
MONGO_URL="mongodb+srv://cmg_app:PASSWORD@cluster0.xxx.mongodb.net/cmgeorges_prod"
DB_NAME="cmgeorges_prod"          # ou cmgeorges_staging / cmgeorges_dev
CORS_ORIGINS="https://cmgeorges.com,https://www.cmgeorges.com"
JWT_SECRET="<générer avec: openssl rand -hex 32>"
RESEND_API_KEY="re_KBTDVG8r_KobtQSYhESgoBWE1zpSrJz6Z"
SENDER_EMAIL="no-reply@cmgeorges.com"
ADMIN_EMAIL="cmgeorges.cie@gmail.com"
RECAPTCHA_SECRET_KEY="6LfOYW8sAAAAAHUqewgwXSIENj0RBZM2scYeZ6YT"
```

**Frontend (`frontend/.env.production`)**
```bash
REACT_APP_BACKEND_URL=https://api.cmgeorges.com
REACT_APP_RECAPTCHA_SITE_KEY=6LfOYW8sAAAAAPWutXG5N24yxCHQkQ-C2UOWLQ21
REACT_APP_GA4_ID=G-5WKR5GDYPS
REACT_APP_META_PIXEL_ID=2935015520061384
```

### 0.3 Structure de branches Git recommandée

```
main       → PROD  (cmgeorges.com + api.cmgeorges.com)
staging    → STAGING (staging.cmgeorges.com + api-staging.cmgeorges.com)
dev        → DEV (dev.cmgeorges.com + api-dev.cmgeorges.com)
saas       → branche fonctionnalité isolée (NE PAS déployer sur prod)
feature/*  → PRs vers dev
```

> ⚠️ **Règle d'or** : jamais de merge direct dans `main`. Toujours passer par `dev → staging → main` via Pull Request.

---

## OPTION 1 — Emergent Deploy (le plus simple, recommandé pour démarrer)

### Avantages
- Déploiement en 1 clic depuis le chat
- Tout est déjà pré-configuré (MongoDB, supervisor, ingress, SSL)
- Parfait pour tester rapidement

### Étapes
1. Dans le chat Emergent, cliquer sur **"Deploy"** (bouton en haut à droite)
2. Choisir le nom du sous-domaine (ex: `cmgeorges-prod`)
3. Les variables `.env` actuelles sont utilisées telles quelles
4. Pour connecter votre domaine `cmgeorges.com` :
   - Aller dans les DNS de votre registrar
   - Ajouter un enregistrement **CNAME** : `@` → `cmgeorges-prod.emergent.host`
   - Ajouter un enregistrement **CNAME** : `www` → `cmgeorges-prod.emergent.host`

### Multi-environnements sur Emergent
- Créer **3 jobs séparés** dans Emergent : un pour `dev`, un pour `staging`, un pour `main`
- Chaque job pointe sur sa branche Git respective
- Chaque job a ses propres `.env` distincts

### Limite
- Pas de CI/CD GitHub Actions natif (déploiement manuel depuis le chat)

---

## OPTION 2 — Vercel (Frontend) + Render (Backend) + MongoDB Atlas ⭐ RECOMMANDÉ PROD

C'est le meilleur compromis **coût / performance / simplicité**.

### 2.1 Frontend sur Vercel

1. Créer un compte https://vercel.com et connecter votre compte GitHub
2. **Import Project** → sélectionner le repo `cmgeorges`
3. Configuration :
   - **Framework Preset** : `Create React App`
   - **Root Directory** : `frontend`
   - **Build Command** : `yarn build`
   - **Output Directory** : `build`
4. Dans **Environment Variables**, ajouter pour chaque environnement :

   | Variable | Production (main) | Preview (dev/staging) |
   |----------|-------------------|----------------------|
   | `REACT_APP_BACKEND_URL` | `https://api.cmgeorges.com` | `https://api-staging.cmgeorges.com` |
   | `REACT_APP_RECAPTCHA_SITE_KEY` | `6LfOYW8s...` | idem |
   | `REACT_APP_GA4_ID` | `G-5WKR5GDYPS` | vide |
   | `REACT_APP_META_PIXEL_ID` | `2935015520061384` | vide |

5. **Git Integration** : Vercel déploie automatiquement
   - `main` → https://cmgeorges.com
   - `staging` → https://staging.cmgeorges.com (via Preview Deployments)
   - `dev` → https://dev.cmgeorges.com

6. **Domaine** : dans Vercel → **Domains** → ajouter `cmgeorges.com` et `www.cmgeorges.com`
   - Vercel donne les enregistrements DNS à configurer chez votre registrar
   - SSL automatique (Let's Encrypt)

### 2.2 Backend sur Render

1. Créer un compte https://render.com
2. **New → Web Service** → connecter votre repo GitHub
3. Configuration :
   - **Root Directory** : `backend`
   - **Environment** : `Python 3`
   - **Build Command** : `pip install -r requirements.txt`
   - **Start Command** : `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Plan** : Starter (7$/mois) ou Free (dort après 15 min d'inactivité)
4. **Environment Variables** : copier toutes les variables de `backend/.env` (voir section 0.2)
5. Répéter pour **3 services distincts** :
   - `cmgeorges-api-prod` (branche `main`) → https://api.cmgeorges.com
   - `cmgeorges-api-staging` (branche `staging`) → https://api-staging.cmgeorges.com
   - `cmgeorges-api-dev` (branche `dev`) → https://api-dev.cmgeorges.com
6. **Custom domain** : dans chaque service → **Settings → Custom Domain** → ajouter `api.cmgeorges.com`

### 2.3 Coût estimé (prod uniquement)
- Vercel Hobby : **gratuit**
- Render Starter : **7 $/mois**
- MongoDB Atlas M0 : **gratuit** (jusqu'à 512 Mo)
- **Total : ~7 $/mois**

---

## OPTION 3 — Docker + VPS (OVH / Hetzner / DigitalOcean)

### Avantages
- Contrôle total
- Coût fixe prévisible
- Possibilité d'héberger plusieurs projets sur le même VPS

### Étapes

#### 3.1 Louer un VPS
- OVH VPS Value (3,50 €/mois) OU Hetzner CX22 (4 €/mois)
- Ubuntu 22.04, 2 Go RAM minimum

#### 3.2 Installation initiale
```bash
ssh root@votre-ip-vps
apt update && apt upgrade -y
apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx git
systemctl enable docker
```

#### 3.3 Cloner le repo
```bash
cd /opt
git clone https://github.com/VOTRE_USER/cmgeorges.git
cd cmgeorges
git checkout main   # ou staging / dev sur des VPS différents
```

#### 3.4 Créer `docker-compose.prod.yml` (à la racine du repo)
```yaml
version: '3.9'
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    env_file: ./backend/.env.prod
    ports:
      - "8001:8001"
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        REACT_APP_BACKEND_URL: https://api.cmgeorges.com
    ports:
      - "3000:80"
    restart: unless-stopped
```

#### 3.5 Nginx reverse-proxy + SSL
```nginx
# /etc/nginx/sites-available/cmgeorges
server {
  server_name cmgeorges.com www.cmgeorges.com;
  location / { proxy_pass http://localhost:3000; }
}
server {
  server_name api.cmgeorges.com;
  location / { proxy_pass http://localhost:8001; }
}
```
```bash
ln -s /etc/nginx/sites-available/cmgeorges /etc/nginx/sites-enabled/
certbot --nginx -d cmgeorges.com -d www.cmgeorges.com -d api.cmgeorges.com
systemctl reload nginx
```

#### 3.6 Démarrer
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

#### 3.7 Multi-environnements
- VPS 1 : branche `main` (prod)
- VPS 2 : branche `staging` (staging) — un petit VPS à 2 €
- Dev : local uniquement via `docker-compose up`

### Coût estimé
- 2 VPS Hetzner : **8 €/mois**
- MongoDB Atlas : gratuit
- **Total : ~8 €/mois**

---

## OPTION 4 — Cloudflare Pages (Frontend) + Railway (Backend)

### Avantages
- Cloudflare Pages : CDN mondial ultra-rapide, illimité gratuit
- Railway : backend facile, pay-as-you-go (~5 $/mois)

### 4.1 Frontend Cloudflare Pages
1. https://dash.cloudflare.com → Pages → **Connect to Git**
2. Sélectionner le repo
3. Configuration :
   - **Build command** : `cd frontend && yarn install && yarn build`
   - **Build output directory** : `frontend/build`
   - **Branch** : `main` (prod), `staging`, `dev` → déploiements séparés automatiques
4. Ajouter les variables d'env (mêmes que Vercel section 2.1)
5. **Custom domains** → ajouter `cmgeorges.com`

### 4.2 Backend Railway
1. https://railway.app → **New Project → Deploy from GitHub**
2. Choisir le repo, root `/backend`
3. Railway détecte automatiquement FastAPI
4. Ajouter les variables d'env
5. **Settings → Networking → Generate Domain** ou ajouter `api.cmgeorges.com`
6. Créer **3 environnements** dans Railway (`production`, `staging`, `dev`) liés aux branches

### Coût
- Cloudflare Pages : **gratuit**
- Railway : **~5 $/mois** (500h d'exécution)

---

## 🔄 CI/CD GitHub Actions (commun à toutes les options)

Créer `.github/workflows/deploy.yml` à la racine du repo :

```yaml
name: Deploy CMGeorges

on:
  push:
    branches: [main, staging, dev]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: cd backend && pip install -r requirements.txt
      - run: cd backend && pytest tests/ || true

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && yarn install
      - run: cd frontend && yarn build

  deploy:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Trigger Render deploy
        run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK_PROD }}
      # Vercel se redéploie automatiquement via son intégration Git
```

Dans **GitHub → Settings → Secrets** ajouter :
- `RENDER_DEPLOY_HOOK_PROD`
- `RENDER_DEPLOY_HOOK_STAGING`
- `RENDER_DEPLOY_HOOK_DEV`

---

## ⚠️ Note sur la branche `saas` (incident mentionné)

La branche `saas` a été déployée par erreur sur un environnement qui ne lui était pas destiné. **Règles à mettre en place pour éviter la récurrence** :

1. **Protéger `main` dans GitHub** → Settings → Branches → Add protection rule :
   - Require pull request before merging
   - Require status checks to pass
   - Restrict who can push to matching branches
2. **Ne jamais configurer** la branche `saas` comme trigger de déploiement sur Vercel/Render/Cloudflare. Seules `main`, `staging`, `dev` doivent déclencher un déploiement.
3. Dans Vercel → Git → **Ignored Build Step** :
   ```bash
   if [ "$VERCEL_GIT_COMMIT_REF" = "saas" ]; then exit 0; else exit 1; fi
   ```
4. Pour tester `saas`, utiliser un déploiement Preview manuel isolé (URL éphémère) ou un environnement Emergent séparé.

---

## ✅ Recommandation finale pour CMGeorges

| Besoin | Solution recommandée |
|--------|---------------------|
| **Prod** (cmgeorges.com) | **Vercel + Render + Atlas** (Option 2) |
| **Staging** | Même stack, branche `staging` |
| **Dev** | Emergent Deploy (Option 1) pour itérer vite |
| **CI/CD** | GitHub Actions + auto-deploy Git de Vercel/Render |
| **Domaine** | DNS chez votre registrar → CNAME vers Vercel (front) et Render (api) |

**Prochaine action** : confirmez votre choix d'option (1, 2, 3 ou 4) et je génère les fichiers de configuration exacts (`Dockerfile`, `docker-compose.yml`, `render.yaml`, `vercel.json`, `.github/workflows/deploy.yml`) adaptés à votre repo.

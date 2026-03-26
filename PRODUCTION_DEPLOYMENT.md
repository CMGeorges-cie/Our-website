# Production Deployment Guide
# Migration des données statiques vers la base de données

## Prérequis

1. **Variables d'environnement de production configurées:**
   ```bash
   APP_ENV=production
   MONGO_URL=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
   DB_NAME=our_website_prod
   ```

2. **MongoDB Atlas cluster configuré** avec:
   - Base de données `our_website_prod`
   - Utilisateur avec permissions de lecture/écriture
   - Réseau configuré pour accéder depuis votre serveur

## Étapes de déploiement

### 1. Sauvegarde de production
```bash
# Créer une sauvegarde de la base de données actuelle
mongodump --uri="$MONGO_URL" --db=our_website_prod --out=backup_$(date +%Y%m%d_%H%M%S)
```

### 2. Déploiement du code
```bash
# Pousser les changements vers production
git push origin main

# Sur le serveur de production
cd /path/to/your/app
git pull origin main
```

### 3. Migration des données
```bash
# Exécuter le script de migration
cd backend
python migrate_production.py
```

### 4. Vérification de la migration
```bash
# Vérifier que les données ont été migrées
python -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check_migration():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]

    services_count = await db.services.count_documents({})
    pricing_count = await db.pricing_configs.count_documents({})
    config_count = await db.system_configs.count_documents({})

    print(f'Services: {services_count}')
    print(f'Pricing configs: {pricing_count}')
    print(f'System configs: {config_count}')

    client.close()

asyncio.run(check_migration())
"
```

### 5. Redémarrage des services
```bash
# Redémarrer votre application (Docker, PM2, etc.)
docker-compose restart backend
# ou
pm2 restart your-app
```

## Données migrées

### Services (3 services)
- **Déco Touché** (manual) - Peinture & rénovation
- **Mobilier** (furniture) - Installation de meubles
- **Services Technologiques** (tech) - Développement web

### Configurations de prix
- **Services manuels**: 8 configurations (peinture, plâtre, etc.)
- **Mobilier**: 5 configurations (assemblage, livraison, etc.)
- **Tech**: 4 configurations (développement, maintenance, etc.)

### Configurations système
- Taux TPS/TVQ
- Marges cibles par service
- Pourcentages de paiement (dépôt, jalons, final)

## Rollback si nécessaire

Si la migration échoue ou cause des problèmes:

```bash
# Restaurer la sauvegarde
mongorestore --uri="$MONGO_URL" --db=our_website_prod backup_DATE/

# Revenir à la version précédente
git checkout PREVIOUS_COMMIT
```

## Tests post-déploiement

1. **Vérifier que l'API fonctionne:**
   ```bash
   curl https://your-api.com/api/services
   curl https://your-api.com/api/pricing
   curl https://your-api.com/api/config/tps_rate
   ```

2. **Tester le frontend:**
   - Vérifier que les services s'affichent correctement
   - Tester les calculs de prix
   - Vérifier l'interface d'administration

3. **Vérifier les logs:**
   - Aucun erreur dans les logs de l'application
   - Migration log présente dans la base de données

## Maintenance continue

Après la migration, vous pouvez:
- **Modifier les services** via l'API `/api/services`
- **Ajuster les prix** via l'API `/api/pricing`
- **Changer les configurations** via l'API `/api/config`

Toutes les modifications seront automatiquement sauvegardées en base de données et disponibles immédiatement.
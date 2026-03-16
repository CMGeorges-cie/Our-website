# ServiceFlow Mobile App

Application mobile React Native pour les techniciens et clients de ServiceFlow.

## Structure du Projet

```
/app/mobile/
├── src/
│   ├── screens/           # Écrans de l'application
│   │   ├── auth/          # Login, Register
│   │   ├── technician/    # Écrans technicien
│   │   └── common/        # Écrans partagés
│   ├── components/        # Composants réutilisables
│   ├── services/          # API calls, storage
│   ├── navigation/        # React Navigation config
│   ├── hooks/             # Custom hooks
│   ├── utils/             # Helpers, constants
│   └── assets/            # Images, fonts
├── App.tsx                # Point d'entrée
└── package.json
```

## API Backend

L'application utilise l'API v2 optimisée pour mobile:
- Base URL: `{BACKEND_URL}/api/v2/`
- Auth: JWT Bearer tokens (8h access, 30 jours refresh)

### Endpoints Clés

| Endpoint | Description |
|----------|-------------|
| `POST /auth/login` | Connexion utilisateur |
| `POST /auth/refresh` | Refresh token |
| `POST /mobile/device-token` | Push notifications |
| `GET /mobile/sync/projects` | Sync offline |
| `GET /mobile/sync/today` | Projets du jour |
| `POST /mobile/checkin` | Check-in sur site |
| `POST /mobile/checkout` | Check-out avec signature |
| `POST /mobile/photos` | Upload photos (base64) |
| `GET /mobile/dashboard` | Stats dashboard |

## Fonctionnalités Prévues

### Phase 1 (MVP Technicien)
- [x] Architecture API mobile-ready (backend)
- [ ] Authentification (login/logout)
- [ ] Liste des projets assignés
- [ ] Détail projet avec tâches
- [ ] Check-in/Check-out GPS
- [ ] Upload photos
- [ ] Mise à jour statut rapide

### Phase 2
- [ ] Mode offline avec sync
- [ ] Push notifications
- [ ] Signature client sur écran
- [ ] Suivi du temps
- [ ] Messages projet

### Phase 3
- [ ] Portail client mobile
- [ ] Calendrier technicien
- [ ] Gestion des matériaux
- [ ] Rapports d'intervention

## Installation (à venir)

```bash
cd /app/mobile
npx react-native init ServiceFlowMobile --template react-native-template-typescript
```

## Configuration

Variables d'environnement requises:
- `API_BASE_URL`: URL de l'API backend
- `PUSH_NOTIFICATION_KEY`: Clé Firebase (optionnel)

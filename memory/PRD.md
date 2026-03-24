# CMGeorges / ServiceFlow — PRD

**Mise à jour:** 24 Mars 2026  
**Stack:** React + FastAPI + MongoDB

---

## Ce qui est implémenté

### CRM Admin ✅
- Leads, Clients, Projets (CRUD complet)
- Notifications système
- Thème dark/light premium noir/or

### Projets V2 ✅
- Tâches avec progression
- Messagerie interne
- Timeline des événements

### Multi-Tenant & Mobile ✅
- API v2 mobile-ready
- TenantContext isolation
- Structure React Native complète

### Catalogue de Services ✅
- CRUD services avec catégories
- 12 services CMGeorges

### Facturation Style Joist ✅
- Page liste avec stats
- Modal création avec intégration catalogue
- Calcul TPS/TVQ automatique
- Remises et acomptes
- Page détail professionnelle

### Signature Électronique ✅ [NOUVEAU]
- **Composant SignaturePad** avec react-signature-canvas
- **Dialog de signature** complet:
  - Texte légal (valeur légale signature électronique)
  - Info signataire et date/heure
  - Zone de signature interactive avec canvas
  - Boutons Effacer/Confirmer
- **Backend endpoints**:
  - `POST /api/v1/admin/invoices/{id}/signature`
  - `DELETE /api/v1/admin/invoices/{id}/signature`
  - `POST /api/v1/admin/quotes/{id}/signature`
- **Affichage signature** sauvegardée sur facture/devis
- **SignatureDisplay** component pour afficher signatures existantes

---

## Structure Fichiers

```
/app
├── backend/
│   └── server.py              # + SignatureData model, signature endpoints
├── frontend/
│   └── src/
│       ├── components/ui/
│       │   └── signature-pad.jsx   # [NEW] SignaturePad, SignatureDialog, SignatureDisplay
│       ├── lib/api.js              # + addInvoiceSignature, addQuoteSignature
│       └── pages/admin/
│           ├── AdminInvoices.jsx
│           └── AdminInvoiceDetail.jsx  # + signature integration
└── mobile/
    └── src/...
```

---

## API Signature

| Endpoint | Description |
|----------|-------------|
| `POST /invoices/{id}/signature` | Ajouter signature client à facture |
| `DELETE /invoices/{id}/signature` | Supprimer signature |
| `POST /quotes/{id}/signature` | Signer devis (change status → accepted) |

**Payload SignatureData:**
```json
{
  "signature_base64": "data:image/png;base64,...",
  "signer_name": "Client Name",
  "signer_email": "client@email.com"
}
```

---

## Backlog

### P1 - Prochaine
- [ ] Ajouter signature aux devis (frontend)
- [ ] Inclure signature dans PDF
- [ ] App React Native sur stores

### P2
- [ ] Envoi devis par email avec lien signature
- [ ] Système Produits + Inventaire

### P3
- [ ] Dashboard Analytics
- [ ] Migration PostgreSQL

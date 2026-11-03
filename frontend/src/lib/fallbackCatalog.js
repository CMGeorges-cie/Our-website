// Instantané de secours du catalogue public — copie fidèle des prix réels de Déco Touché
// récupérés depuis l'API publique du site en ligne le 2026-11-03.
// Utilisé UNIQUEMENT si le serveur de données ne répond pas : les prix restent
// toujours affichés sur le site au lieu d'un chargement sans fin.
// Quand le serveur répond, ses données (à jour) ont toujours priorité.
export const FALLBACK_CATALOG = [
  {
    "id": "6238f8db-9dc4-426a-9d7f-8b1289470afe",
    "name": "Peinture 3½",
    "category": "painting",
    "pricing_type": "quote",
    "base_price": 450.0,
    "unit": "forfait",
    "estimated_duration": "1-2 jours"
  },
  {
    "id": "87421e84-2d2b-4288-8aac-b49cbd90ad59",
    "name": "Peinture 4½",
    "category": "painting",
    "pricing_type": "quote",
    "base_price": 550.0,
    "unit": "forfait",
    "estimated_duration": "2 jours"
  },
  {
    "id": "0bfe39ce-e2d0-4dc7-a646-3a50b26e3794",
    "name": "Installation TV murale",
    "category": "installation",
    "pricing_type": "fixed",
    "base_price": 120.0,
    "unit": "forfait",
    "estimated_duration": "1-2 heures"
  },
  {
    "id": "802f02f4-20c1-4585-862a-5b55ba61fdd0",
    "name": "Assemblage lit",
    "category": "furniture",
    "pricing_type": "quote",
    "base_price": 95.0,
    "unit": "lit",
    "estimated_duration": "1-2 heures"
  },
  {
    "id": "9da2de60-0739-4180-a136-3dbe5e26b1bf",
    "name": "Assemblage garde-robe PAX",
    "category": "furniture",
    "pricing_type": "fixed",
    "base_price": 240.0,
    "unit": "unité",
    "estimated_duration": "3-4 heures"
  },
  {
    "id": "ce8327fb-e160-414a-860e-648441fa47ff",
    "name": "Homme à tout faire",
    "category": "maintenance",
    "pricing_type": "hourly",
    "base_price": 65.0,
    "unit": "heure",
    "estimated_duration": "Variable"
  },
  {
    "id": "76775833-ce39-488c-a5bc-ccaac83ea428",
    "name": "TEST_Service_1774310817",
    "category": "maintenance",
    "pricing_type": "fixed",
    "base_price": 100.0,
    "unit": "forfait"
  },
  {
    "id": "1c8dad5b-9f43-4649-85be-2a885f338c9a",
    "name": "Test Service",
    "category": "maintenance",
    "pricing_type": "fixed",
    "base_price": 100.0,
    "unit": "forfait"
  },
  {
    "id": "7216814c-330f-4c0d-b16a-26818bcdfc7e",
    "name": "Nettoyage de climatiseur et thermopompe murale",
    "category": "maintenance",
    "pricing_type": "quote",
    "base_price": 0.0,
    "unit": "forfait",
    "estimated_duration": "Selon le modèle et l’état"
  },
  {
    "id": "6dea74f5-2098-4244-8962-3bc8773accfa",
    "name": "Pose de plancher flottant et LVP",
    "category": "renovation",
    "pricing_type": "quote",
    "base_price": 0.0,
    "unit": "forfait",
    "estimated_duration": "Selon la superficie et la préparation"
  },
  {
    "id": "0742bd09-49b7-4c8c-8757-bb91cd9c69c0",
    "name": "Pose de moulures et plinthes",
    "category": "renovation",
    "pricing_type": "fixed",
    "base_price": 180.0,
    "unit": "pièce standard",
    "estimated_duration": "Selon les longueurs et la préparation"
  },
  {
    "id": "9d4667a6-c18a-485f-8102-4e920a6026cb",
    "name": "Mur accent avec cheminée et TV",
    "category": "renovation",
    "pricing_type": "quote",
    "base_price": 2800.0,
    "unit": "forfait",
    "estimated_duration": "Selon le modèle et les dimensions"
  },
  {
    "id": "03351ffb-7b50-4255-a3d7-bd50f69b7520",
    "name": "Peinture 5½+",
    "category": "painting",
    "pricing_type": "quote",
    "base_price": 700.0,
    "unit": "forfait",
    "estimated_duration": "2-3 jours"
  },
  {
    "id": "c9d81755-e892-481c-89d3-65f99554fadf",
    "name": "Assemblage meuble simple",
    "category": "furniture",
    "pricing_type": "quote",
    "base_price": 65.0,
    "unit": "meuble",
    "estimated_duration": "1 heure"
  },
  {
    "id": "c5a1f9bc-e9b7-483a-9ef6-c70075cf12b1",
    "name": "Site web vitrine",
    "category": "tech",
    "pricing_type": "quote",
    "base_price": 1500.0,
    "unit": "projet",
    "estimated_duration": "2-3 semaines"
  },
  {
    "id": "15a9f1b0-9f9b-4ce8-8fd9-bd1db68e2a5d",
    "name": "TEST_Service_TEST_3de3a623_1774310881",
    "category": "maintenance",
    "pricing_type": "fixed",
    "base_price": 99.99,
    "unit": "forfait",
    "estimated_duration": "1 hour"
  }
];

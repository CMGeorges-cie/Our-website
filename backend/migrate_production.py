#!/usr/bin/env python3
"""
Production Data Migration Script
Run this script to migrate static data to production database.
"""

import asyncio
import os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import sys

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Production MongoDB configuration
APP_ENV = os.environ.get('APP_ENV', 'production').lower()
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'our_website_prod')

if not MONGO_URL:
    print("❌ MONGO_URL environment variable is required for production migration")
    sys.exit(1)

# Static data to migrate
SERVICES_DATA = [
    {
        "name": "deco-touche",
        "category": "manual",
        "title": "Déco Touché",
        "subtitle": "Peinture & Rénovation",
        "description": "Transformez votre espace de vie avec nos services professionnels de peinture et rénovation légère.",
        "features": [
            "Peinture intérieure et extérieure",
            "Rénovation légère (plâtre, joints)",
            "Entretien général",
            "Installation décoration",
            "Réparation de murs et plafonds",
            "Finition et retouches"
        ],
        "pricing": {"starting_from": 250},
        "image_url": "https://images.unsplash.com/photo-1652766825080-88818e6509b6?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "is_featured": False,
        "sort_order": 1
    },
    {
        "name": "mobilier",
        "category": "furniture",
        "title": "Mobilier & Installation",
        "subtitle": "Service clé en main",
        "description": "De la fourniture à l'installation sécuritaire, nous nous occupons de tout votre mobilier.",
        "features": [
            "Assemblage IKEA, JYSK, Structube",
            "Livraison incluse",
            "Ancrage mural sécuritaire",
            "Garantie installation",
            "Fourniture optionnelle",
            "Prix compétitifs vs marché"
        ],
        "pricing": {"starting_from": 75},
        "image_url": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800",
        "is_featured": True,
        "sort_order": 2
    },
    {
        "name": "tech-services",
        "category": "tech",
        "title": "Services Technologiques",
        "subtitle": "Développement web professionnel",
        "description": "Développement web professionnel et solutions numériques.",
        "features": [
            "Sites vitrines",
            "E-commerce complet",
            "Applications web sur mesure",
            "Audit DevOps/Cloud",
            "Maintenance mensuelle"
        ],
        "pricing": {"hourly_rate": 70},
        "image_url": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
        "is_featured": False,
        "sort_order": 3
    }
]

PRICING_CONFIG = {
    "manual": {
        "interior_paint": {"base": 3.50, "market": 4.50, "rate_per_sqft": 3.50, "description": "Peinture intérieure"},
        "exterior_paint": {"base": 4.00, "market": 5.50, "rate_per_sqft": 4.00, "description": "Peinture extérieure"},
        "plaster_repair": {"base": 25.00, "market": 35.00, "rate_per_sqft": 25.00, "description": "Réparation de plâtre"},
        "joint_taping": {"base": 2.50, "market": 3.50, "rate_per_sqft": 2.50, "description": "Joints de plâtre"},
        "wall_repair": {"base": 20.00, "market": 30.00, "rate_per_sqft": 20.00, "description": "Réparation de murs"},
        "ceiling_repair": {"base": 25.00, "market": 35.00, "rate_per_sqft": 25.00, "description": "Réparation de plafonds"},
        "decor_installation": {"base": 15.00, "market": 25.00, "hourly": 15.00, "description": "Installation décoration"},
        "general_maintenance": {"base": 20.00, "market": 30.00, "hourly": 20.00, "description": "Entretien général"}
    },
    "furniture": {
        "ikea_assembly": {"base": 75.00, "market": 100.00, "hourly": 75.00, "description": "Assemblage IKEA"},
        "jysk_assembly": {"base": 75.00, "market": 100.00, "hourly": 75.00, "description": "Assemblage JYSK"},
        "structube_assembly": {"base": 75.00, "market": 100.00, "hourly": 75.00, "description": "Assemblage Structube"},
        "wall_mounting": {"base": 25.00, "market": 40.00, "hourly": 25.00, "description": "Ancrage mural"},
        "delivery": {"base": 50.00, "market": 75.00, "hourly": 50.00, "description": "Livraison"}
    },
    "tech": {
        "web_development": {"base": 70.00, "market": 120.00, "hourly": 70.00, "description": "Développement web"},
        "ecommerce_setup": {"base": 1500.00, "market": 3000.00, "hourly": 70.00, "description": "Configuration e-commerce"},
        "maintenance": {"base": 150.00, "market": 300.00, "hourly": 150.00, "description": "Maintenance mensuelle"},
        "consulting": {"base": 100.00, "market": 200.00, "hourly": 100.00, "description": "Consultation technique"}
    }
}

SYSTEM_CONFIGS_DATA = [
    {"config_key": "tps_rate", "config_value": 0.05, "config_type": "number", "description": "TPS rate"},
    {"config_key": "tvq_rate", "config_value": 0.09975, "config_type": "number", "description": "TVQ rate"},
    {"config_key": "manual_margin_target", "config_value": 0.55, "config_type": "number", "description": "Manual services margin target"},
    {"config_key": "tech_margin_target", "config_value": 0.70, "config_type": "number", "description": "Tech services margin target"},
    {"config_key": "furniture_margin_target", "config_value": 0.45, "config_type": "number", "description": "Furniture services margin target"},
    {"config_key": "deposit_percentage", "config_value": 0.30, "config_type": "number", "description": "Deposit percentage"},
    {"config_key": "milestone_percentage", "config_value": 0.30, "config_type": "number", "description": "Milestone payment percentage"},
    {"config_key": "final_percentage", "config_value": 0.40, "config_type": "number", "description": "Final payment percentage"}
]

CONTENT_PAGES_DATA = [
    {
        "slug": "privacy",
        "title": "Politique de Confidentialité",
        "content": """
        <div class="space-y-8">
            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">1. Introduction</h2>
              <p class="text-gray-600">
                CMGeorges ("nous", "notre", "nos") s'engage à protéger la confidentialité de vos informations personnelles. 
                Cette politique explique comment nous collectons, utilisons et protégeons vos données lorsque vous utilisez 
                notre site web et nos services.
              </p>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">2. Informations Collectées</h2>
              <p class="text-gray-600 mb-4">Nous collectons les types d'informations suivants:</p>
              <ul class="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Informations de contact:</strong> nom, adresse courriel, numéro de téléphone, adresse postale</li>
                <li><strong>Informations de projet:</strong> description des services demandés, préférences, photos</li>
                <li><strong>Informations de navigation:</strong> adresse IP, type de navigateur, pages visitées (via cookies)</li>
                <li><strong>Informations de paiement:</strong> traitées de manière sécurisée par nos partenaires de paiement</li>
              </ul>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">3. Utilisation des Informations</h2>
              <p class="text-gray-600 mb-4">Vos informations sont utilisées pour:</p>
              <ul class="list-disc pl-6 text-gray-600 space-y-2">
                <li>Répondre à vos demandes de soumission et questions</li>
                <li>Fournir et améliorer nos services</li>
                <li>Vous contacter concernant votre projet</li>
                <li>Envoyer des communications marketing (avec votre consentement)</li>
                <li>Analyser l'utilisation de notre site pour l'améliorer</li>
                <li>Respecter nos obligations légales</li>
              </ul>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">4. Partage des Informations</h2>
              <p class="text-gray-600 mb-4">
                Nous ne vendons jamais vos informations personnelles. Nous pouvons partager vos informations avec:
              </p>
              <ul class="list-disc pl-6 text-gray-600 space-y-2">
                <li>Nos sous-traitants et partenaires pour la réalisation des services</li>
                <li>Nos fournisseurs de services (hébergement, paiement, courriel)</li>
                <li>Les autorités légales si requis par la loi</li>
              </ul>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">5. Cookies et Technologies Similaires</h2>
              <p class="text-gray-600 mb-4">
                Notre site utilise des cookies pour améliorer votre expérience:
              </p>
              <ul class="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Cookies essentiels:</strong> nécessaires au fonctionnement du site</li>
                <li><strong>Cookies analytiques:</strong> Google Analytics pour comprendre l'utilisation du site</li>
                <li><strong>Cookies marketing:</strong> Meta Pixel pour mesurer l'efficacité de nos publicités</li>
              </ul>
              <p class="text-gray-600 mt-4">
                Vous pouvez configurer votre navigateur pour refuser les cookies, mais certaines fonctionnalités 
                pourraient ne pas fonctionner correctement.
              </p>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">6. Sécurité des Données</h2>
              <p class="text-gray-600">
                Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos informations contre 
                l'accès non autorisé, la modification, la divulgation ou la destruction. Cela inclut le chiffrement 
                des données en transit (HTTPS) et au repos, ainsi que des contrôles d'accès stricts.
              </p>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">7. Conservation des Données</h2>
              <p class="text-gray-600">
                Nous conservons vos informations personnelles aussi longtemps que nécessaire pour fournir nos services 
                et respecter nos obligations légales. Les données des projets sont conservées pendant 7 ans conformément 
                aux exigences fiscales.
              </p>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">8. Vos Droits</h2>
              <p class="text-gray-600 mb-4">Conformément à la Loi sur la protection des renseignements personnels du Québec, vous avez le droit de:</p>
              <ul class="list-disc pl-6 text-gray-600 space-y-2">
                <li>Accéder à vos informations personnelles</li>
                <li>Rectifier des informations inexactes</li>
                <li>Demander la suppression de vos données</li>
                <li>Retirer votre consentement aux communications marketing</li>
                <li>Porter plainte auprès de la Commission d'accès à l'information du Québec</li>
              </ul>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">9. Contact</h2>
              <p class="text-gray-600">
                Pour toute question concernant cette politique ou pour exercer vos droits, contactez-nous:
              </p>
              <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                <p class="text-gray-700"><strong>CMGeorges</strong></p>
                <p class="text-gray-600">Courriel: cmgeorges.cie@gmail.com</p>
                <p class="text-gray-600">Téléphone: 514-386-1743</p>
                <p class="text-gray-600">Montréal, QC, Canada</p>
              </div>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">10. Modifications</h2>
              <p class="text-gray-600">
                Nous pouvons mettre à jour cette politique de temps en temps. Les modifications seront publiées 
                sur cette page avec une date de mise à jour. Nous vous encourageons à consulter régulièrement 
                cette politique.
              </p>
            </div>
          </div>
        """,
        "meta_description": "Politique de confidentialité de CMGeorges. Découvrez comment nous protégeons vos données personnelles.",
        "last_updated": "2026-02-01",
        "is_active": True
    },
    {
        "slug": "terms",
        "title": "Conditions Générales de Service",
        "content": """
        <div class="space-y-8">
            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">1. Acceptation des Conditions</h2>
              <p class="text-gray-600">
                En utilisant les services de CMGeorges, vous acceptez d'être lié par les présentes conditions générales. 
                Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser nos services.
              </p>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">2. Description des Services</h2>
              <p class="text-gray-600 mb-4">CMGeorges offre trois catégories de services:</p>
              <ul class="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Déco Touché:</strong> Peinture, rénovation légère, entretien, installation TV murale</li>
                <li><strong>Mobilier:</strong> Assemblage, livraison et installation de meubles (IKEA, JYSK, etc.)</li>
                <li><strong>Tech:</strong> Développement web, applications, DevOps, maintenance</li>
              </ul>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">3. Soumissions et Devis</h2>
              <ul class="list-disc pl-6 text-gray-600 space-y-2">
                <li>Toutes les soumissions sont gratuites et sans engagement</li>
                <li>Les soumissions sont valides pour 30 jours sauf indication contraire</li>
                <li>Les prix incluent une provision pour imprévus (10-20%) clairement indiquée</li>
                <li>Les taxes (TPS et TVQ) sont affichées séparément</li>
                <li>Le prix final peut varier si l'étendue des travaux change</li>
              </ul>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">4. Modalités de Paiement</h2>
              <ul class="list-disc pl-6 text-gray-600 space-y-2">
                <li>Un dépôt de 30% est requis à la signature du contrat</li>
                <li>Un paiement de 30% est dû à mi-projet</li>
                <li>Le solde de 40% est payable à la complétion des travaux</li>
                <li>Pour les projets de moins de 500$: paiement à la fin des travaux</li>
                <li>Modes acceptés: Interac, carte de crédit, chèque, comptant</li>
                <li>Les factures impayées portent intérêt à 2% par mois après 30 jours</li>
              </ul>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">5. Annulation et Remboursement</h2>
              <ul class="list-disc pl-6 text-gray-600 space-y-2">
                <li>Annulation avant début des travaux: remboursement complet du dépôt moins 50$ de frais administratifs</li>
                <li>Annulation après début des travaux: facturation des travaux complétés et matériaux commandés</li>
                <li>Reporter un rendez-vous: préavis de 48h requis, sans frais</li>
                <li>Report avec moins de 48h de préavis: frais de 50$</li>
              </ul>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">6. Garanties</h2>
              <div class="space-y-4">
                <div>
                  <h3 class="font-semibold text-[#1a365d]">Services manuels (Déco Touché)</h3>
                  <ul class="list-disc pl-6 text-gray-600 space-y-1">
                    <li>Garantie de 1 an sur la main-d'œuvre</li>
                    <li>Correction gratuite des défauts signalés dans les 30 jours</li>
                    <li>Exclut l'usure normale et les dommages causés par le client</li>
                  </ul>
                </div>
                <div>
                  <h3 class="font-semibold text-[#1a365d]">Assemblage mobilier</h3>
                  <ul class="list-disc pl-6 text-gray-600 space-y-1">
                    <li>Garantie de 30 jours sur l'assemblage</li>
                    <li>Correction gratuite si problème lié à notre travail</li>
                    <li>Exclut les pièces manquantes ou défectueuses du fabricant</li>
                  </ul>
                </div>
                <div>
                  <h3 class="font-semibold text-[#1a365d]">Services Tech</h3>
                  <ul class="list-disc pl-6 text-gray-600 space-y-1">
                    <li>Garantie de 90 jours sur les bugs et erreurs</li>
                    <li>Support technique inclus pendant la période de garantie</li>
                    <li>Exclut les modifications demandées après livraison</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">7. Responsabilité</h2>
              <ul class="list-disc pl-6 text-gray-600 space-y-2">
                <li>CMGeorges est assuré pour les dommages causés lors des travaux</li>
                <li>Notre responsabilité est limitée au montant du contrat</li>
                <li>Le client doit signaler tout problème existant avant les travaux</li>
                <li>Nous ne sommes pas responsables des vices cachés des meubles du fabricant</li>
                <li>Pour les services tech: pas de garantie de résultats commerciaux (ventes, trafic)</li>
              </ul>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">8. Accès aux Lieux</h2>
              <ul class="list-disc pl-6 text-gray-600 space-y-2">
                <li>Le client doit fournir un accès adéquat aux lieux de travail</li>
                <li>Les espaces de travail doivent être dégagés avant notre arrivée</li>
                <li>Le client est responsable de déplacer les objets de valeur</li>
                <li>Un adulte doit être présent ou accessible pendant les travaux</li>
              </ul>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">9. Propriété Intellectuelle</h2>
              <p class="text-gray-600">
                Pour les services Tech: le client devient propriétaire du code source et des livrables 
                une fois le paiement complet effectué. CMGeorges conserve le droit d'utiliser des extraits 
                anonymisés dans son portfolio.
              </p>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">10. Force Majeure</h2>
              <p class="text-gray-600">
                CMGeorges n'est pas responsable des retards ou de l'impossibilité d'exécuter les services 
                en raison de circonstances indépendantes de notre volonté (pandémie, catastrophes naturelles, 
                grèves, pénuries de matériaux, etc.).
              </p>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">11. Litiges</h2>
              <p class="text-gray-600">
                Les présentes conditions sont régies par les lois du Québec. Tout litige sera soumis aux 
                tribunaux compétents du district judiciaire de Montréal. Avant toute procédure judiciaire, 
                les parties s'engagent à tenter une résolution à l'amiable.
              </p>
            </div>

            <div>
              <h2 class="text-2xl font-bold text-[#1a365d] mb-4 font-['Outfit']">12. Contact</h2>
              <p class="text-gray-600">
                Pour toute question concernant ces conditions:
              </p>
              <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                <p class="text-gray-700"><strong>CMGeorges</strong></p>
                <p class="text-gray-600">Courriel: cmgeorges.cie@gmail.com</p>
                <p class="text-gray-600">Téléphone: 514-386-1743</p>
              </div>
            </div>
          </div>
        """,
        "meta_description": "Conditions générales de service de CMGeorges pour les services de rénovation, assemblage mobilier et développement web.",
        "last_updated": "2026-02-01",
        "is_active": True
    }
]

CONTACT_INFO_DATA = [
    {
        "type": "phone",
        "title": "Téléphone",
        "value": "514-386-1743",
        "subtitle": "Disponible 7j/7, 8h à 20h",
        "details": [],
        "is_active": True,
        "sort_order": 1
    },
    {
        "type": "email",
        "title": "Courriel",
        "value": "cmgeorges.cie@gmail.com",
        "subtitle": "Réponse sous 24h",
        "details": [],
        "is_active": True,
        "sort_order": 2
    },
    {
        "type": "location",
        "title": "Zone de service",
        "value": "Montréal & Rive-Sud",
        "subtitle": "Longueuil, Brossard, Saint-Hubert, Laval...",
        "details": [],
        "is_active": True,
        "sort_order": 3
    },
    {
        "type": "hours",
        "title": "Heures d'ouverture",
        "value": "",
        "subtitle": "",
        "details": ["Lun-Ven: 8h - 20h", "Sam-Dim: 9h - 18h", "Service d'urgence disponible"],
        "is_active": True,
        "sort_order": 4
    }
]

SERVICE_TYPES_DATA = [
    {
        "value": "manual",
        "label": "Déco Touché (Peinture/Rénovation)",
        "icon": "Paintbrush",
        "is_active": True,
        "sort_order": 1
    },
    {
        "value": "furniture",
        "label": "Mobilier & Installation",
        "icon": "Sofa",
        "is_active": True,
        "sort_order": 2
    },
    {
        "value": "tech",
        "label": "CMGeorges Tech",
        "icon": "Code",
        "is_active": True,
        "sort_order": 3
    }
]

ITEM_TYPES_DATA = [
    {"value": "bed", "label": "Lit", "is_active": True, "sort_order": 1},
    {"value": "dresser", "label": "Commode", "is_active": True, "sort_order": 2},
    {"value": "desk", "label": "Bureau", "is_active": True, "sort_order": 3},
    {"value": "wardrobe", "label": "Garde-robe", "is_active": True, "sort_order": 4},
    {"value": "sofa", "label": "Sofa", "is_active": True, "sort_order": 5},
    {"value": "table", "label": "Table", "is_active": True, "sort_order": 6},
    {"value": "chair", "label": "Chaise", "is_active": True, "sort_order": 7},
    {"value": "shelf", "label": "Étagère", "is_active": True, "sort_order": 8},
    {"value": "other", "label": "Autre", "is_active": True, "sort_order": 9}
]

BRANDS_DATA = [
    {"value": "ikea", "label": "IKEA", "is_active": True, "sort_order": 1},
    {"value": "jysk", "label": "JYSK", "is_active": True, "sort_order": 2},
    {"value": "structube", "label": "Structube", "is_active": True, "sort_order": 3},
    {"value": "wayfair", "label": "Wayfair", "is_active": True, "sort_order": 4},
    {"value": "other", "label": "Autre", "is_active": True, "sort_order": 5}
]

SOURCES_DATA = [
    {"value": "google", "label": "Google", "is_active": True, "sort_order": 1},
    {"value": "facebook", "label": "Facebook", "is_active": True, "sort_order": 2},
    {"value": "instagram", "label": "Instagram", "is_active": True, "sort_order": 3},
    {"value": "referral", "label": "Référence", "is_active": True, "sort_order": 4},
    {"value": "other", "label": "Autre", "is_active": True, "sort_order": 5}
]

async def migrate_data():
    """Migrate static data to production database"""

    print(f"🚀 Starting production data migration...")
    print(f"📍 Environment: {APP_ENV}")
    print(f"🗄️  Database: {DB_NAME}")
    print(f"🔗 MongoDB URL: {MONGO_URL[:30]}...")

    # Connect to database
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    migrated_data = {
        "services": [],
        "pricing_configs": [],
        "system_configs": [],
        "content_pages": [],
        "contact_info": [],
        "service_types": [],
        "item_types": [],
        "brands": [],
        "sources": []
    }

    try:
        # Check if migration already ran
        existing_migration = await db.migration_log.find_one({"migration_id": "migration_001"})
        if existing_migration:
            print("⚠️  Migration already completed. Skipping...")
            return {"message": "Migration already completed", "status": "skipped"}

        print("📦 Migrating services...")
        for service_data in SERVICES_DATA:
            # Check if service already exists
            existing = await db.services.find_one({"name": service_data["name"]})
            if not existing:
                service_data["id"] = str(uuid.uuid4())
                service_data["created_at"] = datetime.now(timezone.utc)
                service_data["updated_at"] = datetime.now(timezone.utc)
                service_data["is_active"] = True

                await db.services.insert_one(service_data)
                migrated_data["services"].append(service_data)
                print(f"  ✅ Created service: {service_data['name']}")
            else:
                print(f"  ⏭️  Service already exists: {service_data['name']}")

        print("💰 Migrating pricing configurations...")
        for service_type, items in PRICING_CONFIG.items():
            for item_key, config in items.items():
                # Check if pricing config already exists
                existing = await db.pricing_configs.find_one({
                    "service_type": service_type,
                    "item_key": item_key
                })
                if not existing:
                    pricing_config = {
                        "id": str(uuid.uuid4()),
                        "service_type": service_type,
                        "item_key": item_key,
                        "base_price": config.get("base"),
                        "market_price": config.get("market"),
                        "hourly_rate": config.get("hourly"),
                        "rate_per_sqft": config.get("rate_per_sqft"),
                        "description": config.get("description", ""),
                        "is_active": True,
                        "created_at": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc)
                    }

                    await db.pricing_configs.insert_one(pricing_config)
                    migrated_data["pricing_configs"].append(pricing_config)
                    print(f"  ✅ Created pricing config: {service_type}.{item_key}")
                else:
                    print(f"  ⏭️  Pricing config already exists: {service_type}.{item_key}")

        print("⚙️  Migrating system configurations...")
        for config_data in SYSTEM_CONFIGS_DATA:
            # Check if system config already exists
            existing = await db.system_configs.find_one({"config_key": config_data["config_key"]})
            if not existing:
                config_data["id"] = str(uuid.uuid4())
                config_data["created_at"] = datetime.now(timezone.utc)
                config_data["updated_at"] = datetime.now(timezone.utc)
                config_data["is_active"] = True

                await db.system_configs.insert_one(config_data)
                migrated_data["system_configs"].append(config_data)
                print(f"  ✅ Created system config: {config_data['config_key']}")
            else:
                print(f"  ⏭️  System config already exists: {config_data['config_key']}")

        print("📄 Migrating content pages...")
        for page_data in CONTENT_PAGES_DATA:
            # Check if content page already exists
            existing = await db.content_pages.find_one({"slug": page_data["slug"]})
            if not existing:
                page_data["id"] = str(uuid.uuid4())
                page_data["created_at"] = datetime.now(timezone.utc)
                page_data["updated_at"] = datetime.now(timezone.utc)

                await db.content_pages.insert_one(page_data)
                migrated_data["content_pages"] = migrated_data.get("content_pages", [])
                migrated_data["content_pages"].append(page_data)
                print(f"  ✅ Created content page: {page_data['slug']}")
            else:
                print(f"  ⏭️  Content page already exists: {page_data['slug']}")

        print("📞 Migrating contact info...")
        for contact_data in CONTACT_INFO_DATA:
            # Check if contact info already exists
            existing = await db.contact_info.find_one({"type": contact_data["type"]})
            if not existing:
                contact_data["id"] = str(uuid.uuid4())
                contact_data["created_at"] = datetime.now(timezone.utc)
                contact_data["updated_at"] = datetime.now(timezone.utc)

                await db.contact_info.insert_one(contact_data)
                migrated_data["contact_info"] = migrated_data.get("contact_info", [])
                migrated_data["contact_info"].append(contact_data)
                print(f"  ✅ Created contact info: {contact_data['type']}")
            else:
                print(f"  ⏭️  Contact info already exists: {contact_data['type']}")

        print("🔧 Migrating service types...")
        for service_type_data in SERVICE_TYPES_DATA:
            # Check if service type already exists
            existing = await db.service_types.find_one({"value": service_type_data["value"]})
            if not existing:
                service_type_data["id"] = str(uuid.uuid4())
                service_type_data["created_at"] = datetime.now(timezone.utc)
                service_type_data["updated_at"] = datetime.now(timezone.utc)

                await db.service_types.insert_one(service_type_data)
                migrated_data["service_types"] = migrated_data.get("service_types", [])
                migrated_data["service_types"].append(service_type_data)
                print(f"  ✅ Created service type: {service_type_data['value']}")
            else:
                print(f"  ⏭️  Service type already exists: {service_type_data['value']}")

        print("🪑 Migrating item types...")
        for item_type_data in ITEM_TYPES_DATA:
            # Check if item type already exists
            existing = await db.item_types.find_one({"value": item_type_data["value"]})
            if not existing:
                item_type_data["id"] = str(uuid.uuid4())
                item_type_data["created_at"] = datetime.now(timezone.utc)
                item_type_data["updated_at"] = datetime.now(timezone.utc)

                await db.item_types.insert_one(item_type_data)
                migrated_data["item_types"] = migrated_data.get("item_types", [])
                migrated_data["item_types"].append(item_type_data)
                print(f"  ✅ Created item type: {item_type_data['value']}")
            else:
                print(f"  ⏭️  Item type already exists: {item_type_data['value']}")

        print("🏷️  Migrating brands...")
        for brand_data in BRANDS_DATA:
            # Check if brand already exists
            existing = await db.brands.find_one({"value": brand_data["value"]})
            if not existing:
                brand_data["id"] = str(uuid.uuid4())
                brand_data["created_at"] = datetime.now(timezone.utc)
                brand_data["updated_at"] = datetime.now(timezone.utc)

                await db.brands.insert_one(brand_data)
                migrated_data["brands"] = migrated_data.get("brands", [])
                migrated_data["brands"].append(brand_data)
                print(f"  ✅ Created brand: {brand_data['value']}")
            else:
                print(f"  ⏭️  Brand already exists: {brand_data['value']}")

        print("📊 Migrating sources...")
        for source_data in SOURCES_DATA:
            # Check if source already exists
            existing = await db.sources.find_one({"value": source_data["value"]})
            if not existing:
                source_data["id"] = str(uuid.uuid4())
                source_data["created_at"] = datetime.now(timezone.utc)
                source_data["updated_at"] = datetime.now(timezone.utc)

                await db.sources.insert_one(source_data)
                migrated_data["sources"] = migrated_data.get("sources", [])
                migrated_data["sources"].append(source_data)
                print(f"  ✅ Created source: {source_data['value']}")
            else:
                print(f"  ⏭️  Source already exists: {source_data['value']}")

        # Log the migration
        migration_log = {
            "migration_id": "migration_001",
            "description": "Migrated static data to database",
            "timestamp": datetime.now(timezone.utc),
            "environment": APP_ENV,
            "migrated_counts": {
                "services": len(migrated_data["services"]),
                "pricing_configs": len(migrated_data["pricing_configs"]),
                "system_configs": len(migrated_data["system_configs"]),
                "content_pages": len(migrated_data.get("content_pages", [])),
                "contact_info": len(migrated_data.get("contact_info", [])),
                "service_types": len(migrated_data.get("service_types", [])),
                "item_types": len(migrated_data.get("item_types", [])),
                "brands": len(migrated_data.get("brands", [])),
                "sources": len(migrated_data.get("sources", []))
            }
        }
        await db.migration_log.insert_one(migration_log)

        print("✅ Migration completed successfully!")
        print(f"📊 Summary:")
        print(f"   • Services: {len(migrated_data['services'])} created")
        print(f"   • Pricing configs: {len(migrated_data['pricing_configs'])} created")
        print(f"   • System configs: {len(migrated_data['system_configs'])} created")

        return {
            "message": "Data migration completed successfully",
            "status": "completed",
            "migrated": migrated_data
        }

    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    # Import required modules
    from datetime import datetime, timezone
    import uuid

    # Run migration
    result = asyncio.run(migrate_data())
    print(f"\n🎯 Migration result: {result['status']}")
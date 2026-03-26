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
        "system_configs": []
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

        # Log the migration
        migration_log = {
            "migration_id": "migration_001",
            "description": "Migrated static data to database",
            "timestamp": datetime.now(timezone.utc),
            "environment": APP_ENV,
            "migrated_counts": {
                "services": len(migrated_data["services"]),
                "pricing_configs": len(migrated_data["pricing_configs"]),
                "system_configs": len(migrated_data["system_configs"])
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
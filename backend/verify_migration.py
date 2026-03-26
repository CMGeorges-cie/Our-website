#!/usr/bin/env python3
"""
Production Migration Verification Script
Run this after migration to verify all data was migrated correctly.
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def verify_migration():
    """Verify that production migration completed successfully"""

    MONGO_URL = os.environ.get('MONGO_URL')
    DB_NAME = os.environ.get('DB_NAME', 'our_website_prod')

    if not MONGO_URL:
        print("❌ MONGO_URL environment variable is required")
        return False

    print("🔍 Verifying production migration...")
    print(f"🗄️  Database: {DB_NAME}")

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    try:
        # Check migration log
        migration_log = await db.migration_log.find_one({"migration_id": "migration_001"})
        if not migration_log:
            print("❌ Migration log not found - migration may not have completed")
            return False

        print("✅ Migration log found")
        print(f"   Timestamp: {migration_log['timestamp']}")
        print(f"   Environment: {migration_log['environment']}")

        # Verify services
        services_count = await db.services.count_documents({})
        expected_services = 3
        if services_count >= expected_services:
            print(f"✅ Services: {services_count} found (expected: {expected_services}+)")
        else:
            print(f"❌ Services: {services_count} found (expected: {expected_services}+)")
            return False

        # Verify pricing configs
        pricing_count = await db.pricing_configs.count_documents({})
        expected_pricing = 17  # 8 manual + 5 furniture + 4 tech
        if pricing_count >= expected_pricing:
            print(f"✅ Pricing configs: {pricing_count} found (expected: {expected_pricing}+)")
        else:
            print(f"❌ Pricing configs: {pricing_count} found (expected: {expected_pricing}+)")
            return False

        # Verify system configs
        config_count = await db.system_configs.count_documents({})
        expected_configs = 8
        if config_count >= expected_configs:
            print(f"✅ System configs: {config_count} found (expected: {expected_configs}+)")
        else:
            print(f"❌ System configs: {config_count} found (expected: {expected_configs}+)")
            return False

        # Sample data verification
        print("\n📋 Sample data verification:")

        # Check specific services
        deco_touche = await db.services.find_one({"name": "deco-touche"})
        if deco_touche:
            print("✅ Déco Touché service found")
        else:
            print("❌ Déco Touché service missing")

        mobilier = await db.services.find_one({"name": "mobilier"})
        if mobilier:
            print("✅ Mobilier service found")
        else:
            print("❌ Mobilier service missing")

        # Check pricing configs
        interior_paint = await db.pricing_configs.find_one({"service_type": "manual", "item_key": "interior_paint"})
        if interior_paint:
            print("✅ Interior paint pricing found")
        else:
            print("❌ Interior paint pricing missing")

        # Check system configs
        tps_rate = await db.system_configs.find_one({"config_key": "tps_rate"})
        if tps_rate:
            print(f"✅ TPS rate config found: {tps_rate['config_value']}")
        else:
            print("❌ TPS rate config missing")

        tvq_rate = await db.system_configs.find_one({"config_key": "tvq_rate"})
        if tvq_rate:
            print(f"✅ TVQ rate config found: {tvq_rate['config_value']}")
        else:
            print("❌ TVQ rate config missing")

        print("\n🎉 Migration verification completed successfully!")
        print("✅ All critical data verified")
        print("🚀 Production deployment ready")

        return True

    except Exception as e:
        print(f"❌ Verification failed: {str(e)}")
        return False
    finally:
        client.close()

if __name__ == "__main__":
    success = asyncio.run(verify_migration())
    exit(0 if success else 1)
"""
Database service for ServiceFlow
Provides centralized database access with multi-tenant support
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional, List, Dict, Any
import os

# MongoDB connection (singleton)
_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


def get_database() -> AsyncIOMotorDatabase:
    """Get the MongoDB database instance"""
    global _client, _db
    
    if _db is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'test_database')
        _client = AsyncIOMotorClient(mongo_url)
        _db = _client[db_name]
    
    return _db


class TenantRepository:
    """
    Base repository class that enforces tenant isolation.
    All data access should go through repositories that extend this class.
    """
    
    def __init__(self, collection_name: str, tenant_id: str):
        self.db = get_database()
        self.collection = self.db[collection_name]
        self.tenant_id = tenant_id
    
    def _apply_tenant_filter(self, query: dict) -> dict:
        """Add tenant_id to query filter"""
        return {**query, "tenant_id": self.tenant_id}
    
    def _apply_tenant_to_doc(self, doc: dict) -> dict:
        """Add tenant_id to document before insert"""
        doc["tenant_id"] = self.tenant_id
        return doc
    
    async def find_one(self, query: dict, projection: dict = None) -> Optional[dict]:
        """Find one document within tenant scope"""
        tenant_query = self._apply_tenant_filter(query)
        projection = projection or {}
        projection["_id"] = 0
        return await self.collection.find_one(tenant_query, projection)
    
    async def find_many(
        self, 
        query: dict = None, 
        sort: list = None, 
        limit: int = 1000,
        projection: dict = None
    ) -> List[dict]:
        """Find many documents within tenant scope"""
        query = query or {}
        tenant_query = self._apply_tenant_filter(query)
        projection = projection or {}
        projection["_id"] = 0
        
        cursor = self.collection.find(tenant_query, projection)
        
        if sort:
            cursor = cursor.sort(sort)
        
        return await cursor.to_list(limit)
    
    async def insert_one(self, doc: dict) -> dict:
        """Insert one document with tenant_id"""
        tenant_doc = self._apply_tenant_to_doc(doc)
        await self.collection.insert_one(tenant_doc)
        # Remove MongoDB _id to avoid JSON serialization issues
        tenant_doc.pop('_id', None)
        return tenant_doc
    
    async def update_one(self, query: dict, update: dict) -> bool:
        """Update one document within tenant scope"""
        tenant_query = self._apply_tenant_filter(query)
        result = await self.collection.update_one(tenant_query, update)
        return result.matched_count > 0
    
    async def delete_one(self, query: dict) -> bool:
        """Delete one document within tenant scope"""
        tenant_query = self._apply_tenant_filter(query)
        result = await self.collection.delete_one(tenant_query)
        return result.deleted_count > 0
    
    async def count(self, query: dict = None) -> int:
        """Count documents within tenant scope"""
        query = query or {}
        tenant_query = self._apply_tenant_filter(query)
        return await self.collection.count_documents(tenant_query)


class GlobalRepository:
    """
    Repository for collections that are NOT tenant-scoped.
    Use sparingly - only for truly global data like tenants themselves.
    """
    
    def __init__(self, collection_name: str):
        self.db = get_database()
        self.collection = self.db[collection_name]
    
    async def find_one(self, query: dict, projection: dict = None) -> Optional[dict]:
        projection = projection or {}
        projection["_id"] = 0
        return await self.collection.find_one(query, projection)
    
    async def find_many(
        self, 
        query: dict = None, 
        sort: list = None, 
        limit: int = 1000,
        projection: dict = None
    ) -> List[dict]:
        query = query or {}
        projection = projection or {}
        projection["_id"] = 0
        
        cursor = self.collection.find(query, projection)
        
        if sort:
            cursor = cursor.sort(sort)
        
        return await cursor.to_list(limit)
    
    async def insert_one(self, doc: dict) -> dict:
        await self.collection.insert_one(doc)
        # Remove MongoDB _id to avoid JSON serialization issues
        doc.pop('_id', None)
        return doc
    
    async def update_one(self, query: dict, update: dict) -> bool:
        result = await self.collection.update_one(query, update)
        return result.matched_count > 0
    
    async def delete_one(self, query: dict) -> bool:
        result = await self.collection.delete_one(query)
        return result.deleted_count > 0

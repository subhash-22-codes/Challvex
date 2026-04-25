import os
from motor.motor_asyncio import AsyncIOMotorClient
import logging

logger = logging.getLogger(__name__)

raw_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_URI = raw_uri.strip('"').strip("'")

client = AsyncIOMotorClient(MONGO_URI)
db = client.daily_code_tracker

async def init_db():
    try:
        await db.users.create_index("expire_at", expireAfterSeconds=0)
        logger.info("--- TTL Index created on users.expire_at ---")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
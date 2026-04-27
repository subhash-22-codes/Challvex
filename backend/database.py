import os
import logging
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING

logger = logging.getLogger(__name__)

# ----------------------------
# ENV CONFIG
# ----------------------------
raw_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_URI = raw_uri.strip('"').strip("'")

DB_NAME = os.getenv("MONGO_DB_NAME", "daily_code_tracker")

# ----------------------------
# MONGODB CLIENT
# Free tier friendly settings
# ----------------------------
client = AsyncIOMotorClient(
    MONGO_URI,
    serverSelectionTimeoutMS=10000,
    connectTimeoutMS=10000,
    socketTimeoutMS=10000,
    maxPoolSize=20,
    minPoolSize=1,
    tlsCAFile=certifi.where()
)

db = client[DB_NAME]

# ----------------------------
# STARTUP INIT
# ----------------------------
async def init_db():
    try:
        # Check actual connection
        await client.admin.command("ping")
        logger.info("MongoDB connection successful")

        # ----------------------------
        # USERS
        # ----------------------------
        await db.users.create_index(
            [("email", ASCENDING)],
            unique=True
        )

        await db.users.create_index(
            [("username", ASCENDING)],
            unique=True
        )

        # For OTP / temporary expiry usage
        await db.users.create_index(
            [("expire_at", ASCENDING)],
            expireAfterSeconds=0
        )

        # ----------------------------
        # CHALLENGES
        # ----------------------------
        await db.challenges.create_index(
            [("slot_id", ASCENDING)],
            unique=True
        )

        await db.challenges.create_index(
            [("created_at", DESCENDING)]
        )

        await db.challenges.create_index(
            [("created_by", ASCENDING)]
        )

        await db.challenges.create_index(
            [("status", ASCENDING)]
        )

        # ----------------------------
        # SUBMISSIONS
        # One student per slot
        # ----------------------------
        await db.submissions.create_index(
            [("slot_id", ASCENDING), ("student_id", ASCENDING)],
            unique=True
        )

        await db.submissions.create_index(
            [("submitted_at", DESCENDING)]
        )

        await db.submissions.create_index(
            [("student_id", ASCENDING)]
        )

        await db.submissions.create_index(
            [("status", ASCENDING)]
        )

        logger.info("All indexes initialized successfully")

    except Exception as e:
        logger.exception(f"Database initialization failed: {e}")
        raise
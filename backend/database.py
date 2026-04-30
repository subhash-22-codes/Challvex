import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
import certifi
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
        
        # ----------------------------
        # ORGANIZATIONS
        # ----------------------------
        # Ensure every org has a unique permanent URL slug
        await db.organizations.create_index(
            [("slug", ASCENDING)],
            unique=True
        )
        
        # Index by owner for the "My Organizations" list
        await db.organizations.create_index([("owner_id", ASCENDING)])

        # ----------------------------
        # ORGANIZATION MEMBERS (The Invite System)
        # ----------------------------
        # A user can only have ONE membership status per organization
        await db.org_members.create_index(
            [("org_id", ASCENDING), ("user_id", ASCENDING)],
            unique=True
        )
        
        # Index by user_id so we can quickly show a user all orgs they belong to
        await db.org_members.create_index([("user_id", ASCENDING)])

        # ----------------------------
        # ACCESS ATTEMPTS (The Gatekeeper / Rate Limiting)
        # ----------------------------
        # Compound index to track a specific user's attempts on a specific challenge
        await db.access_attempts.create_index(
            [("user_id", ASCENDING), ("slot_id", ASCENDING)],
            unique=True
        )

        # TTL INDEX: This is the "Magic" for your 1-minute cooldown.
        # This document will automatically disappear when 'expire_at' is reached.
        # Once it's gone, the user is no longer "rate limited."
        await db.access_attempts.create_index(
            [("expire_at", ASCENDING)],
            expireAfterSeconds=0
        )
        # Add this to your database.py inside init_db()
        await db.organizations.create_index(
            [("name", ASCENDING)], 
            unique=True
        )

        logger.info("All indexes (including Organizations & Gatekeeper) initialized successfully")

        
    except Exception as e:
        logger.exception(f"Database initialization failed: {e}")
        raise
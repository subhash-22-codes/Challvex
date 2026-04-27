import os
import logging
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import db, init_db
from routes import challenges, submissions, auth, judge

# -----------------------------------
# LOAD ENV
# -----------------------------------
load_dotenv()

# -----------------------------------
# LOGGING
# -----------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

# -----------------------------------
# APP
# -----------------------------------
app = FastAPI(
    title="Assessment Engine",
    version="1.0.0"
)

# -----------------------------------
# CORS
# Supports local + deployed frontend
# -----------------------------------
FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
)

allowed_origins = [
    "http://localhost:5173",
    FRONTEND_URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------
# ROUTES
# -----------------------------------
app.include_router(
    challenges.router,
    prefix="/api",
    tags=["Challenges"]
)

app.include_router(
    submissions.router,
    prefix="/api",
    tags=["Submissions"]
)

app.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["Auth"]
)

app.include_router(
    judge.router,
    prefix="/api",
    tags=["Judge"]
)

# -----------------------------------
# STARTUP
# -----------------------------------
@app.on_event("startup")
async def startup_event():
    logger.info("Starting backend...")
    await init_db()
    logger.info("Backend startup complete")

# -----------------------------------
# ROOT
# -----------------------------------
@app.get("/")
async def root():
    return {
        "message": "Assessment Engine is Online"
    }

# -----------------------------------
# HEALTH CHECK
# -----------------------------------
@app.get("/health")
async def health():
    try:
        await db.command("ping")
        return {
            "status": "ok",
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "error",
            "database": str(e)
        }

# -----------------------------------
# DEV DB TEST
# -----------------------------------
@app.get("/test-db")
async def test_db():
    try:
        await db.command("ping")
        return {
            "status": "success",
            "message": "Connected to MongoDB"
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }
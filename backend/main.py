from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

from database import db, init_db
from routes import challenges, submissions, auth, judge

load_dotenv()

app = FastAPI()

# --- CORS SETUP ---
# Ensure this matches your frontend URL precisely
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# --- REGISTER ROUTES ---
# All coding judge routes will be prefixed with /api
app.include_router(challenges.router, prefix="/api", tags=["Challenges"])
app.include_router(submissions.router, prefix="/api", tags=["Submissions"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(judge.router, prefix="/api", tags=["Judge"]) # NEW

@app.on_event("startup")
async def startup_db_client():
    await init_db()
    
@app.get("/")
async def root():
    return {"message": "Assessment Engine is Online. Ready to execute code."}

@app.get("/test-db")
async def test_db():
    try:
        # Check MongoDB connection
        await db.command("ping")
        return {"status": "Success", "message": "Connected to MongoDB!"}
    except Exception as e:
        return {"status": "Failed", "error": str(e)}
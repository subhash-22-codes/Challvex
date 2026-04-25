from fastapi import APIRouter, HTTPException, Depends, status
from models import DailyChallenge
from database import db
import pymongo 
from typing import List, Optional, Dict
from auth_utils import get_current_user
from datetime import datetime
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/challenges", response_model=DailyChallenge, status_code=201)
async def create_challenge(
    challenge: DailyChallenge, 
    current_user: dict = Depends(get_current_user)
):
    # UPDATED: Changed logging to use slot_id
    logger.info(f"Admin '{current_user['username']}' creating Challenge Slot: {challenge.slot_id}")

    if "admin" not in current_user["roles"]:
        raise HTTPException(status_code=403, detail="Access Denied")

    # UPDATED: Changed database query to check for unique slot_id (str)
    existing_slot = await db.challenges.find_one({"slot_id": challenge.slot_id})
    if existing_slot:
        raise HTTPException(
            status_code=400, 
            detail=f"Slot ID '{challenge.slot_id}' already exists."
        )

    challenge_dict = challenge.model_dump()
    challenge_dict["created_by"] = current_user["username"]
    challenge_dict["created_at"] = datetime.utcnow()
    
    await db.challenges.insert_one(challenge_dict)
    return challenge

# UPDATED: Changed path parameter to slot_id (str)
@router.patch("/challenges/{slot_id}/status")
async def update_challenge_status(
    slot_id: str,
    data: Dict[str, str],
    current_user: dict = Depends(get_current_user)
):
    new_status = data.get("status")
    if "admin" not in current_user["roles"]:
        raise HTTPException(status_code=403, detail="Access Denied")

    # UPDATED: Changed filter to use slot_id
    result = await db.challenges.update_one(
        {"slot_id": slot_id},
        {"$set": {"status": new_status}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Challenge not found")

    return {"message": f"Challenge status updated to {new_status}"}

@router.get("/challenges/latest", response_model=DailyChallenge)
async def get_latest_challenge(current_user: dict = Depends(get_current_user)):
    cursor = db.challenges.find().sort("created_at", pymongo.DESCENDING).limit(1)
    challenges = await cursor.to_list(length=1)
    
    if not challenges:
        raise HTTPException(status_code=404, detail="No challenges found")

    challenge = challenges[0]

    if "admin" not in current_user["roles"]:
        for question in challenge.get("questions", []):
            question["private_samples"] = [] 
            
    return challenge

@router.get("/challenges", response_model=List[DailyChallenge])
async def get_all_challenges(
    personal: bool = False,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    is_admin = "admin" in current_user["roles"]
    
    if personal and is_admin:
        query["created_by"] = current_user["username"]
    
    # UPDATED: Sort by created_at (chronological) instead of day_number
    cursor = db.challenges.find(query).sort("created_at", pymongo.DESCENDING)
    challenges = await cursor.to_list(length=100)
    
    if not is_admin:
        for ch in challenges:
            for q in ch.get("questions", []):
                q["private_samples"] = []

    return challenges

# UPDATED: Renamed function and changed path parameter to slot_id (str)
@router.get("/challenges/{slot_id}", response_model=DailyChallenge)
async def get_challenge_by_slot(slot_id: str, current_user: dict = Depends(get_current_user)):
    # UPDATED: Changed filter to use slot_id
    challenge = await db.challenges.find_one({"slot_id": slot_id})
    
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    if "admin" not in current_user["roles"]:
        for question in challenge.get("questions", []):
            question["private_samples"] = []

    return challenge
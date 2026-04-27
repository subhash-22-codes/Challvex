from fastapi import APIRouter, HTTPException, Depends
from models import DailyChallenge
from database import db
from auth_utils import get_current_user

from typing import List, Dict
from datetime import datetime
from pymongo import DESCENDING
from pymongo.errors import DuplicateKeyError

import logging

logger = logging.getLogger(__name__)

router = APIRouter()

VALID_STATUSES = {"draft", "live", "closed", "archived"}


# -----------------------------------
# HELPERS
# -----------------------------------
def ensure_admin(current_user: dict):
    if "admin" not in current_user["roles"]:
        raise HTTPException(
            status_code=403,
            detail="Access Denied"
        )


def hide_private_samples(challenge: dict):
    for question in challenge.get("questions", []):
        question["private_samples"] = []


# -----------------------------------
# CREATE CHALLENGE
# -----------------------------------
@router.post(
    "/challenges",
    response_model=DailyChallenge,
    status_code=201
)
async def create_challenge(
    challenge: DailyChallenge,
    current_user: dict = Depends(get_current_user)
):
    ensure_admin(current_user)

    logger.info(
        f"Admin '{current_user['username']}' creating slot '{challenge.slot_id}'"
    )

    challenge_dict = challenge.model_dump()

    challenge_dict["created_by"] = current_user["username"]
    challenge_dict["created_at"] = datetime.utcnow()

    if challenge_dict["status"] not in VALID_STATUSES:
        challenge_dict["status"] = "draft"

    try:
        await db.challenges.insert_one(challenge_dict)

    except DuplicateKeyError:
        raise HTTPException(
            status_code=400,
            detail=f"Slot ID '{challenge.slot_id}' already exists."
        )

    return challenge_dict


@router.put(
    "/challenges/{slot_id}",
    response_model=DailyChallenge
)
async def update_challenge(
    slot_id: str,
    challenge: DailyChallenge,
    current_user: dict = Depends(get_current_user)
):
    ensure_admin(current_user)

    challenge_dict = challenge.model_dump()

    challenge_dict["created_by"] = current_user["username"]

    if challenge_dict["status"] not in VALID_STATUSES:
        challenge_dict["status"] = "draft"

    result = await db.challenges.update_one(
        {"slot_id": slot_id},
        {
            "$set": challenge_dict
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Challenge not found"
        )

    updated = await db.challenges.find_one(
        {"slot_id": slot_id}
    )

    return updated
# -----------------------------------
# UPDATE STATUS
# -----------------------------------
@router.patch("/challenges/{slot_id}/status")
async def update_challenge_status(
    slot_id: str,
    data: Dict[str, str],
    current_user: dict = Depends(get_current_user)
):
    ensure_admin(current_user)

    new_status = data.get("status", "").strip().lower()

    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid status value."
        )

    result = await db.challenges.update_one(
        {"slot_id": slot_id},
        {"$set": {"status": new_status}}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Challenge not found"
        )

    return {
        "message": f"Challenge status updated to {new_status}"
    }


# -----------------------------------
# GET LATEST CHALLENGE
# -----------------------------------
@router.get(
    "/challenges/latest",
    response_model=DailyChallenge
)
async def get_latest_challenge(
    current_user: dict = Depends(get_current_user)
):
    is_admin = "admin" in current_user["roles"]

    query = {} if is_admin else {"status": "live"}

    cursor = db.challenges.find(query).sort(
        "created_at",
        DESCENDING
    ).limit(1)

    items = await cursor.to_list(length=1)

    if not items:
        raise HTTPException(
            status_code=404,
            detail="No challenges found"
        )

    challenge = items[0]

    if not is_admin:
        hide_private_samples(challenge)

    return challenge


# -----------------------------------
# GET ALL CHALLENGES
# -----------------------------------
@router.get(
    "/challenges",
    response_model=List[DailyChallenge]
)
async def get_all_challenges(
    personal: bool = False,
    current_user: dict = Depends(get_current_user)
):
    is_admin = "admin" in current_user["roles"]

    query = {}

    if is_admin:
        if personal:
            query["created_by"] = current_user["username"]
    else:
        query["status"] = "live"

    cursor = db.challenges.find(query).sort(
        "created_at",
        DESCENDING
    )

    challenges = await cursor.to_list(length=100)

    if not is_admin:
        for challenge in challenges:
            hide_private_samples(challenge)

    return challenges


# -----------------------------------
# GET CHALLENGE BY SLOT
# -----------------------------------
@router.get(
    "/challenges/{slot_id}",
    response_model=DailyChallenge
)
async def get_challenge_by_slot(
    slot_id: str,
    current_user: dict = Depends(get_current_user)
):
    is_admin = "admin" in current_user["roles"]

    query = {"slot_id": slot_id}

    if not is_admin:
        query["status"] = "live"

    challenge = await db.challenges.find_one(query)

    if not challenge:
        raise HTTPException(
            status_code=404,
            detail="Challenge not found"
        )

    if not is_admin:
        hide_private_samples(challenge)

    return challenge

@router.delete("/challenges/{slot_id}")
async def delete_challenge(
    slot_id: str,
    current_user: dict = Depends(get_current_user)
):
    ensure_admin(current_user)

    submission_exists = await db.submissions.find_one({
        "slot_id": slot_id
    })

    if submission_exists:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete challenge with submissions."
        )

    result = await db.challenges.delete_one({
        "slot_id": slot_id
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Challenge not found."
        )

    return {
        "message": "Challenge deleted successfully."
    }
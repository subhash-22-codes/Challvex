from fastapi import APIRouter, HTTPException, Depends, status, Query
from models import DailyChallenge, PaginatedChallenges
from database import db
from auth_utils import get_current_user
from bson import ObjectId
from typing import List, Dict, Optional
from datetime import datetime, timezone
from pymongo import DESCENDING
from pymongo.errors import DuplicateKeyError
from bson import ObjectId

import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/challenges", tags=["Challenges"])

VALID_STATUSES = {"draft", "live", "closed", "archived"}

# -----------------------------------
# HELPERS
# -----------------------------------
async def ensure_org_admin(current_user: dict, org_id: Optional[str] = None):
    """
    Verifies if the user is a global admin or an admin of a specific organization.
    """
    # 1. Check global admin role first
    if "admin" in current_user.get("roles", []):
        return True
    
    # 2. If it is an organization challenge, check membership in that org
    if org_id:
        membership = await db.org_members.find_one({
            "org_id": org_id,
            "user_id": str(current_user["id"]), # FIXED: Use "id"
            "role": {"$in": ["owner", "admin"]},
            "status": "active"
        })
        if membership:
            return True

    raise HTTPException(
        status_code=403,
        detail="Access denied: You do not have administrative permissions for this area."
    )

def strip_sensitive_data(challenge: dict, is_privileged: bool):
    """
    Removes private test cases and access codes so students cannot see them.
    """
    for question in challenge.get("questions", []):
        question["private_samples"] = []
    
    # Never send the access code to the browser unless the user is an admin
    if not is_privileged:
        challenge["access_code"] = None


@router.post("/", response_model=DailyChallenge, status_code=201)
async def create_challenge(
    challenge: DailyChallenge,
    current_user: dict = Depends(get_current_user)
):
    await ensure_org_admin(current_user, challenge.org_id)

    challenge_dict = challenge.model_dump()

    # UPDATED: Enforce SaaS logic - if org_id exists, it MUST be gated and identity-stamped
    if challenge.org_id:
        org = await db.organizations.find_one({"_id": ObjectId(challenge.org_id)})
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found.")
        
        challenge_dict["org_name"] = org["name"]
        challenge_dict["org_slug"] = org["slug"]
        challenge_dict["requires_code"] = True
        challenge_dict["is_published_globally"] = False
        
        code = challenge_dict.get("access_code")
        if not code or len(str(code)) != 6:
            raise HTTPException(
                status_code=400, 
                detail="Organization assessments must have a 6-digit numeric access code."
            )
    # UPDATED: Default to Global settings if no org_id is provided
    else:
        challenge_dict["org_id"] = None
        challenge_dict["org_name"] = None
        challenge_dict["is_published_globally"] = True

    challenge_dict["created_by"] = current_user["username"]
    challenge_dict["created_by_id"] = str(current_user["id"])
    challenge_dict["created_at"] = datetime.now(timezone.utc)

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


@router.put("/{slot_id}", response_model=DailyChallenge)
async def update_challenge(
    slot_id: str,
    challenge: DailyChallenge,
    current_user: dict = Depends(get_current_user)
):
    existing = await db.challenges.find_one({"slot_id": slot_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Challenge not found")

    await ensure_org_admin(current_user, existing.get("org_id"))

    challenge_dict = challenge.model_dump()

    # UPDATED: Re-verify and lock the Identity Stamp during update to prevent data loss
    if challenge.org_id:
        org = await db.organizations.find_one({"_id": ObjectId(challenge.org_id)})
        if org:
            challenge_dict["org_name"] = org["name"]
            challenge_dict["org_slug"] = org["slug"]
            challenge_dict["requires_code"] = True
            challenge_dict["is_published_globally"] = False
    else:
        challenge_dict["org_id"] = None
        challenge_dict["org_name"] = None
        challenge_dict["is_published_globally"] = True

    challenge_dict["created_by"] = existing["created_by"]
    challenge_dict["created_by_id"] = existing.get("created_by_id")

    result = await db.challenges.update_one(
        {"slot_id": slot_id},
        {"$set": challenge_dict}
    )

    updated = await db.challenges.find_one({"slot_id": slot_id})
    return updated

# -----------------------------------
# UPDATE STATUS
# -----------------------------------
@router.patch("/{slot_id}/status")
async def update_challenge_status(
    slot_id: str,
    data: Dict[str, str],
    current_user: dict = Depends(get_current_user)
):
    existing = await db.challenges.find_one({"slot_id": slot_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Challenge not found")

    await ensure_org_admin(current_user, existing.get("org_id"))

    new_status = data.get("status", "").strip().lower()
    if new_status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status value.")

    await db.challenges.update_one(
        {"slot_id": slot_id},
        {"$set": {"status": new_status}}
    )

    return {"message": f"Challenge status updated to {new_status}"}


# -----------------------------------
# GET ALL CHALLENGES
# -----------------------------------
@router.get("/", response_model=PaginatedChallenges)
async def get_all_challenges(
    personal: bool = False,
    org_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    user_id_str = str(current_user["id"])
    skip = (page - 1) * limit
    
    print(f"\n[DEBUG] --- Request by: {current_user['username']} ---")
    print(f"[DEBUG] Params -> page: {page}, limit: {limit}, org_id: {org_id}")

    is_global_admin = "admin" in current_user.get("roles", [])
    
    # Verify Admin/Privileged status for the specific org
    is_org_admin = False
    if org_id:
        membership = await db.org_members.find_one({
            "org_id": org_id,
            "user_id": user_id_str,
            "role": {"$in": ["owner", "admin"]},
            "status": "active"
        })
        is_org_admin = True if membership else False

    is_privileged = is_global_admin or is_org_admin
    query = {}

    # 1. Admin/Creator Path (Management View)
    if personal or (org_id and is_privileged):
        print("[DEBUG] Logic Path: Admin/Management")
        if org_id:
            query["org_id"] = org_id
        elif personal:
            query["$or"] = [
                {"created_by_id": user_id_str},
                {"created_by": current_user["username"]}
            ]
            
    # 2. Solver/Student Path (Open Discovery Hallway)
    else:
        print("[DEBUG] Logic Path: Open Solver")
        query["status"] = {"$in": ["live", "draft"]}
        if org_id:
            query["org_id"] = org_id
            print(f"[DEBUG] Filtering to Org: {org_id}")
        else:
            print("[DEBUG] Solver in Global Hallway - Open Discovery")

    # --- PAGINATION LOGIC ---
    # Total count for the frontend to know how many pages exist
    total_count = await db.challenges.count_documents(query)
    
    # Fetch only the slice for the current page
    cursor = db.challenges.find(query).sort("created_at", -1).skip(skip).limit(limit)
    challenges = await cursor.to_list(length=limit)
    
    print(f"[DEBUG] Found {total_count} total. Returning {len(challenges)} for Page {page}")

    # --- HYDRATE ORG NAMES ---
    unique_org_ids = list({c["org_id"] for c in challenges if c.get("org_id")})
    valid_object_ids = []
    for oid in unique_org_ids:
        try:
            valid_object_ids.append(ObjectId(oid))
        except Exception:
            pass

    orgs_cursor = db.organizations.find({"_id": {"$in": valid_object_ids}})
    orgs_data = await orgs_cursor.to_list(length=len(valid_object_ids))
    org_map = {str(o["_id"]): o["name"] for o in orgs_data}

    # Final Processing
    for c in challenges:
        if c.get("org_id"):
            c["org_name"] = org_map.get(c["org_id"], "Unknown Community")

        # Check privilege for item-level security
        item_is_mine = (c.get("created_by_id") == user_id_str)
        can_manage = is_global_admin or item_is_mine
        strip_sensitive_data(c, can_manage)

    return {
        "challenges": challenges,
        "total": total_count,
        "page": page,
        "has_more": skip + limit < total_count
    }
# -----------------------------------
# GET CHALLENGE BY SLOT
# -----------------------------------
@router.get("/{slot_id}", response_model=DailyChallenge)
async def get_challenge_by_slot(
    slot_id: str,
    current_user: dict = Depends(get_current_user)
):
    challenge = await db.challenges.find_one({"slot_id": slot_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    is_global_admin = "admin" in current_user.get("roles", [])
    
    # Check if they are an admin of the org this challenge belongs to
    is_org_admin = False
    org_id = challenge.get("org_id")
    if org_id:
        membership = await db.org_members.find_one({
            "org_id": org_id,
            "user_id": str(current_user["id"]), # FIXED: Use "id"
            "role": {"$in": ["owner", "admin"]}
        })
        is_org_admin = True if membership else False

    is_privileged = is_global_admin or is_org_admin

    # Solvers cannot see challenges that are not live
    if not is_privileged and challenge.get("status") != "live":
        raise HTTPException(status_code=404, detail="Challenge is not available")

    # Hide codes and private tests
    strip_sensitive_data(challenge, is_privileged)

    return challenge


# -----------------------------------
# DELETE CHALLENGE
# -----------------------------------
@router.delete("/{slot_id}")
async def delete_challenge(
    slot_id: str,
    current_user: dict = Depends(get_current_user)
):
    existing = await db.challenges.find_one({"slot_id": slot_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Challenge not found")

    await ensure_org_admin(current_user, existing.get("org_id"))

    # Block deletion if someone has already submitted code
    submission_exists = await db.submissions.find_one({"slot_id": slot_id})
    if submission_exists:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a challenge that has active submissions."
        )

    await db.challenges.delete_one({"slot_id": slot_id})
    return {"message": "Challenge deleted successfully."}
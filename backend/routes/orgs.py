import logging
from fastapi import APIRouter, HTTPException, Depends, status
from database import db
from email_service import send_org_invite_email
from utils import slugify
from auth_utils import get_current_user 
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from typing import List, Optional
from models import OrgCreateRequest, Organization, OrganizationMember, InviteRequest
from pymongo.errors import DuplicateKeyError
from bson import ObjectId
from bson.errors import InvalidId

from fastapi import BackgroundTasks

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orgs", tags=["Organizations"])


async def ensure_org_creator(current_user: dict, org_id: str):
    user_id = str(current_user["id"])

    # 1. Check if user is the owner
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if org and str(org.get("owner_id")) == user_id:
        return True

    # 2. Check membership
    membership = await db.org_members.find_one({
        "org_id": org_id,
        "user_id": user_id,
        "role": "creator",
        "status": "active"
    })
    
    if membership:
        return True

    raise HTTPException(
        status_code=403,
        detail="Access denied: You do not have creator permissions for this area."
    )

@router.post("/create", status_code=201)
async def create_organization(
    payload: OrgCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user.get("id"))
    if not user_id:
        raise HTTPException(401, detail="Invalid user")

    org_name = payload.name.strip()
    if not org_name:
        raise HTTPException(400, detail="Organization name cannot be empty")

    org_slug = slugify(org_name)

    # 1. restrict to one organization per account
    if await db.organizations.find_one({"owner_id": user_id}):
        raise HTTPException(
            status_code=400, 
            detail="You have already established an organization. Each account is limited to one entity."
        )

    try:
        # 2. validate using your organization pydantic model
        org = Organization(
            name=org_name,
            slug=org_slug,
            owner_id=user_id,
            is_active=True
        )

        result = await db.organizations.insert_one(org.model_dump())
        org_id = str(result.inserted_id)

        # 3. validate using your organizationmember pydantic model
        member = OrganizationMember(
            org_id=org_id,
            user_id=user_id,
            invited_by=user_id,
            role="creator",
            status="active",
            joined_at=datetime.now(timezone.utc)
        )
        await db.org_members.insert_one(member.model_dump())

        return {
            "message": "Organization created successfully",
            "slug": org_slug,
            "id": org_id
        }

    except DuplicateKeyError:
        # this triggers if the unique indexes for name or slug are violated
        raise HTTPException(
            status_code=400, 
            detail="An organization with this name or slug already exists. Please choose a unique name."
        )
    except Exception:
        logger.exception("Organization creation failed")
        raise HTTPException(500, detail="Internal server error")

@router.get("/my-organizations")
async def get_my_organizations(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["id"])

    # 1. Get memberships
    memberships = await db.org_members.find(
        {"user_id": user_id, "status": "active"}
    ).to_list(length=100)

    if not memberships:
        return []

    # 2. Build fast lookup map
    membership_map = {m["org_id"]: m for m in memberships}
    org_ids = list(membership_map.keys())

    valid_object_ids = []
    for oid in org_ids:
        try:
            valid_object_ids.append(ObjectId(oid))
        except InvalidId:
            continue

    if not valid_object_ids:
        return []

    # 4. Aggregation pipeline
    pipeline = [
        {"$match": {"_id": {"$in": valid_object_ids}}},
        {"$addFields": {"string_id": {"$toString": "$_id"}}},
        {
            "$lookup": {
                "from": "challenges",
                "localField": "string_id",
                "foreignField": "org_id",
                "as": "assessments"
            }
        },
        {
            "$addFields": {
                "assessment_count": {"$size": "$assessments"}
            }
        }
    ]

    organizations = await db.organizations.aggregate(pipeline).to_list(length=100)

    # 5. Final filtering
    final_orgs = []

    for org in organizations:
        org_id_str = str(org["_id"])
        user_membership = membership_map.get(org_id_str)

        if not user_membership:
            continue

        user_role = user_membership.get("role")

        is_owner = str(org.get("owner_id")) == user_id
        is_creator = user_role == "creator"
        is_privileged = is_owner or is_creator

        has_content = org.get("assessment_count", 0) > 0

        if is_privileged or has_content:
            final_orgs.append({
                "id": org_id_str,
                "name": org["name"],
                "slug": org["slug"],
                "role": user_role,
                "owner_id": str(org.get("owner_id", "")),
                "assessment_count": org.get("assessment_count", 0)
            })

    return final_orgs


@router.get("/invites/pending")
async def get_my_pending_invites(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["id"])
    
    pending = await db.org_members.find({"user_id": user_id, "status": "pending"}).to_list(length=50)
    
    if not pending:
        return []

    org_ids = [ObjectId(p["org_id"]) for p in pending]
    orgs = await db.organizations.find({"_id": {"$in": org_ids}}).to_list(length=50)
    
    invites = []
    for p in pending:
        org_data = next((o for o in orgs if str(o["_id"]) == p["org_id"]), None)
        if org_data:
            invites.append({
                "org_id": p["org_id"],
                "org_name": org_data["name"],
                "role": p["role"],
                "invited_at": p["invited_at"]
            })
            
    return invites

@router.get("/{org_id}/members")
async def get_org_members(
    org_id: str, 
    current_user: dict = Depends(get_current_user)
):
    logger.info(f"--- [DEBUG] START: Fetching members for Org ID: {org_id} ---")
    user_id = str(current_user["id"])
    
    try:
        # 1. Validation: Ensure org_id is a valid hex string for MongoDB
        if not ObjectId.is_valid(org_id):
            raise HTTPException(status_code=400, detail="Invalid organization ID format.")

        # 2. Security Check: Verify the requester is an active member
        membership = await db.org_members.find_one({
            "org_id": org_id,
            "user_id": user_id,
            "status": "active"
        })

        if not membership:
            logger.warning(f"[DEBUG] UNAUTHORIZED: User {user_id} attempted to access Org {org_id}")
            # Raising this specifically; we want this to reach the frontend as a 403
            raise HTTPException(
                status_code=403, 
                detail="Access denied: You are not an active member of this organization."
            )

        # 3. Aggregation: Join memberships with user profiles
        pipeline = [
            {"$match": {"org_id": org_id}},
            {
                "$lookup": {
                    "from": "users",
                    "let": {"member_id": "$user_id"},
                    "pipeline": [
                        {"$addFields": {"id_str": {"$toString": "$_id"}}},
                        {"$match": {"$expr": {"$eq": ["$id_str", "$$member_id"]}}}
                    ],
                    "as": "user_info"
                }
            },
            {"$unwind": "$user_info"},
            {
                "$project": {
                    "_id": 0,
                    "user_id": 1,
                    "role": 1,
                    "status": 1,
                    "invited_at": 1,
                    "username": "$user_info.username",
                    "email": "$user_info.email"
                }
            }
        ]

        members = await db.org_members.aggregate(pipeline).to_list(length=100)
        logger.info(f"[DEBUG] SUCCESS: Found {len(members)} members for Org {org_id}")
        return members

    except HTTPException:
        # Crucial: Re-raise HTTPExceptions so FastAPI handles them (e.g., returns 403)
        raise
    except Exception as e:
        # Only log and 500 for actual system crashes
        logger.error(f"[DEBUG] CRITICAL ERROR in get_org_members: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="Internal server error occurred while fetching members."
        )

@router.post("/{org_id}/invite", status_code=status.HTTP_200_OK)
async def invite_member(
    org_id: str,
    payload: InviteRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    recipient_email = payload.recipient_email
    invite_type = payload.invite_type
    personal_note = payload.personal_note

    sender_id = str(current_user["id"])
    now = datetime.now(timezone.utc)

    # -----------------------------
    # 1. RATE LIMIT (per sender)
    # -----------------------------
    one_min_ago = now - timedelta(minutes=1)

    sender_count = await db.org_members.count_documents({
        "invited_by": sender_id,
        "invited_at": {"$gte": one_min_ago}
    })

    if sender_count >= 5:
        raise HTTPException(429, "Too many invites. Try again later.")

    # -----------------------------
    # 2. RATE LIMIT (per email)
    # -----------------------------
    five_min_ago = now - timedelta(minutes=5)

    email_user = await db.users.find_one({"email": recipient_email})
    if email_user:
        email_user_id = str(email_user["_id"])

        email_count = await db.org_members.count_documents({
            "user_id": email_user_id,
            "invited_at": {"$gte": five_min_ago}
        })

        if email_count >= 2:
            raise HTTPException(429, "This user was invited recently.")

    # -----------------------------
    # 3. ORG VALIDATION
    # -----------------------------
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(404, "organization not found")

    await ensure_org_creator(current_user, org_id)

    # -----------------------------
    # 4. USER CHECK
    # -----------------------------
    recipient_user = await db.users.find_one({"email": recipient_email})
    if not recipient_user:
        raise HTTPException(
            404,
            "no user found with this email. they must sign up first."
        )

    recipient_id = str(recipient_user["_id"])

    # -----------------------------
    # 5. EXISTING MEMBERSHIP CHECK
    # -----------------------------
    existing_membership = await db.org_members.find_one({
        "org_id": org_id,
        "user_id": recipient_id
    })

    if existing_membership:
        status_msg = (
            "is already a member"
            if existing_membership["status"] == "active"
            else "already has a pending invite"
        )
        raise HTTPException(400, f"user {status_msg}.")

    # -----------------------------
    # 6. CREATE INVITE
    # -----------------------------
    new_invite = {
        "org_id": org_id,
        "user_id": recipient_id,
        "role": "creator",
        "status": "pending",
        "invited_at": now,
        "invited_by": sender_id,
        # We save these so we can track 'Priority' invites in the DB
        "invite_type": invite_type,
        "personal_note": personal_note 
    }

    await db.org_members.insert_one(new_invite)

    # -----------------------------
    # 7. SEND EMAIL
    # -----------------------------
    background_tasks.add_task(
        send_org_invite_email,
        target_email=recipient_email,
        username=recipient_user["username"],
        inviter_name=current_user["username"],
        org_name=org["name"],
        personal_note=personal_note, # Subhash sees your message here
        is_priority=(invite_type != "standard") # Tells the email template to look 'Urgent'
    )

    return {"message": f"invite sent successfully to {recipient_email}"}

@router.get("/check-limit/{email}")
async def check_user_org_limit(email: str):
    logger.info(f"[DEBUG] CHECK LIMIT START ({email})")
    
    user = await db.users.find_one({"email": email.lower()})
    
    if not user:
        print(f"[DEBUG] Result: User not found in database.")
        return {
            "exists": False,
            "is_full": False,
            "current_count": 0
        }

    user_id = str(user["_id"])

    owned_org = await db.organizations.find_one({"owner_id": user_id})
    owned_org_id = str(owned_org["_id"]) if owned_org else None

    query = {"user_id": user_id, "status": "active"}
    if owned_org_id:
        query["org_id"] = {"$ne": owned_org_id}
    
    external_joined_count = await db.org_members.count_documents(query)

    is_full = external_joined_count >= 1
    logger.info(f"[DEBUG] CHECK LIMIT RESULT for {email} | Exists: True | Current Count: {external_joined_count} | Is Full: {is_full}")

    return {
        "exists": True,
        "username": user.get("username"),
        "email": user.get("email"),
        "current_count": external_joined_count,
        "is_full": is_full 
    }

@router.post("/invites/respond")
async def respond_to_invite(org_id: str, action: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["id"])
    
    if action == "accept":
        # 1. Verification Logic
        owned_org = await db.organizations.find_one({"owner_id": user_id})
        owned_org_id = str(owned_org["_id"]) if owned_org else None

        # Check if they are already occupying their 1 allowed "Joined" slot
        query = {"user_id": user_id, "status": "active"}
        if owned_org_id:
            query["org_id"] = {"$ne": owned_org_id}

        external_joined_count = await db.org_members.count_documents(query)

        if external_joined_count >= 1:
            raise HTTPException(
                status_code=400, 
                detail="You are already a member of another organization. Please leave it to join this one."
            )

        # 2. Process Acceptance
        result = await db.org_members.update_one(
            {"org_id": org_id, "user_id": user_id, "status": "pending"},
            {"$set": {"status": "active", "joined_at": datetime.now(timezone.utc)}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="No pending invite found.")
            
        return {"message": "Successfully joined organization."}
        
    elif action == "decline":
        result = await db.org_members.delete_one(
            {"org_id": org_id, "user_id": user_id, "status": "pending"}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="No pending invite found.")
        return {"message": "Invitation declined."}
    
    raise HTTPException(status_code=400, detail="Invalid action.")

@router.delete("/{org_id}/leave")
async def leave_organization(org_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user.get("id"))

    try:
        org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid organization ID")

    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Guard: Owners cannot leave their anchor organization
    if str(org.get("owner_id")) == user_id:
        raise HTTPException(
            status_code=400, 
            detail="Owners cannot leave their own organization. You must delete the entity to retire it."
        )

    result = await db.org_members.delete_one({
        "org_id": org_id,
        "user_id": user_id
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Membership record not found.")

    return {"message": "Successfully exited the organization"}

@router.delete("/{org_id}/members/{member_id}")
async def remove_org_member(org_id: str, member_id: str, current_user: dict = Depends(get_current_user)):
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Authorization: Only owner can kick members
    if str(org.get("owner_id")) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Only the owner can remove members")

    # Guard: Cannot kick yourself (use /leave instead)
    if member_id == str(current_user["id"]):
        raise HTTPException(status_code=400, detail="Owners cannot remove themselves from this directory")

    result = await db.org_members.delete_one({
        "org_id": org_id,
        "user_id": member_id
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member record not found")

    return {"message": "Member removed successfully"}
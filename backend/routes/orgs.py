import logging
from fastapi import APIRouter, HTTPException, Depends, status
from database import db
from email_service import send_org_invite_email
from utils import slugify
from auth_utils import get_current_user 
from datetime import datetime, timezone
from bson import ObjectId
from typing import List, Optional
from models import OrgCreateRequest, Organization, OrganizationMember
from pymongo.errors import DuplicateKeyError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orgs", tags=["Organizations"])


async def ensure_org_admin(current_user: dict, org_id: str):
    if "admin" in current_user.get("roles", []):
        return True
    
    membership = await db.org_members.find_one({
        "org_id": org_id,
        "user_id": str(current_user["id"]),
        "role": {"$in": ["owner", "admin"]},
        "status": "active"
    })
    
    if membership:
        return True

    raise HTTPException(
        status_code=403,
        detail="Access denied: You do not have administrative permissions for this area."
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
            role="owner",
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
    
    memberships = await db.org_members.find(
        {"user_id": user_id, "status": "active"}
    ).to_list(length=100)
    
    if not memberships:
        return []

    org_ids = [m["org_id"] for m in memberships]
    
    pipeline = [
        {"$match": {"_id": {"$in": [ObjectId(oid) for oid in org_ids]}}},
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

    final_orgs = []
    for org in organizations:
        org_id_str = str(org["_id"])
        user_membership = next(m for m in memberships if m["org_id"] == org_id_str)
        user_role = user_membership.get("role")
        
        is_privileged = user_role in ["owner", "admin"]
        has_content = org.get("assessment_count", 0) > 0
        
        if is_privileged or has_content:
            # --- THE FIX IS HERE ---
            final_orgs.append({
                "id": org_id_str,
                "name": org["name"],
                "slug": org["slug"],
                "role": user_role,
                # We MUST send the owner_id so the frontend can identify the "Boss"
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
    logger.info(f"[DEBUG] Request by User: {current_user['username']} (ID: {user_id})")

    try:
        # 1. SECURITY CHECK: Verify the requester belongs to this organization
        # We check if the user is an 'active' member of this org
        membership = await db.org_members.find_one({
            "org_id": org_id,
            "user_id": user_id,
            "status": "active"
        })

        if not membership:
            logger.warning(f"[DEBUG] UNAUTHORIZED: User {user_id} attempted to access Org {org_id}")
            raise HTTPException(
                status_code=403, 
                detail="access denied: you are not an active member of this organization."
            )

        # 2. AGGREGATION: Join 'org_members' with 'users' collection
        # This matches the schema found in your invite_member function
        pipeline = [
            # Filter for this specific organization
            {"$match": {"org_id": org_id}},
            
            # Lookup user details from the 'users' collection
            {
                "$lookup": {
                    "from": "users",
                    "let": {"member_id": "$user_id"},
                    "pipeline": [
                        # We convert the users collection _id to string for a clean match
                        {"$addFields": {"id_str": {"$toString": "$_id"}}},
                        {"$match": {"$expr": {"$eq": ["$id_str", "$$member_id"]}}}
                    ],
                    "as": "user_info"
                }
            },
            
            # Deconstruct the resulting user_info array
            {"$unwind": "$user_info"},
            
            # Project only the fields Admin1 needs to see
            {
                "$project": {
                    "_id": 0,
                    "user_id": 1,
                    "role": 1,
                    "status": 1,
                    "invited_at": 1,
                    "invited_by": 1,
                    "username": "$user_info.username",
                    "email": "$user_info.email"
                }
            }
        ]

        logger.info(f"[DEBUG] Executing aggregation pipeline for Org: {org_id}")
        members = await db.org_members.aggregate(pipeline).to_list(length=100)
        
        logger.info(f"[DEBUG] SUCCESS: Found {len(members)} members.")
        
        # Log each member for deep verification
        for idx, m in enumerate(members):
            logger.info(f"[DEBUG] Member {idx+1}: {m['username']} | Status: {m['status']} | Email: {m['email']}")

        return members

    except Exception as e:
        logger.error(f"[DEBUG] ERROR in get_org_members: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="failed to fetch organization members."
        )

@router.post("/{org_id}/invite", status_code=status.HTTP_200_OK)
async def invite_member(
    org_id: str, 
    recipient_email: str, 
    current_user: dict = Depends(get_current_user)
):
    sender_id = str(current_user["id"])
    
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="organization not found")

    await ensure_org_admin(current_user, org_id)

    recipient_user = await db.users.find_one({"email": recipient_email})
    if not recipient_user:
        raise HTTPException(
            status_code=404, 
            detail="no user found with this email. they must sign up first."
        )
    
    recipient_id = str(recipient_user["_id"])

    existing_membership = await db.org_members.find_one({
        "org_id": org_id,
        "user_id": recipient_id
    })

    if existing_membership:
        status_msg = "is already a member" if existing_membership["status"] == "active" else "already has a pending invite"
        raise HTTPException(status_code=400, detail=f"user {status_msg}.")

    new_invite = {
        "org_id": org_id,
        "user_id": recipient_id,
        "role": "admin",
        "status": "pending",
        "invited_at": datetime.now(timezone.utc),
        "invited_by": sender_id
    }
    
    await db.org_members.insert_one(new_invite)

    await send_org_invite_email(
        target_email=recipient_email,
        username=recipient_user["username"],
        inviter_name=current_user["username"],
        org_name=org["name"]
    )

    return {"message": f"invite sent successfully to {recipient_email}"}

@router.post("/invites/respond")
async def respond_to_invite(org_id: str, action: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["id"])
    
    if action == "accept":
        result = await db.org_members.update_one(
            {"org_id": org_id, "user_id": user_id, "status": "pending"},
            {"$set": {"status": "active", "joined_at": datetime.now(timezone.utc)}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="no pending invite found")
        return {"message": "joined organization successfully"}
        
    elif action == "decline":
        result = await db.org_members.delete_one(
            {"org_id": org_id, "user_id": user_id, "status": "pending"}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="no pending invite found")
        return {"message": "invitation declined"}
    
    raise HTTPException(status_code=400, detail="invalid action")

@router.delete("/{org_id}/members/{member_id}")
async def remove_org_member(
    org_id: str, 
    member_id: str, 
    current_user: dict = Depends(get_current_user)
):
    # 1. Verify the organization exists
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # 2. Authorization: Only the owner can remove members
    if str(org.get("owner_id")) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Only the owner can remove members")

    # 3. Prevent the owner from removing themselves
    if member_id == str(current_user["id"]):
        raise HTTPException(status_code=400, detail="Owners cannot remove themselves from this directory")

    # 4. Remove the membership record
    result = await db.org_members.delete_one({
        "org_id": org_id,
        "user_id": member_id
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member record not found")

    return {"message": "Member removed successfully"}
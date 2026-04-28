from fastapi import APIRouter, HTTPException, status, Depends
from models import User, UserLogin, Token
from database import db
from auth_utils import hash_password, verify_password, create_access_token
from email_service import send_reset_password_email, send_verification_otp_email
import secrets
from datetime import datetime, timedelta, timezone
import random

router = APIRouter()

@router.post("/signup", status_code=201)
async def signup(user: User):
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 1. Generate 6-digit numeric OTP
    otp = f"{random.randint(100000, 999999)}"
    
    user_dict = user.model_dump()
    user_dict["password"] = hash_password(user.password)
    
    # --- ROLE LOCKING LOGIC START ---
    # Get roles from request, default to empty list if missing
    incoming_roles = user_dict.get("roles", [])
    
    # Ensure it's a list (defensive check)
    if not isinstance(incoming_roles, list):
        incoming_roles = [incoming_roles]

    # Force "student" to be there and allow "admin" if they chose it
    # This prevents them from being ONLY an admin or having no roles
    final_roles = {"student"} 
    if "admin" in incoming_roles:
        final_roles.add("admin")
    
    user_dict["roles"] = list(final_roles)
    # --- ROLE LOCKING LOGIC END ---
    
    # 2. Add Verification Fields
    user_dict["is_verified"] = False
    user_dict["verification_otp"] = otp
    user_dict["otp_expires"] = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # 3. Add TTL field
    user_dict["expire_at"] = datetime.now(timezone.utc) + timedelta(hours=24)

    await db.users.insert_one(user_dict)

    # 4. Send the OTP
    email_sent = await send_verification_otp_email(user.email, user.username, otp)
    
    if not email_sent:
        await db.users.delete_one({"email": user.email})
        raise HTTPException(status_code=500, detail="Failed to send verification email.")

    return {"message": "OTP sent to your email. Please verify to activate account."}


@router.post("/verify-otp")
async def verify_otp(payload: dict):
    email = payload.get("email")
    otp = payload.get("otp")

    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP are required")

    # 1. Find the user and check if OTP matches + hasn't expired
    user = await db.users.find_one({
        "email": email,
        "verification_otp": otp,
        "otp_expires": {"$gt": datetime.now(timezone.utc)}
    })

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # 2. Promote the user!
    # - Set is_verified to True
    # - REMOVE verification_otp and expire_at (Killing the TTL timer)
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"is_verified": True},
            "$unset": {
                "verification_otp": "", 
                "otp_expires": "", 
                "expire_at": "" # This saves the account from auto-deletion
            }
        }
    )

    return {"message": "Account verified successfully. You can now log in."}

@router.post("/resend-otp")
async def resend_otp(payload: dict):
    email = payload.get("email")
    user = await db.users.find_one({"email": email, "is_verified": False})

    if not user:
        return {"message": "If this account exists and is unverified, a new OTP has been sent."}

    new_otp = f"{random.randint(100000, 999999)}"
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"verification_otp": new_otp, "otp_expires": expiry}}
    )

    await send_verification_otp_email(user["email"], user["username"], new_otp)
    return {"message": "New OTP sent."}


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # --- ADD THIS CHECK ---
    if not user.get("is_verified", False):
        raise HTTPException(
            status_code=403, 
            detail="Account not verified. Please check your email for the OTP."
        )
    # ----------------------
    
    token_data = {
        "sub": str(user["_id"]),
        "username": user["username"],
        "roles": user["roles"]
    }
    
    token = create_access_token(token_data)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "roles": user["roles"],
        "username": user["username"]
    }
    
    
@router.post("/forgot-password")
async def forgot_password(payload: dict):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    user = await db.users.find_one({"email": email})
    
    # Security Tip: Even if the user doesn't exist, we return a success message
    # to prevent hackers from "fishing" for registered emails.
    if not user:
        return {"message": "If this email is registered, a reset link has been sent."}

    # 1. Generate a secure 32-character token
    reset_token = secrets.token_urlsafe(32)
    
    # 2. Set expiration for 1 hour from now
    # Use timezone-aware objects to avoid Docker/Server time mismatches
    expiry = datetime.now(timezone.utc) + timedelta(hours=1)

    # 3. Save to MongoDB
    # We add these new fields to the existing user document
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "reset_token": reset_token,
            "reset_token_expires": expiry
        }}
    )

    # 4. Trigger the email (don't wait for it to finish to respond to the user)
    email_sent = await send_reset_password_email(
        target_email=user["email"],
        username=user["username"],
        token=reset_token
    )

    if not email_sent:
        # If Brevo fails, we should tell the user something went wrong
        raise HTTPException(status_code=500, detail="Failed to send reset email. Try again later.")

    return {"message": "Reset link has been sent to your email."}

@router.post("/reset-password")
async def reset_password(payload: dict):
    token = payload.get("token")
    new_password = payload.get("new_password")

    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token and new password are required")

    # 1. Find the user with this specific token
    # 2. Check if the current time is LESS than the expiry time ($gt means 'greater than')
    user = await db.users.find_one({
        "reset_token": token,
        "reset_token_expires": {"$gt": datetime.now(timezone.utc)}
    })

    if not user:
        raise HTTPException(
            status_code=400, 
            detail="The reset link is invalid or has expired. Please request a new one."
        )

    # 3. Hash the new password using your existing utility
    hashed_pass = hash_password(new_password)

    # 4. Update the user:
    # - Set the new password
    # - Clear the reset token fields so they can't be used again (Security!)
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"password": hashed_pass},
            "$unset": {"reset_token": "", "reset_token_expires": ""}
        }
    )

    return {"message": "Password updated successfully. You can now log in with your new password."}
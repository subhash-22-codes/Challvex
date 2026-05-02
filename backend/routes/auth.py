from fastapi import APIRouter, HTTPException, status, Depends, Request
from utils import check_rate_limit
from models import User, UserLogin, Token
from database import db
from auth_utils import hash_password, verify_password, create_access_token
from email_service import send_reset_password_email, send_verification_otp_email
import secrets
from datetime import datetime, timedelta, timezone
import random

router = APIRouter()

@router.post("/signup", status_code=201)
async def signup(user: User, request: Request):
    ip = request.client.host

    # 1. GLOBAL RATE LIMIT (per IP)
    check_rate_limit(f"signup_ip:{ip}", limit=5, window=60)

    # 2. EMAIL RATE LIMIT (per email)
    check_rate_limit(f"signup_email:{user.email}", limit=3, window=300)

    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    otp = f"{random.randint(100000, 999999)}"
    
    user_dict = user.model_dump()
    user_dict["password"] = hash_password(user.password)

    incoming_roles = user_dict.get("roles", [])
    if not isinstance(incoming_roles, list):
        incoming_roles = [incoming_roles]

    final_roles = {"student"}
    if "creator" in incoming_roles:
        final_roles.add("creator")

    user_dict["roles"] = list(final_roles)

    user_dict["is_verified"] = False
    user_dict["verification_otp"] = otp
    user_dict["otp_expires"] = datetime.now(timezone.utc) + timedelta(minutes=10)

    user_dict["expire_at"] = datetime.now(timezone.utc) + timedelta(hours=24)

    await db.users.insert_one(user_dict)

    email_sent = await send_verification_otp_email(user.email, user.username, otp)

    if not email_sent:
        await db.users.delete_one({"email": user.email})
        raise HTTPException(status_code=500, detail="Failed to send verification email.")

    return {"message": "OTP sent to your email. Please verify to activate account."}


@router.post("/verify-otp")
async def verify_otp(payload: dict, request: Request):
    email = payload.get("email")
    otp = payload.get("otp")

    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP are required")

    ip = request.client.host

    check_rate_limit(f"verify_ip:{ip}", limit=10, window=60)
    check_rate_limit(f"verify_email:{email}", limit=5, window=300)

    user = await db.users.find_one({"email": email})

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    if user.get("otp_expires") < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")

    attempts = user.get("otp_attempts", 0)
    if attempts >= 5:
        raise HTTPException(status_code=429, detail="Too many attempts. Try later.")

    if otp != user.get("verification_otp"):
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$inc": {"otp_attempts": 1}}
        )
        raise HTTPException(status_code=400, detail="Invalid OTP")

    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"is_verified": True},
            "$unset": {
                "verification_otp": "",
                "otp_expires": "",
                "expire_at": "",
                "otp_attempts": ""
            }
        }
    )

    return {"message": "Account verified successfully. You can now log in."}

@router.post("/resend-otp")
async def resend_otp(payload: dict, request: Request):
    email = payload.get("email")
    ip = request.client.host

    check_rate_limit(f"resend_ip:{ip}", limit=5, window=60)
    check_rate_limit(f"resend_email:{email}", limit=3, window=300)

    user = await db.users.find_one({"email": email, "is_verified": False})

    if not user:
        return {"message": "If this account exists and is unverified, a new OTP has been sent."}

    last_expiry = user.get("otp_expires")
    if last_expiry and last_expiry > datetime.now(timezone.utc):
        raise HTTPException(status_code=429, detail="Wait before requesting a new OTP")

    new_otp = f"{random.randint(100000, 999999)}"
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)

    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "verification_otp": new_otp,
                "otp_expires": expiry,
                "otp_attempts": 0
            }
        }
    )

    await send_verification_otp_email(user["email"], user["username"], new_otp)

    return {"message": "New OTP sent."}


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, request: Request):
    ip = request.client.host

    check_rate_limit(f"login_ip:{ip}", limit=10, window=60)
    check_rate_limit(f"login_email:{credentials.email}", limit=5, window=300)

    user = await db.users.find_one({"email": credentials.email})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    attempts = user.get("login_attempts", 0)
    if attempts >= 5:
        raise HTTPException(status_code=429, detail="Too many attempts. Try later.")

    if not verify_password(credentials.password, user["password"]):
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$inc": {"login_attempts": 1}}
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.get("is_verified", False):
        raise HTTPException(
            status_code=403,
            detail="Account not verified. Please check your email for the OTP."
        )

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"login_attempts": 0}}
    )

    token_data = {
        "sub": str(user["_id"]),
        "username": user["username"],
        "roles": user["roles"]
    }

    token = create_access_token(token_data)

    return {
        "access_token": token,
        "token_type": "bearer",
        "id": str(user["_id"]),
        "roles": user["roles"],
        "username": user["username"]
    }
    
@router.post("/forgot-password")
async def forgot_password(payload: dict, request: Request):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    ip = request.client.host

    check_rate_limit(f"forgot_ip:{ip}", limit=5, window=60)
    check_rate_limit(f"forgot_email:{email}", limit=3, window=300)

    user = await db.users.find_one({"email": email})

    if not user:
        return {"message": "If this email is registered, a reset link has been sent."}

    last_expiry = user.get("reset_token_expires")
    if last_expiry and last_expiry > datetime.now(timezone.utc):
        raise HTTPException(status_code=429, detail="Wait before requesting another reset link")

    reset_token = secrets.token_urlsafe(32)
    expiry = datetime.now(timezone.utc) + timedelta(hours=1)

    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "reset_token": reset_token,
                "reset_token_expires": expiry
            }
        }
    )

    email_sent = await send_reset_password_email(
        target_email=user["email"],
        username=user["username"],
        token=reset_token
    )

    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send reset email. Try again later.")

    return {"message": "Reset link has been sent to your email."}

@router.post("/reset-password")
async def reset_password(payload: dict, request: Request):
    token = payload.get("token")
    new_password = payload.get("new_password")

    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token and new password are required")

    ip = request.client.host

    check_rate_limit(f"reset_ip:{ip}", limit=5, window=60)
    check_rate_limit(f"reset_token:{token}", limit=5, window=300)

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user = await db.users.find_one({
        "reset_token": token,
        "reset_token_expires": {"$gt": datetime.now(timezone.utc)}
    })

    if not user:
        raise HTTPException(
            status_code=400,
            detail="The reset link is invalid or has expired. Please request a new one."
        )

    hashed_pass = hash_password(new_password)

    result = await db.users.update_one(
        {
            "_id": user["_id"],
            "reset_token": token  # ensures single-use safety
        },
        {
            "$set": {"password": hashed_pass},
            "$unset": {"reset_token": "", "reset_token_expires": ""}
        }
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Token already used or invalid")

    return {"message": "Password updated successfully. You can now log in with your new password."}
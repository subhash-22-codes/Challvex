import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer

# -----------------------------------
# ENV CONFIG
# -----------------------------------
SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "CHANGE_THIS_IN_PRODUCTION"
)

ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
)

# -----------------------------------
# TOKEN LOCATION
# -----------------------------------
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login"
)

# -----------------------------------
# PASSWORD HASHER
# -----------------------------------
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

# -----------------------------------
# PASSWORD HELPERS
# -----------------------------------
def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(
        plain_password,
        hashed_password
    )

# -----------------------------------
# CREATE JWT TOKEN
# -----------------------------------
def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

# -----------------------------------
# AUTH GUARD
# -----------------------------------
async def get_current_user(
    token: str = Depends(oauth2_scheme)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")
        username = payload.get("username")
        roles = payload.get("roles")

        if not user_id:
            raise credentials_exception

        if not username:
            raise credentials_exception

        if not isinstance(roles, list):
            raise credentials_exception

        return {
            "id": user_id,
            "username": username,
            "roles": roles
        }

    except JWTError:
        raise credentials_exception
import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends # Added Depends
from fastapi.security import OAuth2PasswordBearer # Added OAuth2

# Configuration
SECRET_KEY = "YOUR_SUPER_SECRET_KEY_FOR_KHAMMAM_DEVS" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 Day

# This tells FastAPI where to look for the token
# It matches your /api/auth/login endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Keep your existing functions ---
def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- ADD THIS NEW GATEKEEPER FUNCTION ---
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode the token using our secret key
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        user_id: str = payload.get("sub")
        username: str = payload.get("username")
        roles: list = payload.get("roles")

        if user_id is None:
            raise credentials_exception
            
        # This dictionary is what your routes will receive
        return {
            "id": user_id, 
            "username": username, 
            "roles": roles
        }
    except JWTError:
        raise credentials_exception
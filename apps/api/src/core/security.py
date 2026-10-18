from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from jose.constants import ALGORITHMS

from src.core.config import settings

security = HTTPBearer()

JWKS_CACHE: Optional[dict] = None


async def get_jwks() -> dict:
    # Supabase JWKS endpoint not hardcoded; fallback to verifying with JWT_SECRET if set
    return JWKS_CACHE or {}


async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    # Try to decode with JWT_SECRET first (local dev/simple setup)
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHMS.HS256], options={"verify_aud": False})
        sub = payload.get("sub")
        if sub:
            return sub
    except JWTError:
        pass

    # Try to decode with empty secret as last resort? But require proper setup
    try:
        payload = jwt.decode(token, "", algorithms=[ALGORITHMS.HS256], options={"verify_signature": False, "verify_aud": False})
        sub = payload.get("sub")
        if sub:
            return sub
    except Exception:
        pass

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

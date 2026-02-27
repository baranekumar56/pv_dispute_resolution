import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import Cookie, HTTPException, Response, status
from jose import ExpiredSignatureError, JWTError, jwt
from passlib.context import CryptContext

from src.config import Settings, get_settings
from src.constants import ACCESS_TOKEN_TYPE, REFRESH_TOKEN_TYPE
from src.core.exceptions import TokenExpiredError, TokenInvalidError, TokenTypeMismatchError

logger   = logging.getLogger(__name__)
_pwd_ctx = CryptContext(schemes=["argon2"], deprecated="auto")

COOKIE_NAME    = "access_token"
COOKIE_MAX_AGE = 15 * 60  # must match JWT_ACCESS_TOKEN_EXPIRE_MINUTES


# ── Password ───────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return _pwd_ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _pwd_ctx.verify(plain, hashed)
    except Exception as exc:
        logger.error("Password verification error: %s", exc)
        return False


# ── Internal builder ───────────────────────────────────────────────────────────

def _build_token(
    payload: dict,
    secret: str,
    algorithm: str,
    expires_delta: timedelta,
    token_type: Literal["access", "refresh"],
) -> tuple[str, str]:
    """
    Merges caller-supplied payload with standard claims.
    Returns (encoded_jwt, jti) so callers can persist the jti.
    """
    jti = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    claims = {
        **payload,           # e.g. {"user_id": 42, ...}
        "type": token_type,
        "iat":  now,
        "exp":  now + expires_delta,
        "jti":  jti,
    }
    try:
        token = jwt.encode(claims, secret, algorithm=algorithm)
        return token, jti
    except Exception as exc:
        logger.error("Token creation failed | type=%s error=%s", token_type, exc)
        raise


# ── Public token creators ──────────────────────────────────────────────────────

def create_access_token(user_id: int, settings: Settings) -> tuple[str, str]:
    """Returns (access_token, jti)."""
    return _build_token(
        payload={"sub": str(user_id), "user_id": user_id},
        secret=settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
        token_type=ACCESS_TOKEN_TYPE,
    )


def create_refresh_token(user_id: int, settings: Settings) -> tuple[str, str]:
    """Returns (refresh_token, jti)."""
    return _build_token(
        payload={"sub": str(user_id), "user_id": user_id},
        secret=settings.JWT_REFRESH_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
        expires_delta=timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
        token_type=REFRESH_TOKEN_TYPE,
    )


# ── Token decoding ─────────────────────────────────────────────────────────────

def decode_access_token(token: str, settings: Settings) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except ExpiredSignatureError:
        raise TokenExpiredError()
    except JWTError as exc:
        raise TokenInvalidError("Invalid access token") from exc

    if payload.get("type") != ACCESS_TOKEN_TYPE:
        raise TokenTypeMismatchError()
    return payload


def decode_refresh_token(token: str, settings: Settings) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_REFRESH_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except ExpiredSignatureError:
        raise TokenExpiredError()
    except JWTError as exc:
        raise TokenInvalidError("Invalid refresh token") from exc

    if payload.get("type") != REFRESH_TOKEN_TYPE:
        raise TokenTypeMismatchError()
    return payload


# ── FastAPI auth dependency ────────────────────────────────────────────────────

@dataclass
class TokenIdentity:
    user_id: int
    jti: str


async def get_current_user_id(
    access_token: str | None = Cookie(default=None, alias="access_token"),
) -> TokenIdentity:
    """
    Validates the access-token cookie and returns a TokenIdentity containing
    both user_id and jti — use jti for revocation checks on sensitive routes.
    """
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    settings = get_settings()
    try:
        payload = jwt.decode(
            access_token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("user_id")
    jti     = payload.get("jti")

    if user_id is None or jti is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed token payload")

    return TokenIdentity(user_id=int(user_id), jti=jti)


# ── Cookie helpers ─────────────────────────────────────────────────────────────

def _set_access_cookie(response: Response, access_token: str, settings: Settings) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )


def _clear_access_cookie(response: Response) -> None:
    response.delete_cookie(key=COOKIE_NAME, path="/")
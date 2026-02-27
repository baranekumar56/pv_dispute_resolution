import logging

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import Settings, get_settings
from src.core.services import get_current_user, login, logout, refresh_token, signup
from src.data.clients import get_db
from src.schemas import (
    AccessTokenResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    SignupRequest,
    SignupResponse,
    UserPublic,
)
from src.utils.jwt_utils import (
    TokenIdentity,
    _clear_access_cookie,
    _set_access_cookie,
    get_current_user_id,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])


# ── POST /auth/signup ──────────────────────────────────────────────────────────

@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup_route(
    body: SignupRequest,
    response: Response,
    db: AsyncSession   = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> SignupResponse:
    result = await signup(body, db, settings)
    _set_access_cookie(response, result.tokens.access_token, settings)
    result.tokens.access_token = ""
    return result


# ── POST /auth/login ───────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
async def login_route(
    body: LoginRequest,
    response: Response,
    db: AsyncSession   = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> LoginResponse:
    result = await login(body, db, settings)
    _set_access_cookie(response, result.tokens.access_token, settings)
    result.tokens.access_token = ""
    return result


# ── POST /auth/refresh ─────────────────────────────────────────────────────────

@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_route(
    response: Response,
    # Refresh token travels in the JSON body — keep it out of cookies
    # so it is never sent on every request automatically.
    body_refresh_token: str | None = None,   # accept via JSON body or query param
    db: AsyncSession   = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AccessTokenResponse:
    if not body_refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token required")

    result = await refresh_token(body_refresh_token, db, settings)
    _set_access_cookie(response, result.access_token, settings)
    result.access_token = ""
    return result


# ── POST /auth/logout ──────────────────────────────────────────────────────────

@router.post("/logout", response_model=LogoutResponse)
async def logout_route(
    response: Response,
    body_refresh_token: str | None = None,
    db: AsyncSession   = Depends(get_db),
    identity: TokenIdentity = Depends(get_current_user_id),   # validates access cookie
) -> LogoutResponse:
    result = await logout(body_refresh_token, db)
    _clear_access_cookie(response)
    return result


# ── GET /auth/me ───────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserPublic)
async def me_route(
    db: AsyncSession        = Depends(get_db),
    identity: TokenIdentity = Depends(get_current_user_id),
) -> UserPublic:
    return await get_current_user(identity.user_id, db)
import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from src.config import Settings
from src.core.exceptions import (
    DatabaseError,
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    TokenExpiredError,
    TokenNotFoundError,
    TokenRevokedError,
    UserNotFoundError,
)
from src.data.repositories import RefreshTokenRepository, UserRepository
from src.schemas import (
    AccessTokenResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    SignupRequest,
    SignupResponse,
    TokenPair,
    UserPublic,
)
from src.utils import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)

logger = logging.getLogger(__name__)


# ── Private helper ─────────────────────────────────────────────────────────────

async def _issue_token_pair(
    user_id: int,
    settings: Settings,
    token_repo: RefreshTokenRepository,
) -> tuple[str, str]:
    """
    Mint a new access + refresh pair.
    Stages the refresh token row — caller must commit.
    Returns (access_token, refresh_token).
    """
    access_token,  _            = create_access_token(user_id, settings)
    refresh_token, refresh_jti  = create_refresh_token(user_id, settings)

    await token_repo.create(
        user_id=user_id,
        jti=refresh_jti,
        refresh_token=refresh_token,
        settings=settings,
    )
    return access_token, refresh_token


# ── signup ─────────────────────────────────────────────────────────────────────

async def signup(body: SignupRequest, db: AsyncSession, settings: Settings) -> SignupResponse:
    logger.info("Signup attempt | email=%s", body.email)
    user_repo  = UserRepository(db)
    token_repo = RefreshTokenRepository(db)

    try:
        if await user_repo.get_by_email(body.email):
            raise EmailAlreadyExistsError(body.email)

        user = await user_repo.create(
            name=body.name,
            email=body.email,
            password_hash=hash_password(body.password),
        )

        access_token, refresh_token = await _issue_token_pair(user.user_id, settings, token_repo)
        await db.commit()
        await db.refresh(user)

        logger.info("Signup OK | user_id=%s", user.user_id)
        return SignupResponse(
            user=UserPublic.model_validate(user),
            tokens=TokenPair(access_token=access_token, refresh_token=refresh_token),
        )
    except (EmailAlreadyExistsError, DatabaseError):
        raise
    except Exception as exc:
        await db.rollback()
        logger.exception("Signup error | email=%s", body.email)
        raise DatabaseError("Signup failed") from exc


# ── login ──────────────────────────────────────────────────────────────────────

async def login(body: LoginRequest, db: AsyncSession, settings: Settings) -> LoginResponse:
    logger.info("Login attempt | email=%s", body.email)
    user_repo  = UserRepository(db)
    token_repo = RefreshTokenRepository(db)

    try:
        user = await user_repo.get_by_email(body.email)
        if not user or not verify_password(body.password, user.password_hash):
            raise InvalidCredentialsError()

        access_token, refresh_token = await _issue_token_pair(user.user_id, settings, token_repo)
        await db.commit()
        await db.refresh(user)

        logger.info("Login OK | user_id=%s", user.user_id)
        return LoginResponse(
            user=UserPublic.model_validate(user),
            tokens=TokenPair(access_token=access_token, refresh_token=refresh_token),
        )
    except (InvalidCredentialsError, DatabaseError):
        raise
    except Exception as exc:
        await db.rollback()
        logger.exception("Login error | email=%s", body.email)
        raise DatabaseError("Login failed") from exc


# ── refresh ────────────────────────────────────────────────────────────────────

async def refresh_token(
    raw_refresh_token: str,
    db: AsyncSession,
    settings: Settings,
) -> AccessTokenResponse:
    logger.info("Token refresh attempt")
    token_repo = RefreshTokenRepository(db)

    try:
        # 1. Cryptographic validation first
        payload     = decode_refresh_token(raw_refresh_token, settings)
        user_id     = int(payload["user_id"])
        refresh_jti = payload["jti"]

        # 2. DB checks via jti
        token_record = await token_repo.get_by_jti(refresh_jti)
        if not token_record:
            logger.warning("Refresh failed — jti not found | jti=%s", refresh_jti)
            raise TokenNotFoundError()
        if token_record.is_revoked:
            # Reuse detected — likely token theft, nuke everything for this user
            logger.warning("Refresh token reuse detected — revoking all | user_id=%s", user_id)
            await token_repo.revoke_all_for_user(user_id)
            await db.commit()
            raise TokenRevokedError()
        if token_record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            raise TokenExpiredError()

        # 3. Rotate — revoke old, issue new pair
        await token_repo.revoke(token_record)
        new_access, new_refresh = await _issue_token_pair(user_id, settings, token_repo)
        await db.commit()

        logger.info("Token rotation OK | user_id=%s", user_id)
        return AccessTokenResponse(access_token=new_access, refresh_token=new_refresh)

    except (TokenNotFoundError, TokenRevokedError, TokenExpiredError, DatabaseError):
        raise
    except Exception as exc:
        await db.rollback()
        logger.exception("Unexpected refresh error")
        raise DatabaseError("Token refresh failed") from exc


# ── logout ─────────────────────────────────────────────────────────────────────

async def logout(raw_refresh_token: str | None, db: AsyncSession) -> LogoutResponse:
    logger.info("Logout attempt")
    token_repo = RefreshTokenRepository(db)

    try:
        if raw_refresh_token:
            token_record = await token_repo.get_by_token(raw_refresh_token)
            if token_record and not token_record.is_revoked:
                await token_repo.revoke(token_record)
                await db.commit()
                logger.info("Logout OK | token_id=%s", token_record.token_id)
            else:
                logger.info("Logout — token already revoked or not found")
        return LogoutResponse()
    except DatabaseError:
        raise
    except Exception as exc:
        await db.rollback()
        logger.exception("Logout error")
        raise DatabaseError("Logout failed") from exc


# ── me ─────────────────────────────────────────────────────────────────────────

async def get_current_user(user_id: int, db: AsyncSession) -> UserPublic:
    try:
        user = await UserRepository(db).get_by_id(user_id)
        if not user:
            raise UserNotFoundError(str(user_id))
        return UserPublic.model_validate(user)
    except (UserNotFoundError, DatabaseError):
        raise
    except Exception as exc:
        raise DatabaseError("Failed to fetch current user") from exc
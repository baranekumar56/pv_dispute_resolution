import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import Settings
from src.core.exceptions import DatabaseError
from src.data.models.postgres import User, RefreshToken

logger = logging.getLogger(__name__)


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> User | None:
        try:
            result = await self.db.execute(select(User).where(User.email == email))
            return result.scalar_one_or_none()
        except SQLAlchemyError as exc:
            logger.error("get_by_email failed | email=%s error=%s", email, exc)
            raise DatabaseError("Failed to fetch user by email") from exc

    async def get_by_id(self, user_id: int) -> User | None:
        try:
            result = await self.db.execute(select(User).where(User.user_id == user_id))
            return result.scalar_one_or_none()
        except SQLAlchemyError as exc:
            logger.error("get_by_id failed | user_id=%s error=%s", user_id, exc)
            raise DatabaseError("Failed to fetch user by id") from exc

    async def create(self, name: str, email: str, password_hash: str) -> User:
        try:
            user = User(name=name, email=email, password_hash=password_hash)
            self.db.add(user)
            await self.db.flush()
            logger.debug("User staged for creation | email=%s", email)
            return user
        except SQLAlchemyError as exc:
            logger.error("create user failed | email=%s error=%s", email, exc)
            raise DatabaseError("Failed to create user") from exc


class RefreshTokenRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_token(self, token: str) -> RefreshToken | None:
        try:
            result = await self.db.execute(
                select(RefreshToken).where(RefreshToken.refresh_token == token)
            )
            return result.scalar_one_or_none()
        except SQLAlchemyError as exc:
            logger.error("get_by_token failed | error=%s", exc)
            raise DatabaseError("Failed to fetch refresh token") from exc

    async def get_by_jti(self, jti: str) -> RefreshToken | None:
        try:
            result = await self.db.execute(
                select(RefreshToken).where(RefreshToken.jti == jti)
            )
            return result.scalar_one_or_none()
        except SQLAlchemyError as exc:
            logger.error("get_by_jti failed | jti=%s error=%s", jti, exc)
            raise DatabaseError("Failed to fetch refresh token by jti") from exc

    async def create(
        self,
        user_id: int,
        jti: str,
        refresh_token: str,
        settings: Settings,
    ) -> RefreshToken:
        try:
            expires_at = datetime.now(timezone.utc) + timedelta(
                days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
            )
            record = RefreshToken(
                user_id=user_id,
                jti=jti,
                refresh_token=refresh_token,
                is_revoked=False,
                expires_at=expires_at,
            )
            self.db.add(record)
            await self.db.flush()
            logger.debug("Refresh token staged | user_id=%s jti=%s", user_id, jti)
            return record
        except SQLAlchemyError as exc:
            logger.error("create refresh token failed | user_id=%s error=%s", user_id, exc)
            raise DatabaseError("Failed to create refresh token") from exc

    async def revoke(self, token_record: RefreshToken) -> None:
        try:
            token_record.is_revoked = True
            await self.db.flush()
            logger.debug("Refresh token revoked | token_id=%s jti=%s", token_record.token_id, token_record.jti)
        except SQLAlchemyError as exc:
            logger.error("revoke token failed | token_id=%s error=%s", token_record.token_id, exc)
            raise DatabaseError("Failed to revoke refresh token") from exc

    async def revoke_all_for_user(self, user_id: int) -> None:
        try:
            await self.db.execute(
                update(RefreshToken)
                .where(RefreshToken.user_id == user_id, RefreshToken.is_revoked == False)
                .values(is_revoked=True)
            )
            await self.db.flush()
            logger.warning("All refresh tokens revoked | user_id=%s", user_id)
        except SQLAlchemyError as exc:
            logger.error("revoke_all_for_user failed | user_id=%s error=%s", user_id, exc)
            raise DatabaseError("Failed to revoke all tokens for user") from exc
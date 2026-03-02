"""
Dependency injection for the dispute service.

The dispute service validates JWT access tokens issued by the auth service.
Both services share the same SECRET_KEY so no HTTP call to auth service is needed.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from src.data.clients.postgres import get_db
from src.data.repositories.repositories import UserRepository
from src.utils.jwt import decode_access_token
from src.schemas.schemas import CurrentUser
from src.core.exceptions import UnauthorizedError, TokenExpiredError, InvalidTokenError

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    token = credentials.credentials

    try:
        payload = decode_access_token(token)

    except (TokenExpiredError, InvalidTokenError) as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=e.message)

    user_id = int(payload["sub"])
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found. Ensure auth service is seeding the same database.",
        )
    print(f"Authenticated user: {user.name} (ID: {user.user_id})")

    return CurrentUser(user_id=user.user_id, name=user.name, email=user.email)

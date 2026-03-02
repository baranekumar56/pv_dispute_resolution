from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from src.data.clients import get_db

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Health check")
async def health():
    return {"status": "ok"}


@router.get("/health/db", summary="Database connectivity check")
async def health_db(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "reachable"}
    except Exception as exc:
        return {"status": "degraded", "database": "unreachable", "detail": str(exc)}

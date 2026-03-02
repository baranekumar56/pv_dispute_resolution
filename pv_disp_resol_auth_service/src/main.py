import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.config import get_settings
from src.core.exceptions import register_exception_handlers
from src.data.clients import engine
from src.observability.logging import setup_logging
from src.api.rest.middleware import LoggingMiddleware, register_cors
from src.api.rest.routes import auth_router, health_router

settings = get_settings()
logger   = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up %s v%s [%s]", settings.APP_NAME, settings.APP_VERSION, settings.ENVIRONMENT)
    yield
    logger.info("Shutting down — disposing DB engine")
    await engine.dispose()


def create_app() -> FastAPI:
    setup_logging()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        lifespan=lifespan,
        docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    )

    # ── Middleware (order matters — outermost registered last) ─────────────
    register_cors(app)
    app.add_middleware(LoggingMiddleware)

    # ── Exception handlers ─────────────────────────────────────────────────
    register_exception_handlers(app)

    # ── Routers ────────────────────────────────────────────────────────────
    app.include_router(health_router)
    app.include_router(auth_router, prefix="/api/v1")

    return app


app = create_app()

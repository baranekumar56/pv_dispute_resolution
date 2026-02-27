from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings

settings = get_settings()

ALLOWED_ORIGINS = (
    ["*"] if settings.ENVIRONMENT == "development"
    else ["https://yourdomain.com"]   # restrict in staging/production
)


def register_cors(app: FastAPI) -> None:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

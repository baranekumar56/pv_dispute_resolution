import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from .exceptions import (
    InvalidCredentialsError,
    EmailAlreadyExistsError,
    TokenInvalidError,
    TokenNotFoundError,
    TokenRevokedError,
    TokenExpiredError,
    TokenTypeMismatchError,
    UserNotFoundError,
    DatabaseError,
    AppBaseException,
)

logger = logging.getLogger(__name__)


def _error_response(status_code: int, message: str, error_code: str = "") -> JSONResponse:
    content = {"detail": message}
    if error_code:
        content["error_code"] = error_code
    return JSONResponse(status_code=status_code, content=content)


def register_exception_handlers(app: FastAPI) -> None:
    """Register all domain + fallback exception handlers on the FastAPI app."""

    @app.exception_handler(InvalidCredentialsError)
    async def invalid_credentials_handler(request: Request, exc: InvalidCredentialsError):
        logger.warning("Invalid credentials attempt | path=%s", request.url.path)
        return _error_response(401, exc.message, "INVALID_CREDENTIALS")

    @app.exception_handler(EmailAlreadyExistsError)
    async def email_exists_handler(request: Request, exc: EmailAlreadyExistsError):
        logger.warning("Duplicate email signup | email=%s", exc.email)
        return _error_response(409, exc.message, "EMAIL_ALREADY_EXISTS")

    @app.exception_handler(TokenInvalidError)
    async def token_invalid_handler(request: Request, exc: TokenInvalidError):
        logger.warning("Invalid token | path=%s detail=%s", request.url.path, exc.message)
        return _error_response(401, exc.message, "TOKEN_INVALID")

    @app.exception_handler(TokenNotFoundError)
    async def token_not_found_handler(request: Request, exc: TokenNotFoundError):
        logger.warning("Token not found | path=%s", request.url.path)
        return _error_response(401, exc.message, "TOKEN_NOT_FOUND")

    @app.exception_handler(TokenRevokedError)
    async def token_revoked_handler(request: Request, exc: TokenRevokedError):
        logger.warning("Revoked token used | path=%s", request.url.path)
        return _error_response(401, exc.message, "TOKEN_REVOKED")

    @app.exception_handler(TokenExpiredError)
    async def token_expired_handler(request: Request, exc: TokenExpiredError):
        logger.info("Expired token used | path=%s", request.url.path)
        return _error_response(401, exc.message, "TOKEN_EXPIRED")

    @app.exception_handler(TokenTypeMismatchError)
    async def token_type_handler(request: Request, exc: TokenTypeMismatchError):
        logger.warning("Token type mismatch | path=%s", request.url.path)
        return _error_response(401, exc.message, "TOKEN_TYPE_MISMATCH")

    @app.exception_handler(UserNotFoundError)
    async def user_not_found_handler(request: Request, exc: UserNotFoundError):
        logger.info("User not found | identifier=%s", exc.identifier)
        return _error_response(404, exc.message, "USER_NOT_FOUND")

    @app.exception_handler(DatabaseError)
    async def database_error_handler(request: Request, exc: DatabaseError):
        logger.error("Database error | path=%s detail=%s", request.url.path, exc.message)
        return _error_response(503, "Service temporarily unavailable", "DATABASE_ERROR")

    @app.exception_handler(AppBaseException)
    async def app_base_handler(request: Request, exc: AppBaseException):
        logger.error("Unhandled app exception | %s: %s", type(exc).__name__, exc.message)
        return _error_response(500, "An unexpected error occurred", "INTERNAL_ERROR")

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        logger.info("Validation error | path=%s", request.url.path)
        errors = [
            {"field": ".".join(str(l) for l in err["loc"]), "message": err["msg"]}
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={"detail": "Validation failed", "errors": errors, "error_code": "VALIDATION_ERROR"},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception | path=%s", request.url.path)
        return _error_response(500, "An unexpected error occurred", "INTERNAL_ERROR")

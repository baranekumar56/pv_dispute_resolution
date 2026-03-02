class AppBaseException(Exception):
    """Root exception for all application-level errors."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(message={self.message!r})"


# ── Auth domain exceptions (no HTTP knowledge) ────────────────────────────────

class AuthError(AppBaseException):
    """Base for all auth-related errors."""


class InvalidCredentialsError(AuthError):
    def __init__(self):
        super().__init__("Invalid email or password")


class EmailAlreadyExistsError(AuthError):
    def __init__(self, email: str = ""):
        super().__init__(f"An account with this email already exists{f': {email}' if email else ''}")
        self.email = email


class TokenInvalidError(AuthError):
    def __init__(self, detail: str = "Invalid or expired token"):
        super().__init__(detail)


class TokenNotFoundError(AuthError):
    def __init__(self):
        super().__init__("Refresh token not found")


class TokenRevokedError(AuthError):
    def __init__(self):
        super().__init__("Refresh token has been revoked")


class TokenExpiredError(AuthError):
    def __init__(self):
        super().__init__("Refresh token has expired")


class TokenTypeMismatchError(AuthError):
    def __init__(self):
        super().__init__("Invalid token type")


# ── User domain exceptions ────────────────────────────────────────────────────

class UserError(AppBaseException):
    """Base for all user-related errors."""


class UserNotFoundError(UserError):
    def __init__(self, identifier: str = ""):
        super().__init__(f"User not found{f': {identifier}' if identifier else ''}")
        self.identifier = identifier


# ── Infrastructure exceptions ─────────────────────────────────────────────────

class DatabaseError(AppBaseException):
    """Raised when a DB operation fails unexpectedly."""

    def __init__(self, detail: str = "A database error occurred"):
        super().__init__(detail)

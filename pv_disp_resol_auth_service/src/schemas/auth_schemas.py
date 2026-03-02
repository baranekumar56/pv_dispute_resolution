from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, model_validator


# ── Inbound ────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    name:             str      = Field(..., min_length=2, max_length=100, examples=["Jane Doe"])
    email:            EmailStr = Field(..., examples=["jane@example.com"])
    password:         str      = Field(..., min_length=8, max_length=128, examples=["s3cr3tP@ss"])
    confirm_password: str      = Field(..., examples=["s3cr3tP@ss"])

    @model_validator(mode="after")
    def passwords_match(self) -> "SignupRequest":
        if self.password != self.confirm_password:
            raise ValueError("password and confirm_password do not match")
        return self


class LoginRequest(BaseModel):
    email:    EmailStr = Field(..., examples=["jane@example.com"])
    password: str      = Field(..., min_length=8, examples=["s3cr3tP@ss"])


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="The refresh token issued at login or last refresh")


# ── Outbound ───────────────────────────────────────────────────────────────────

class TokenPair(BaseModel):
    access_token:  str = Field(..., description="Short-lived JWT access token")
    refresh_token: str = Field(..., description="Long-lived JWT refresh token")
    token_type:    str = Field(default="bearer")


# class AccessTokenResponse(BaseModel):
#     access_token:  str = Field(..., description="New short-lived JWT access token")
#     refresh_token: str = Field(..., description="New rotated JWT refresh token")
#     token_type:    str = Field(default="bearer")

class AccessTokenResponse(BaseModel):
    access_token:  str = ""
    refresh_token: str = ""

class LogoutResponse(BaseModel):
    message: str = Field(default="Successfully logged out")


class UserPublic(BaseModel):
    user_id:    int
    name:       str
    email:      EmailStr
    created_at: datetime

    model_config = {"from_attributes": True}


class SignupResponse(BaseModel):
    user:   UserPublic
    tokens: TokenPair


class LoginResponse(BaseModel):
    user:   UserPublic
    tokens: TokenPair

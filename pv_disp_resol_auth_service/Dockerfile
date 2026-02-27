# =============================================================================
# Stage 1 — dependency builder
# =============================================================================
FROM python:3.13-bookworm AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy project definition, generate lockfile and install dependencies
COPY pyproject.toml .
RUN uv lock && uv sync --no-dev


# =============================================================================
# Stage 2 — runtime image
# =============================================================================
FROM python:3.13-slim-bookworm AS runtime

WORKDIR /app

# Copy uv binary
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy the virtual environment and lockfile from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/uv.lock /app/uv.lock

# Copy application source
COPY src/ ./src/
COPY pyproject.toml .

# Copy and configure entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN mkdir -p /home/appuser && chown -R appuser:appgroup /home/appuser /app

ENV HOME=/home/appuser
ENV UV_CACHE_DIR=/home/appuser/.cache/uv
ENV UV_FROZEN=1

USER appuser

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
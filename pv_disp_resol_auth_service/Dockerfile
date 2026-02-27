# =============================================================================
# Stage 1 — dependency builder (uses uv for fast installs)
# =============================================================================
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build tools needed for asyncpg, cryptography etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -Ls https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# Copy requirements and install into /install prefix
COPY requirements/requirements.txt .
RUN uv pip install --system --prefix=/install --no-cache -r requirements.txt


# =============================================================================
# Stage 2 — runtime image
# =============================================================================
FROM python:3.12-slim AS runtime

WORKDIR /app

# Runtime shared lib needed by asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder stage
COPY --from=builder /install /usr/local

# Copy application source
COPY src/ ./src/

# Non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
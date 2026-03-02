#!/bin/sh
set -e

echo "Running database migrations..."
uv run python -m src.data.migrations.runner upgrade

echo "Starting server..."
exec "$@"
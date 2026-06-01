#!/bin/bash
# Database setup script

set -e

echo "=== Nivano MVP Database Setup ==="
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ".env created with default values"
fi

# Load environment variables
export $(cat .env | grep -v '#' | xargs)

echo "Database configuration:"
echo "- Host: $DB_HOST"
echo "- Database: $DB_NAME"
echo "- User: $DB_USER"
echo ""

# Run migrations
echo "Running Alembic migrations..."
alembic upgrade head

echo ""
echo "=== Database setup complete! ==="

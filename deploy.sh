#!/bin/bash

# Zkredit - Deployment Script
# Quick deployment helper for Docker

set -e

echo "========================================"
echo "Zkredit - Deployment Script"
echo "========================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed (try both docker-compose and docker compose)
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo "[ERROR] Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Parse arguments
MODE=${1:-dev}
COMPOSE_FILE="docker-compose.yml"

if [ "$MODE" == "prod" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "[INFO] Using production configuration"
else
    echo "[INFO] Using development configuration"
fi

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
    echo "[INFO] Loading environment variables from .env file"
    export $(grep -v '^#' .env | xargs)
fi

# Build and start services
echo "[INFO] Building Docker images..."
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE build

echo "[INFO] Starting services..."
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE up -d

# Wait for services to be healthy
echo "[INFO] Waiting for services to start..."
sleep 15

# Check backend health
echo "[INFO] Checking backend health..."
BACKEND_PORT=${BACKEND_PORT:-8000}
if curl -f http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
    echo "[OK] Backend is healthy"
else
    echo "[WARNING] Backend health check failed. Check logs with: $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE logs backend"
fi

# Check frontend
echo "[INFO] Checking frontend..."
FRONTEND_PORT=${FRONTEND_PORT:-80}
if curl -f http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
    echo "[OK] Frontend is accessible"
else
    echo "[WARNING] Frontend check failed. Check logs with: $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE logs frontend"
fi

echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo ""
echo "Services:"
echo "  - Backend API: http://localhost:$BACKEND_PORT"
echo "  - Frontend:    http://localhost:$FRONTEND_PORT"
echo "  - API Docs:    http://localhost:$BACKEND_PORT/docs"
echo ""
echo "Useful commands:"
echo "  - View logs:   $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE logs -f"
echo "  - Stop:        $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE down"
echo "  - Restart:     $DOCKER_COMPOSE_CMD -f $COMPOSE_FILE restart"
echo "========================================"


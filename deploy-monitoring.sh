#!/bin/bash
set -e

IMAGE="itzdineshyadav/data-analyzer:monitoring"
CONTAINER="data-analyzer-monitoring"
COMPOSE_DIR="$HOME/agentlytics/monitoring"

echo "Stopping $CONTAINER..."
docker stop $CONTAINER 2>/dev/null || true

echo "Removing $CONTAINER..."
docker rm $CONTAINER 2>/dev/null || true

echo "Removing old image..."
docker rmi $IMAGE 2>/dev/null || true

echo "Pulling latest image..."
docker pull $IMAGE

echo "Fixing traces directory permissions and compose volume flags..."
mkdir -p "$HOME/agentlytics/server/traces"
chmod -R 777 "$HOME/agentlytics/server/traces" 2>/dev/null || true

# Ensure traces volume in docker-compose.yml points to ../server/traces and is mounted read-write (remove :ro)
if [ -f "$COMPOSE_DIR/docker-compose.yml" ]; then
    sed -i 's|\.\./Server/traces|../server/traces|g' "$COMPOSE_DIR/docker-compose.yml"
    sed -i 's|- \.\./traces:/app/traces|- ../server/traces:/app/traces|g' "$COMPOSE_DIR/docker-compose.yml"
    sed -i 's|/app/traces:ro|/app/traces|g' "$COMPOSE_DIR/docker-compose.yml"
    sed -i 's|/app/traces-fallback:ro|/app/traces-fallback|g' "$COMPOSE_DIR/docker-compose.yml"
fi

echo "Starting monitoring service..."
cd $COMPOSE_DIR
docker compose up -d

echo "Monitoring deployment completed."


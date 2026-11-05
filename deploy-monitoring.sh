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

echo "Starting monitoring service..."
cd $COMPOSE_DIR
docker compose up -d

echo "Monitoring deployment completed."


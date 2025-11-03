#!/bin/bash

# Quick deployment script for PostaGen Backend
# Usage: ./deploy.sh [build|start|stop|restart|logs|status]

set -e

COMPOSE_FILE="docker-compose.yml"
SERVICE_NAME="postagen-backend"

case "$1" in
  build)
    echo "🔨 Building Docker image..."
    docker-compose build --no-cache
    ;;
  start)
    echo "🚀 Starting PostaGen Backend..."
    docker-compose up -d
    echo "✅ Backend started!"
    echo "📊 View logs: ./deploy.sh logs"
    ;;
  stop)
    echo "🛑 Stopping PostaGen Backend..."
    docker-compose down
    ;;
  restart)
    echo "🔄 Restarting PostaGen Backend..."
    docker-compose restart $SERVICE_NAME
    ;;
  logs)
    echo "📋 Viewing logs (Ctrl+C to exit)..."
    docker-compose logs -f $SERVICE_NAME
    ;;
  status)
    echo "📊 Container Status:"
    docker-compose ps
    echo ""
    echo "🏥 Health Check:"
    curl -s http://localhost:5001/api/health || echo "❌ Health check failed"
    ;;
  update)
    echo "⬇️  Pulling latest code..."
    git pull
    echo "🔨 Rebuilding and restarting..."
    docker-compose up -d --build
    ;;
  *)
    echo "PostaGen Backend Deployment Script"
    echo ""
    echo "Usage: ./deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build     - Build Docker image"
    echo "  start     - Start the backend service"
    echo "  stop      - Stop the backend service"
    echo "  restart   - Restart the backend service"
    echo "  logs      - View logs (follow mode)"
    echo "  status    - Check container status and health"
    echo "  update    - Pull latest code and rebuild"
    echo ""
    exit 1
    ;;
esac


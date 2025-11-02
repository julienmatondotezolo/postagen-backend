# Docker Deployment Guide for PostaGen Backend

This guide explains how to deploy the PostaGen NestJS backend using Docker on your VPS.

## Prerequisites

- Docker installed on your VPS
- Docker Compose installed (optional, but recommended)
- Your environment variables configured

## Quick Start

### Option 1: Using Docker Compose (Recommended)

1. **Create your `.env` file**:
   ```bash
   cp env.template .env
   # Edit .env with your actual values
   ```

2. **Build and run**:
   ```bash
   docker-compose up -d --build
   ```

3. **View logs**:
   ```bash
   docker-compose logs -f postagen-backend
   ```

4. **Stop the service**:
   ```bash
   docker-compose down
   ```

### Option 2: Using Docker Directly

1. **Build the image**:
   ```bash
   docker build -t postagen-backend .
   ```

2. **Run the container**:
   ```bash
   docker run -d \
     --name postagen-backend \
     --restart unless-stopped \
     -p 5001:5001 \
     --env-file .env \
     postagen-backend
   ```

3. **View logs**:
   ```bash
   docker logs -f postagen-backend
   ```

4. **Stop the container**:
   ```bash
   docker stop postagen-backend
   docker rm postagen-backend
   ```

## Environment Variables

Required environment variables (set in `.env` file):

- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (preferred)
- `SUPABASE_ANON_KEY` - Supabase anon key (fallback)
- `N8N_WEBHOOK_URL` - N8N webhook URL for post generation
- `PORT` - Server port (default: 5001)
- `NEXT_PUBLIC_URL` - Frontend URL for CORS configuration

## Production Deployment

### 1. Build for Production

```bash
docker build -t postagen-backend:latest .
```

### 2. Run with Docker Compose

```bash
docker-compose up -d
```

### 3. Set Up Reverse Proxy (Nginx)

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. SSL with Let's Encrypt

```bash
sudo certbot --nginx -d api.yourdomain.com
```

## Health Checks

The container includes a health check that verifies the API is responding:

```bash
# Check container health
docker ps
# Should show "healthy" status

# Manual health check
curl http://localhost:5001/api/health
```

## Monitoring

### View Logs

```bash
# Docker Compose
docker-compose logs -f postagen-backend

# Docker directly
docker logs -f postagen-backend
```

### Check Container Status

```bash
docker ps | grep postagen-backend
```

### Restart Container

```bash
# Docker Compose
docker-compose restart postagen-backend

# Docker directly
docker restart postagen-backend
```

## Troubleshooting

### Container won't start

1. Check logs:
   ```bash
   docker logs postagen-backend
   ```

2. Verify environment variables:
   ```bash
   docker exec postagen-backend env
   ```

3. Test Supabase connection manually

### Port already in use

Change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "5002:5001"  # Use port 5002 on host instead
```

### Update Application

1. Pull latest code
2. Rebuild image:
   ```bash
   docker-compose up -d --build
   ```

## Security Considerations

- Never commit `.env` file to git
- Use strong passwords for database
- Keep Supabase keys secure
- Regularly update Docker images
- Use non-root user (already configured in Dockerfile)
- Enable firewall on your VPS
- Use HTTPS in production

## Maintenance

### Update Dependencies

```bash
# Rebuild with latest dependencies
docker-compose up -d --build --no-cache
```

### Backup Database

Since we're using Supabase, backups are handled by Supabase. However, you can export data:

```bash
# Connect to Supabase and export
pg_dump $DATABASE_URL > backup.sql
```

### Clean Up

```bash
# Remove unused images
docker image prune -a

# Remove stopped containers
docker container prune
```

## Support

For issues, check:
- Application logs: `docker logs postagen-backend`
- Container status: `docker ps -a`
- Health check: `curl http://localhost:5001/api/health`


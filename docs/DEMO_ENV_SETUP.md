# BridgeAI Demo Environment Setup Guide

## Prerequisites

- Docker & Docker Compose v2+
- Node.js 20+ (for local dev mode)
- Git

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-org/bridgeai.git
cd bridgeai
```

### 2. Configure environment

```bash
cp deploy/demo/.env.example deploy/demo/.env
# Edit .env and set your demo-specific values
```

### 3. Start the demo environment

```bash
cd deploy/demo
docker compose -f docker-compose.demo.yml up -d
```

### 4. Verify services are running

```bash
docker compose -f docker-compose.demo.yml ps
```

Services will be available at:

- API Server: http://localhost:3000
- WebSocket: ws://localhost:3000
- API Docs: http://localhost:3000/api-docs
- MinIO Console: http://localhost:9001

## Architecture

The demo environment includes:

```
┌─────────────────────────────────────────────────────┐
│                  Nginx (SSL Termination)            │
│              ports: 80, 443 (HTTPS)                 │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Docker Network (bridgeai-demo)         │
├─────────────────┬─────────────────┬────────────────┤
│  API Server     │   PostgreSQL    │     Redis      │
│  (Express)     │   + PostGIS     │   (Cache/Q)    │
│  :3000          │   :5432         │    :6379       │
│                 │                 │                │
│  ┌───────────┐  │                 │                │
│  │ MinIO     │  │                 │                │
│  │ Storage   │  │                 │                │
│  │ :9000     │  │                 │                │
│  └───────────┘  │                 │                │
└─────────────────┴─────────────────┴────────────────┘
```

## Configuration

### Environment Variables

| Variable            | Description               | Default       |
| ------------------- | ------------------------- | ------------- |
| `POSTGRES_DB`       | Database name             | bridgeai_demo |
| `POSTGRES_USER`     | Database user             | demo_user     |
| `POSTGRES_PASSWORD` | Database password         | (set in .env) |
| `JWT_SECRET`        | JWT signing secret        | (set in .env) |
| `DEMO_MODE`         | Enable demo mode features | true          |
| `SENTRY_DSN`        | Sentry error tracking     | (optional)    |

### Domain & SSL Setup

For production demo with domain:

1. Update `nginx.conf` with your domain
2. Place SSL certificates at:
   - `/etc/ssl/certs/demo.bridgeai.crt`
   - `/etc/ssl/private/demo.bridgeai.key`
3. Or use Let's Encrypt for auto-renewal

### CDN Configuration

The demo uses MinIO for local object storage. For CDN integration:

1. Configure cloud provider (CloudFlare/AWS CloudFront)
2. Set `CDN_BASE_URL` in environment
3. Update nginx to proxy static assets

## Monitoring & Logs

### View logs

```bash
# All services
docker compose -f docker-compose.demo.yml logs -f

# Specific service
docker compose -f docker-compose.demo.yml logs -f server
docker compose -f docker-compose.demo.yml logs -f postgres
```

### Health checks

```bash
# API health
curl http://localhost:3000/health

# Database
docker exec bridgeai_postgres_demo pg_isready -U demo_user

# Redis
docker exec bridgeai_redis_demo redis-cli ping
```

## Demo Data

Seed demo data after startup:

```bash
cd apps/server
npm run db:seed
```

See `docs/DEMO_DATA.md` for demo accounts and scenarios.

## Troubleshooting

### Port conflicts

If ports 3000, 5432, 6379, 9000, 9001 are in use:

```bash
# Edit docker-compose.demo.yml and change port mappings
```

### Database connection issues

```bash
# Check postgres logs
docker compose -f docker-compose.demo.yml logs postgres

# Re-run migrations
docker compose -f docker-compose.demo.yml exec server npm run db:migrate
```

### Reset demo environment

```bash
cd deploy/demo
docker compose -f docker-compose.demo.yml down -v  # removes volumes
docker compose -f docker-compose.demo.yml up -d
cd ../../apps/server && npm run db:seed
```

## Security Notes

- Change all default passwords in `.env`
- Use strong JWT secrets (min 32 characters)
- SSL/TLS is required for production deployment
- Demo environment should not be exposed publicly without authentication

## Next Steps

- See `docs/DEMO_SCRIPT_VISIONSHARE.md` for VisionShare demo walkthrough
- See `docs/DEMO_CONTINGENCY_PLAN.md` for failure handling
- See `docs/DEMO_CHECKLIST.md` for go-live checklist

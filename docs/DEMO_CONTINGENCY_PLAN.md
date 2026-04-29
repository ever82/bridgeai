# Demo Contingency Plan

This document describes how to handle failures and emergencies during a BridgeAI demo.

## Emergency Contacts

| Role         | Contact       |
| ------------ | ------------- |
| Backend Lead | (set in .env) |
| DevOps Lead  | (set in .env) |

## Failure Scenarios

### 1. Network Failure

**Symptoms:** API requests timeout, WebSocket disconnects.

**Recovery Steps:**

1. Check if the demo server container is running:
   ```bash
   docker ps | grep bridgeai_server_demo
   ```
2. If the container is down, restart it:
   ```bash
   cd deploy/demo && docker compose restart server
   ```
3. If the entire demo stack is down:
   ```bash
   cd deploy/demo && docker compose restart
   ```
4. Verify recovery:
   ```bash
   curl http://localhost:3000/health
   ```

### 2. AI Service Degradation / Fallback

**Symptoms:** AI responses are slow (>5s), error responses, or empty results.

**Recovery Steps:**

1. Check AI service health (if using external AI):
   ```bash
   curl http://localhost:3000/api/ai/health
   ```
2. Enable fallback mode (mock responses):
   ```bash
   # Set in .env
   AI_FALLBACK_MODE=true
   ```
3. Restart server:
   ```bash
   cd deploy/demo && docker compose restart server
   ```
4. If the AI provider is down, switch to a backup provider in `.env`:
   ```
   AI_PROVIDER=backup_provider
   AI_BACKUP_API_KEY=your_backup_key
   ```

### 3. Database Failure

**Symptoms:** "Database connection error" in API, data not persisting.

**Recovery Steps:**

1. Check PostgreSQL status:
   ```bash
   docker exec bridgeai_postgres_demo pg_isready -U demo_user
   ```
2. Check disk space:
   ```bash
   docker exec bridgeai_postgres_demo df -h
   ```
3. If PostgreSQL is unresponsive, restart it:
   ```bash
   cd deploy/demo && docker compose restart postgres
   ```
4. Verify data integrity:
   ```bash
   docker exec bridgeai_postgres_demo psql -U demo_user -d bridgeai_demo -c "SELECT 1;"
   ```
5. If data is corrupted, restore from backup (see below).

### 4. Redis Failure

**Symptoms:** Session errors, cache failures, WebSocket issues.

**Recovery Steps:**

1. Check Redis status:
   ```bash
   docker exec bridgeai_redis_demo redis-cli ping
   ```
2. If Redis is down:
   ```bash
   cd deploy/demo && docker compose restart redis
   ```
3. Clear stale cache if needed:
   ```bash
   docker exec bridgeai_redis_demo redis-cli FLUSHALL
   ```

### 5. Storage (MinIO) Failure

**Symptoms:** Image/video uploads fail, file not found errors.

**Recovery Steps:**

1. Check MinIO health:
   ```bash
   docker exec bridgeai_minio_demo mc ready local
   ```
2. Restart MinIO:
   ```bash
   cd deploy/demo && docker compose restart minio
   ```
3. Check disk space on the host:
   ```bash
   df -h /var/lib/docker/volumes
   ```

### 6. Full Stack Failure (Catastrophic)

**Symptoms:** Nothing is responding, possible host resource exhaustion.

**Recovery Steps:**

1. Check host resources:
   ```bash
   docker stats --no-stream
   ```
2. If resources are exhausted, stop non-essential containers.
3. Full reset (WARNING: destroys all demo data):
   ```bash
   cd deploy/demo && docker compose down -v
   docker compose up -d
   # Re-seed data
   cd ../../apps/server && npm run db:seed:demo
   ```

## Data Reset

If demo data needs to be reset (corruption, testing, or demo restart):

```bash
# Soft reset (keeps users, resets tasks/chats)
cd apps/server && npm run db:seed:demo

# Hard reset (full wipe and re-seed)
cd deploy/demo && docker compose down -v
cd deploy/demo && docker compose up -d
cd ../../apps/server && npm run db:migrate && npm run db:seed:demo
```

Or use the convenience script:

```bash
bash scripts/demo-reset.sh --mode=full
```

## Backup & Restore

### Manual Backup

Before a demo session, create a data snapshot:

```bash
docker exec bridgeai_postgres_demo pg_dump -U demo_user bridgeai_demo > demo_backup_$(date +%Y%m%d).sql
```

### Restore from Backup

```bash
docker exec -i bridgeai_postgres_demo psql -U demo_user -d bridgeai_demo < demo_backup_20240101.sql
```

### Automated Backup

The backup configuration is at `deploy/demo/backup.yml`. To enable scheduled backups:

```bash
docker compose -f deploy/demo/backup.yml up -d
```

## Demo FAQ

See `docs/DEMO_FAQ.md` for frequently asked questions.

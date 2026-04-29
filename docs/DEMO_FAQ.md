# Demo FAQ

Common questions and answers for BridgeAI demo operators.

## General

### What is BridgeAI?

BridgeAI is a multi-agent platform that connects humans and AI agents across different verticals: VisionShare (crowdsourced vision tasks), AgentDate (social matching), AgentJob (job matching), and AgentAd (merchant deals).

### What demo accounts are available?

| Email                    | Password  | Purpose          |
| ------------------------ | --------- | ---------------- |
| demo-vision@bridgeai.com | Demo1234! | VisionShare demo |
| demo-date@bridgeai.com   | Demo1234! | AgentDate demo   |
| demo-job@bridgeai.com    | Demo1234! | AgentJob demo    |
| demo-ad@bridgeai.com     | Demo1234! | AgentAd demo     |
| demo-admin@bridgeai.com  | Demo1234! | Admin panel      |

See `docs/DEMO_DATA.md` for full account and scenario details.

### How do I start the demo environment?

```bash
cd deploy/demo
docker compose -f docker-compose.demo.yml up -d
cd ../../apps/server && npm run db:seed:demo
```

See `docs/DEMO_ENV_SETUP.md` for detailed setup instructions.

---

## Demo Execution

### How do I demonstrate VisionShare?

See `docs/demo-scripts/DEMO_SCRIPT_VISIONSHARE.md` for a step-by-step walkthrough.

### How do I demonstrate AgentJob matching?

See `docs/demo-scripts/DEMO_SCRIPT_AGENTJOB.md`.

### How do I simulate a demo without internet?

Set `AI_FALLBACK_MODE=true` in `.env` and restart the server. This enables mock AI responses without requiring external AI API connectivity.

---

## Troubleshooting

### The demo is not responding. What should I do?

See `docs/DEMO_CONTINGENCY_PLAN.md` for detailed failure handling:

1. Check if services are running:
   ```bash
   docker ps | grep bridgeai
   ```
2. Check server logs:
   ```bash
   docker compose -f deploy/demo/docker-compose.demo.yml logs -f server
   ```
3. Health check:
   ```bash
   curl http://localhost:3000/health
   ```

### Database connection errors?

1. Check PostgreSQL:
   ```bash
   docker exec bridgeai_postgres_demo pg_isready -U demo_user
   ```
2. Restart postgres:
   ```bash
   docker compose -f deploy/demo/docker-compose.demo.yml restart postgres
   ```
3. If the error persists, you may need to reset:
   ```bash
   bash scripts/demo-reset.sh --mode=full
   ```

### AI responses are slow or failing?

1. Check if the AI service is responsive:
   ```bash
   curl http://localhost:3000/api/ai/health
   ```
2. Enable fallback mode:
   ```bash
   # Edit deploy/demo/.env
   AI_FALLBACK_MODE=true
   docker compose -f deploy/demo/docker-compose.demo.yml restart server
   ```

### I accidentally deleted demo data. How do I restore it?

If you have a backup:

```bash
docker exec -i bridgeai_postgres_demo psql -U demo_user -d bridgeai_demo < your_backup.sql
```

Otherwise, re-run the seed:

```bash
cd apps/server && npm run db:seed:demo
```

---

## Data & Privacy

### Does the demo use real user data?

No. All demo data is synthetic and seeded specifically for demonstration purposes. No real user data is used.

### Can I export demo data?

Yes. Export from the admin panel or run:

```bash
docker exec bridgeai_postgres_demo pg_dump -U demo_user bridgeai_demo > demo_export.sql
```

### How long does demo data persist?

Data persists in Docker volumes until explicitly destroyed. To reset:

```bash
bash scripts/demo-reset.sh --mode=full
```

---

## Performance

### What are the hardware requirements for a smooth demo?

Minimum: 4 CPU cores, 8GB RAM, 20GB disk space.

Recommended: 8 CPU cores, 16GB RAM, 50GB SSD.

### Can I run the demo on a laptop?

Yes, if the laptop meets the minimum requirements and is running Docker Desktop.

---

## Customization

### How do I add custom demo scenarios?

1. Edit `apps/server/src/database/seed.ts`
2. Add your scenario data
3. Run `npm run db:seed:demo` to apply

### How do I change the demo theme/branding?

Update the frontend environment variables in `deploy/demo/.env`:

```
REACT_APP_BRAND_NAME=YourBrand
REACT_APP_BRAND_COLOR=#ff6600
```

---

## Scripts Reference

| Script                              | Description                   |
| ----------------------------------- | ----------------------------- |
| `scripts/demo-reset.sh --mode=soft` | Keep users, reset tasks/chats |
| `scripts/demo-reset.sh --mode=full` | Full wipe and re-seed         |
| `scripts/redis-healthcheck.sh`      | Check Redis connectivity      |
| `scripts/start-backend.sh`          | Start server in dev mode      |

# BridgeAI Demo Go-Live Checklist

Use this checklist before every demo session to ensure readiness.

## Pre-Demo (T-24h)

### Environment

- [ ] Demo environment is running (`docker compose -f deploy/demo/docker-compose.demo.yml ps`)
- [ ] All services healthy (server, postgres, redis, minio)
- [ ] Health check passes: `curl http://localhost:3000/health`
- [ ] Database migrations are up to date
- [ ] Demo data seeded: `cd apps/server && npm run db:seed:demo`

### Data

- [ ] All 5 demo accounts accessible (see `docs/DEMO_DATA.md`)
- [ ] VisionShare tasks present and visible
- [ ] AgentDate demands/supplies loaded
- [ ] AgentJob postings and profiles loaded
- [ ] AgentAd merchant offer active

### Network & Connectivity

- [ ] Wi-Fi or wired network is stable
- [ ] Firewall allows traffic on ports 3000, 5432, 6379, 9000, 9001
- [ ] DNS resolves correctly (if using a domain)
- [ ] SSL certificates are valid (if using HTTPS)

### AI Service

- [ ] AI endpoint is reachable
- [ ] Fallback mode tested: `AI_FALLBACK_MODE=true` works
- [ ] AI response latency is acceptable (< 3s)

### Backup

- [ ] Database backup created:
  ```bash
  docker exec bridgeai_postgres_demo pg_dump -U demo_user bridgeai_demo > demo_backup_$(date +%Y%m%d).sql
  ```

## Pre-Demo (T-1h)

### Hardware & Display

- [ ] Laptop/device charged or plugged in
- [ ] External display connected (if presenting to audience)
- [ ] Screen resolution and font size appropriate for audience
- [ ] Browser zoom level set (recommended: 100-125%)

### Browser Setup

- [ ] Browser is up to date (Chrome recommended)
- [ ] Clear browser cache or use incognito profile
- [ ] Disable browser notifications
- [ ] Bookmark key demo pages

### Script Walkthrough

- [ ] Demo script reviewed (see `docs/demo-scripts/`)
- [ ] Demo flow rehearsed end to end
- [ ] Contingency plan reviewed (`docs/DEMO_CONTINGENCY_PLAN.md`)

## Demo Day (T-0)

### Final Verification

- [ ] All services still running and healthy
- [ ] Demo accounts login tested
- [ ] Core demo flow runs without errors:
  - [ ] VisionShare: post task, browse, assign
  - [ ] AgentDate: create demand, match, chat
  - [ ] AgentJob: post job, search, apply
  - [ ] AgentAd: view merchant offer

### Presentation Materials

- [ ] Slide deck or talking points ready
- [ ] FAQ reviewed (`docs/DEMO_FAQ.md`)
- [ ] Feedback forms prepared (`docs/DEMO_FEEDBACK_FORM.md`)

## Post-Demo

- [ ] Collect feedback from attendees
- [ ] Log demo session in `docs/DEMO_PREPARATION_LOG.md`
- [ ] Note any issues encountered
- [ ] Create demo report using `docs/DEMO_REPORT_TEMPLATE.md`
- [ ] Reset demo data if needed:
  ```bash
  bash scripts/demo-reset.sh --mode=soft
  ```

## Quick Commands Reference

| Action         | Command                                                                              |
| -------------- | ------------------------------------------------------------------------------------ |
| Check services | `docker compose -f deploy/demo/docker-compose.demo.yml ps`                           |
| View logs      | `docker compose -f deploy/demo/docker-compose.demo.yml logs -f server`               |
| Health check   | `curl http://localhost:3000/health`                                                  |
| Seed data      | `cd apps/server && npm run db:seed:demo`                                             |
| Soft reset     | `bash scripts/demo-reset.sh --mode=soft`                                             |
| Full reset     | `bash scripts/demo-reset.sh --mode=full`                                             |
| Backup DB      | `docker exec bridgeai_postgres_demo pg_dump -U demo_user bridgeai_demo > backup.sql` |

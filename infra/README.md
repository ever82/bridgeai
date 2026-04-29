# Infrastructure as Code - Monitoring & Observability

# BridgeAI Demo Environment

## Overview

This directory contains infrastructure configuration for monitoring, logging,
and observability in the BridgeAI demo environment.

## Components

### Logging (ELK Stack)

- Filebeat: ships logs from services
- Logstash: processes and transforms logs
- Elasticsearch: stores and indexes logs
- Kibana: visualizes logs and metrics

### Metrics (Prometheus + Grafana)

- Prometheus: collects metrics
- Grafana: dashboards and alerting

### Tracing (Optional - Jaeger)

- Jaeger: distributed tracing

## Quick Start

1. Start monitoring stack:

   ```bash
   cd infra/monitoring
   docker compose -f docker-compose.monitoring.yml up -d
   ```

2. Access services:
   - Grafana: http://localhost:3001 (admin/admin)
   - Kibana: http://localhost:5601
   - Prometheus: http://localhost:9090

## Configuration

### Prometheus

Prometheus scrapes metrics from:

- `server`: metrics at `:3000/metrics`
- `postgres`: exporter at `:9187`
- `redis`: exporter at `:9121`

### Alerting

Default alerts configured for:

- High error rate (>5% in 5min)
- High response time (>1s p99)
- Service down

### Log Retention

- Elasticsearch: 7 days (demo)
- MinIO: 30 days

## Production Notes

- Replace default passwords
- Enable TLS for all endpoints
- Configure long-term storage (S3 archival)
- Set up alerting notifications (email/Slack/PagerDuty)

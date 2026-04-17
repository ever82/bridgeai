# Sentry Notification Channels Configuration

## Slack Integration

### Setup
1. Go to Settings > Integrations > Slack in Sentry
2. Add workspace and authorize Sentry
3. Configure channels:
   - `#alerts-critical` - P0 critical errors
   - `#alerts-high` - P1 high priority issues
   - `#alerts-medium` - Error rate thresholds
   - `#alerts-info` - New issues notifications

### Webhook URL (Configure in Sentry UI)
```
# Set via Sentry UI or environment variable
SENTRY_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## Email Notifications

### Recipients
- Primary: devops@bridgeai.com
- Secondary: backend-team@bridgeai.com
- Mobile: mobile-team@bridgeai.com

### Email Configuration
```
SENTRY_EMAIL_HOST=smtp.gmail.com
SENTRY_EMAIL_PORT=587
SENTRY_EMAIL_USER=alerts@bridgeai.com
SENTRY_EMAIL_PASSWORD=your-password
SENTRY_EMAIL_USE_TLS=true
```

## Alert Suppression Rules

### Rate Limiting
- Max 1 alert per 5 minutes for same issue
- Max 10 alerts per hour for same project
- Digest mode for non-critical alerts

### Ignore Patterns
- Health check endpoints: `/health`, `/ready`
- Development environment errors (when in production)
- Known third-party library errors
- Network timeout errors (below threshold)

## Severity Levels

### P0 - Critical
- Application crashes
- Database connection failures
- Authentication system failures
- Payment processing errors

### P1 - High
- API endpoint failures > 10 users
- Memory leaks
- Performance degradation > 5 seconds
- Security-related errors

### P2 - Medium
- Error rate > 1%
- Slow queries > 500ms
- Warning level logs

### P3 - Low
- Info level events
- New issue notifications
- Performance metrics

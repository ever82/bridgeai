# Sentry Environment Configuration

## Required Environment Variables

### Server (apps/server/.env)

```env
# Sentry DSN (Data Source Name) - Required for error tracking
SENTRY_DSN=https://<key>@sentry.io/<project-id>

# Environment (development, staging, production)
SENTRY_ENVIRONMENT=development

# Release version (optional, defaults to package version)
SENTRY_RELEASE=0.1.0

# Traces sample rate (0.0 to 1.0)
SENTRY_TRACES_SAMPLE_RATE=0.1

# Profiles sample rate (0.0 to 1.0)
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

### Mobile (apps/mobile/.env)

```env
# Sentry DSN for React Native
SENTRY_DSN=https://<key>@sentry.io/<project-id>

# Environment
SENTRY_ENVIRONMENT=development

# Release version (format: name@version)
SENTRY_RELEASE=com.bridgeai.app@0.1.0

# Traces sample rate
SENTRY_TRACES_SAMPLE_RATE=0.1
```

## Getting Sentry DSN

1. Create account at https://sentry.io
2. Create new project for your application
3. Go to Settings > Projects > [Your Project] > Client Keys (DSN)
4. Copy the DSN URL

## Organization Setup

### Create Organization
1. Sign up at https://sentry.io
2. Create organization: "BridgeAI"
3. Create projects:
   - `bridgeai-server` (Node.js)
   - `bridgeai-mobile` (React Native)

### Team Members
Add team members with appropriate roles:
- Owners: Full access
- Managers: Manage projects and teams
- Members: View and resolve issues

## Alert Configuration

Alerts are configured in `.sentry/alert-rules.json` and can be imported via Sentry API:

```bash
# Import alert rules (requires Sentry CLI)
sentry-cli monitors create --config .sentry/alert-rules.json
```

## Integration Setup

### Slack Integration
1. Go to Settings > Integrations > Slack
2. Add to Slack workspace
3. Configure channels for alerts
4. Test connection

### Email Notifications
1. Go to Settings > Account > Notifications
2. Configure email preferences
3. Set up alert recipients

### GitHub Integration
1. Go to Settings > Integrations > GitHub
2. Link repository
3. Enable commit tracking and release automation

## Testing Configuration

### Server Testing
```bash
cd apps/server
# Set SENTRY_DSN in .env
# Run application and trigger test error
node -e "require('./dist/utils/sentry').captureException(new Error('Test error'))"
```

### Mobile Testing
```bash
cd apps/mobile
# Set SENTRY_DSN in .env
# Run app and trigger test error
# Check Sentry dashboard for error
```

## Security Considerations

1. **DSN Security**: Keep DSN private, don't commit to public repos
2. **Rate Limiting**: Monitor event quotas to avoid overages
3. **Data Scrubbing**: Configure PII filtering in Sentry settings
4. **Access Control**: Use team-based permissions

## Troubleshooting

### Events Not Appearing
- Check DSN is correct
- Verify network connectivity
- Check environment filter in Sentry UI
- Review `beforeSend` filtering

### Performance Issues
- Reduce tracesSampleRate
- Disable profiling in production
- Filter out health check endpoints

### Mobile Crashes Not Reported
- Verify native crash handler is enabled
- Check iOS/Android native setup
- Review device logs for errors

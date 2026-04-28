/**
 * Migration Workflow - Auto-generation, review, naming convention checks,
 * and production safety mechanisms (backup, rollback, destructive change detection)
 *
 * Usage:
 *   npm run migration:create -- --name=<description>    Create new migration
 *   npm run migration:review                           Review pending migrations
 *   npm run migration:approve -- --id=<id>             Approve migration
 *   npm run migration:reject -- --id=<id>              Reject migration
 *   npm run migration:execute -- --name=<description>   Execute approved migration
 *   npm run migration:diff                             Diff migration state vs schema
 *   npm run migration:diff -- --env=<env>              Diff for specific environment
 *   npm run migration:backup                           Create pre-migration backup
 *   npm run migration:deploy:safe -- --env=<env>       Deploy with auto-backup + rollback + destructive check
 *   npm run migration:detect-destructive -- --name=<name>  Check a migration for destructive changes
 */
export {};
//# sourceMappingURL=migration-workflow.d.ts.map
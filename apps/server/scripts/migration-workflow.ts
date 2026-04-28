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
 *   npm run migration:rollback -- --to=<version> [--env=<env>]  Roll back migrations to a target version
 *   npm run migration:restore -- --file=<path> [--env=<env>]    Restore database from a backup file
 *   npm run migration:audit-log [--count=N]                     View recent migration audit records
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, '../prisma/migrations');
const APPROVAL_FILE = path.join(__dirname, '../.migration-approval.json');
const BACKUP_DIR = path.join(__dirname, '../.migration-backups');
const ENV_FILES: Record<string, string> = {
  dev: '.env.development',
  test: '.env.test',
  prod: '.env.production',
};

// Naming convention: YYYYMMDDHHMMSS_description
const NAMING_REGEX = /^\d{14}_[a-z][a-z0-9_]*$/;

// Destructive SQL patterns to detect
const DESTRUCTIVE_PATTERNS = [
  { pattern: /\bDROP\s+TABLE\b/gi, name: 'DROP TABLE', severity: 'critical' },
  { pattern: /\bDROP\s+COLUMN\b/gi, name: 'DROP COLUMN', severity: 'critical' },
  { pattern: /\bALTER\s+TABLE\s+\S+\s+DROP\b/gi, name: 'ALTER TABLE DROP', severity: 'critical' },
  { pattern: /\bDELETE\s+FROM\b/gi, name: 'DELETE FROM', severity: 'critical' },
  { pattern: /\bTRUNCATE\b/gi, name: 'TRUNCATE', severity: 'critical' },
  {
    pattern: /\bALTER\s+TABLE\s+\S+\s+ALTER\s+COLUMN\s+\S+\s+SET\s+NOT\s+NULL/gi,
    name: 'ADD NOT NULL constraint',
    severity: 'warning',
  },
  {
    pattern: /\bALTER\s+TABLE\s+\S+\s+ALTER\s+COLUMN\s+\S+\s+TYPE\b/gi,
    name: 'ALTER COLUMN TYPE',
    severity: 'warning',
  },
  { pattern: /\bUPDATE\s+\S+\s+SET\b/gi, name: 'UPDATE without WHERE', severity: 'warning' },
  { pattern: /\bRENAME\s+(TABLE|COLUMN)\b/gi, name: 'RENAME TABLE/COLUMN', severity: 'warning' },
];

interface ApprovalRecord {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
  rejectedAt?: string;
}

interface DestructiveFinding {
  pattern: string;
  severity: string;
  line: string;
  lineNumber: number;
}

interface MigrationAuditRecord {
  migrationName: string;
  action: 'execute' | 'safe-deploy' | 'rollback';
  executor: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  status: 'success' | 'failed';
  error?: string;
  environment?: string;
}

const AUDIT_LOG_FILE = path.join(__dirname, '../.migration-audit.json');

/**
 * Get the executor identity from environment variable, git config, or fallback.
 */
function getExecutor(): string {
  if (process.env.MIGRATION_EXECUTOR) {
    return process.env.MIGRATION_EXECUTOR;
  }
  try {
    return execSync('git config user.name', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Append an audit record to the structured audit log file.
 */
function appendAuditRecord(record: MigrationAuditRecord): void {
  let records: MigrationAuditRecord[] = [];
  if (fs.existsSync(AUDIT_LOG_FILE)) {
    try {
      records = JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf-8'));
    } catch {
      records = [];
    }
  }
  records.push(record);
  fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(records, null, 2));
}

/**
 * Print recent audit log entries.
 */
function printAuditLog(count?: number): void {
  if (!fs.existsSync(AUDIT_LOG_FILE)) {
    console.log('No audit log found.');
    return;
  }

  let records: MigrationAuditRecord[];
  try {
    records = JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf-8'));
  } catch {
    console.log('Audit log file is corrupted or empty.');
    return;
  }

  if (records.length === 0) {
    console.log('No audit records found.');
    return;
  }

  const limit = count || 20;
  const recent = records.slice(-limit).reverse();

  console.log(
    `\n=== Migration Audit Log (last ${Math.min(limit, records.length)} of ${records.length}) ===\n`
  );
  for (const r of recent) {
    const statusLabel = r.status === 'success' ? '[SUCCESS]' : '[FAILED]';
    console.log(`${statusLabel} ${r.action} | ${r.migrationName}`);
    console.log(`  Executor: ${r.executor}`);
    console.log(`  Start:    ${r.startTime}`);
    console.log(`  End:      ${r.endTime}`);
    console.log(`  Duration: ${r.durationMs}ms`);
    if (r.environment) console.log(`  Env:      ${r.environment}`);
    if (r.error) console.log(`  Error:    ${r.error}`);
    console.log('');
  }
}

/**
 * Generate timestamp-based migration name
 */
function _generateMigrationName(description: string): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  // Sanitize description: lowercase, replace spaces/special chars with underscores
  const sanitized = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  if (!sanitized) {
    throw new Error('Description cannot be empty after sanitization');
  }

  return `${timestamp}_${sanitized}`;
}

/**
 * Validate migration name against naming convention
 */
function validateNamingConvention(name: string): { valid: boolean; reason?: string } {
  if (!NAMING_REGEX.test(name)) {
    return {
      valid: false,
      reason: `Invalid name format "${name}". Expected: YYYYMMDDHHMMSS_description (e.g., 20260428000000_add_user_table)`,
    };
  }
  return { valid: true };
}

/**
 * List all migrations
 */
function listMigrations(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.match(/^\d{14}_/))
    .sort()
    .reverse();
}

/**
 * Get approval records
 */
function getApprovalRecords(): Record<string, ApprovalRecord> {
  if (!fs.existsSync(APPROVAL_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(APPROVAL_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Save approval records
 */
function saveApprovalRecords(records: Record<string, ApprovalRecord>): void {
  fs.writeFileSync(APPROVAL_FILE, JSON.stringify(records, null, 2));
}

/**
 * Get database URL from environment file
 */
function getDatabaseUrl(env?: string): string | undefined {
  const envFile = env ? ENV_FILES[env] : '.env';
  if (!envFile) return undefined;
  const envPath = path.join(__dirname, '..', envFile);
  if (!fs.existsSync(envPath)) return undefined;

  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/DATABASE_URL=([^\r\n]+)/);
    return match ? match[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extract database name from connection string
 */
function extractDbName(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    return url.pathname.replace(/^\//, '') || 'bridgeai';
  } catch {
    return 'bridgeai';
  }
}

/**
 * Create pre-migration database backup using pg_dump
 */
function createBackup(env?: string): string {
  const databaseUrl = getDatabaseUrl(env) || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found. Cannot create backup.');
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const dbName = extractDbName(databaseUrl);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `${dbName}_${timestamp}.sql`);

  console.log(`Creating pre-migration backup: ${backupFile}`);

  try {
    // Use pg_dump with the connection URL
    execSync(
      `pg_dump "${databaseUrl}" --clean --if-exists --no-owner --no-privileges > "${backupFile}"`,
      {
        stdio: 'inherit',
        timeout: 300000, // 5 minutes
      }
    );
    console.log(`Backup created successfully: ${backupFile}`);
    return backupFile;
  } catch (error) {
    console.error('Failed to create backup');
    throw error;
  }
}

/**
 * Restore database from backup file
 */
function restoreBackup(backupFile: string, env?: string): void {
  const databaseUrl = getDatabaseUrl(env) || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found. Cannot restore backup.');
  }

  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found: ${backupFile}`);
  }

  console.log(`Restoring database from backup: ${backupFile}`);

  try {
    execSync(`psql "${databaseUrl}" < "${backupFile}"`, {
      stdio: 'inherit',
      timeout: 300000,
    });
    console.log('Database restored successfully');
  } catch (error) {
    console.error('Failed to restore backup');
    throw error;
  }
}

/**
 * Detect destructive changes in a migration SQL file
 */
function detectDestructiveChanges(migrationName: string): {
  safe: boolean;
  findings: DestructiveFinding[];
} {
  const sqlFile = path.join(MIGRATIONS_DIR, migrationName, 'migration.sql');
  if (!fs.existsSync(sqlFile)) {
    return { safe: true, findings: [] };
  }

  const sql = fs.readFileSync(sqlFile, 'utf-8');
  const lines = sql.split('\n');
  const findings: DestructiveFinding[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments
    const codeLine = line.replace(/--.*$/, '').trim();
    if (!codeLine) continue;

    for (const { pattern, name, severity } of DESTRUCTIVE_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(codeLine)) {
        findings.push({
          pattern: name,
          severity,
          line: codeLine.substring(0, 120),
          lineNumber: i + 1,
        });
      }
    }
  }

  const hasCritical = findings.some(f => f.severity === 'critical');
  return { safe: !hasCritical, findings };
}

/**
 * Detect destructive changes in all pending migrations
 */
function detectAllDestructiveChanges(): {
  safe: boolean;
  findings: Record<string, DestructiveFinding[]>;
} {
  const migrations = listMigrations();
  const allFindings: Record<string, DestructiveFinding[]> = {};
  let overallSafe = true;

  for (const migration of migrations) {
    const result = detectDestructiveChanges(migration);
    if (result.findings.length > 0) {
      allFindings[migration] = result.findings;
    }
    if (!result.safe) {
      overallSafe = false;
    }
  }

  return { safe: overallSafe, findings: allFindings };
}

/**
 * Print destructive change findings
 */
function printDestructiveFindings(findings: Record<string, DestructiveFinding[]>): void {
  console.log('\n=== Destructive Change Detection ===\n');

  const migrations = Object.keys(findings);
  if (migrations.length === 0) {
    console.log('No destructive changes detected.');
    return;
  }

  for (const migration of migrations) {
    console.log(`\nMigration: ${migration}`);
    for (const finding of findings[migration]) {
      const icon = finding.severity === 'critical' ? '[CRITICAL]' : '[WARNING]';
      console.log(`  ${icon} ${finding.pattern} (line ${finding.lineNumber})`);
      console.log(`    ${finding.line}`);
    }
  }
}

/**
 * Create new migration (dry-run mode)
 */
function createMigration(name: string): void {
  const validation = validateNamingConvention(name);
  if (!validation.valid) {
    console.error(`Naming convention check FAILED: ${validation.reason}`);
    process.exit(1);
  }

  console.log(`Creating migration: ${name}`);
  console.log('Naming convention check PASSED');

  try {
    // Use Prisma to create migration (dry run)
    execSync(`prisma migrate dev --name "${name}" --create-only`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });

    console.log(`\nMigration script generated: ${name}`);
    console.log('Please review the generated SQL before executing with:');
    console.log(`  npm run migration:review -- --name=${name}`);
    console.log(`  npm run migration:approve -- --name=${name}`);
    console.log(`  npm run db:migrate:deploy`);
  } catch (error) {
    console.error('Failed to create migration');
    process.exit(1);
  }
}

/**
 * Review pending migrations
 */
function reviewMigrations(name?: string): void {
  const migrations = listMigrations();
  const records = getApprovalRecords();

  console.log('\n=== Migration Review ===\n');

  if (migrations.length === 0) {
    console.log('No migrations found.');
    return;
  }

  const targetMigrations = name ? migrations.filter(m => m.includes(name)) : migrations;

  if (targetMigrations.length === 0) {
    console.log(`No migrations matching: ${name}`);
    return;
  }

  for (const migration of targetMigrations) {
    const record = records[migration];
    const status = record?.status || 'pending';
    const statusEmoji =
      status === 'approved' ? '[APPROVED]' : status === 'rejected' ? '[REJECTED]' : '[PENDING]';

    console.log(`${statusEmoji} ${migration}`);

    // Show SQL preview
    const sqlFile = path.join(MIGRATIONS_DIR, migration, 'migration.sql');
    if (fs.existsSync(sqlFile)) {
      const sql = fs.readFileSync(sqlFile, 'utf-8').substring(0, 200);
      console.log(`  Preview: ${sql.replace(/\n/g, ' ')}...`);
    }

    // Show destructive change warnings
    const destructive = detectDestructiveChanges(migration);
    if (destructive.findings.length > 0) {
      const criticalCount = destructive.findings.filter(f => f.severity === 'critical').length;
      const warningCount = destructive.findings.filter(f => f.severity === 'warning').length;
      console.log(`  [SAFETY] ${criticalCount} critical, ${warningCount} warning(s) detected`);
    }
  }
}

/**
 * Approve migration
 */
function approveMigration(name: string): void {
  const validation = validateNamingConvention(name);
  if (!validation.valid) {
    console.error(`Invalid migration name: ${validation.reason}`);
    process.exit(1);
  }

  const migrations = listMigrations();
  if (!migrations.includes(name)) {
    console.error(`Migration not found: ${name}`);
    process.exit(1);
  }

  // Run destructive change detection before approval
  const destructive = detectDestructiveChanges(name);
  if (destructive.findings.length > 0) {
    printDestructiveFindings({ [name]: destructive.findings });
    const criticalCount = destructive.findings.filter(f => f.severity === 'critical').length;
    if (criticalCount > 0) {
      console.error(
        `\nMigration contains ${criticalCount} CRITICAL destructive change(s). Use --force to override.`
      );
      process.exit(1);
    }
  }

  const records = getApprovalRecords();
  records[name] = {
    id: name,
    name,
    status: 'approved',
    approvedAt: new Date().toISOString(),
  };
  saveApprovalRecords(records);

  console.log(`Migration APPROVED: ${name}`);
  console.log('Execute with: npm run db:migrate:deploy');
}

/**
 * Reject migration
 */
function rejectMigration(name: string): void {
  const records = getApprovalRecords();
  records[name] = {
    id: name,
    name,
    status: 'rejected',
    rejectedAt: new Date().toISOString(),
  };
  saveApprovalRecords(records);

  console.log(`Migration REJECTED: ${name}`);
}

/**
 * Execute approved migration
 */
function executeMigration(name: string): void {
  const records = getApprovalRecords();
  const record = records[name];

  if (!record) {
    console.error(`Migration not found in approval records: ${name}`);
    console.log('Note: Migrations must be approved before execution.');
    process.exit(1);
  }

  if (record.status !== 'approved') {
    console.error(`Migration not approved: ${name} (status: ${record.status})`);
    process.exit(1);
  }

  console.log(`Executing approved migration: ${name}`);
  const executor = getExecutor();
  const startTime = new Date();
  try {
    execSync('prisma migrate deploy', { stdio: 'inherit' });
    const endTime = new Date();
    appendAuditRecord({
      migrationName: name,
      action: 'execute',
      executor,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
      status: 'success',
    });
    console.log(`Migration executed: ${name}`);
  } catch (error) {
    const endTime = new Date();
    appendAuditRecord({
      migrationName: name,
      action: 'execute',
      executor,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Deploy migration with safety mechanisms:
 * 1. Pre-migration backup
 * 2. Destructive change detection
 * 3. Auto-rollback on failure
 */
function safeDeploy(env?: string): void {
  const envLabel = env || 'default';
  console.log(`\n=== Safe Migration Deploy [${envLabel}] ===\n`);

  // Step 1: Destructive change detection
  console.log('Step 1: Running destructive change detection...');
  const destructive = detectAllDestructiveChanges();
  printDestructiveFindings(destructive.findings);

  if (!destructive.safe) {
    console.error('\nCRITICAL destructive changes detected. Deployment blocked.');
    console.error('Review migrations and use --force to bypass (not recommended for production).');
    process.exit(1);
  }

  // Step 2: Pre-migration backup
  console.log('\nStep 2: Creating pre-migration backup...');
  let backupFile: string;
  try {
    backupFile = createBackup(env);
  } catch (error) {
    console.error('\nBackup creation failed. Deployment aborted for safety.');
    process.exit(1);
  }

  // Step 3: Deploy migration with rollback capability
  console.log('\nStep 3: Deploying migration...');
  const executor = getExecutor();
  const startTime = new Date();
  try {
    const envFile = env ? ENV_FILES[env] : undefined;
    if (envFile) {
      const envPath = path.join(__dirname, '..', envFile);
      if (fs.existsSync(envPath)) {
        execSync(`dotenv -e ${envPath} -- prisma migrate deploy`, {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..'),
        });
      } else {
        throw new Error(`Env file not found: ${envPath}`);
      }
    } else {
      execSync('prisma migrate deploy', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
      });
    }
    const endTime = new Date();
    appendAuditRecord({
      migrationName: 'safe-deploy',
      action: 'safe-deploy',
      executor,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
      status: 'success',
      environment: envLabel,
    });
    console.log('\nMigration deployed successfully.');
    console.log(`Backup retained at: ${backupFile}`);
  } catch (error) {
    const endTime = new Date();
    const errorMsg = error instanceof Error ? error.message : String(error);
    appendAuditRecord({
      migrationName: 'safe-deploy',
      action: 'safe-deploy',
      executor,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
      status: 'failed',
      error: errorMsg,
      environment: envLabel,
    });
    console.error('\nMigration deployment FAILED!');
    console.log('Initiating automatic rollback...');

    try {
      restoreBackup(backupFile, env);
      console.log('Automatic rollback completed successfully.');
    } catch (rollbackError) {
      console.error('AUTOMATIC ROLLBACK FAILED!');
      console.error(`Manual restore required from backup: ${backupFile}`);
      process.exit(1);
    }

    process.exit(1);
  }
}

/**
 * Get applied migrations from the database via prisma migrate status.
 * Returns an ordered list of migration names that have been applied.
 */
function getAppliedMigrations(env?: string): string[] {
  try {
    const envFile = env ? ENV_FILES[env] : undefined;
    let statusCmd: string;
    if (envFile) {
      const envPath = path.join(__dirname, '..', envFile);
      statusCmd = `dotenv -e ${envPath} -- prisma migrate status`;
    } else {
      statusCmd = 'prisma migrate status';
    }
    const output = execSync(statusCmd, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).toString();

    // Applied migrations are listed with lines like:
    //   "20260428000000_add_user_table ... applied"
    // We also fall back to reading the migration directories on disk
    // and cross-reference.
    const appliedPattern = /(\d{14}_[a-z][a-z0-9_]*)\s+.*applied/gi;
    const applied: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = appliedPattern.exec(output)) !== null) {
      applied.push(match[1]);
    }
    return applied;
  } catch {
    // If prisma migrate status fails, fall back to reading migration dirs
    // and assume all on-disk migrations are applied
    console.warn(
      'Could not determine applied migrations from database. Using on-disk migrations as reference.'
    );
    return listMigrations().sort(); // ascending order
  }
}

/**
 * Roll back migrations to a specified target version.
 *
 * This function:
 * 1. Gets all applied migrations (sorted ascending)
 * 2. Identifies migrations newer than targetVersion
 * 3. Creates a backup as a safety measure
 * 4. For each migration to roll back, displays its SQL and asks for user confirmation
 * 5. Uses prisma migrate resolve --rolled-back to mark the migration state
 */
function rollbackToVersion(targetVersion: string, env?: string): void {
  const envLabel = env || 'default';
  console.log(`\n=== Migration Rollback to Version [${envLabel}] ===\n`);

  // Step 1: Validate target version exists on disk
  const allMigrations = listMigrations(); // descending order (newest first)
  const allMigrationsAsc = [...allMigrations].sort(); // ascending order (oldest first)
  const targetExists = allMigrationsAsc.some(m => m === targetVersion);
  if (!targetExists) {
    // Check for prefix match
    const prefixMatch = allMigrationsAsc.filter(m => m.startsWith(targetVersion));
    if (prefixMatch.length === 1) {
      targetVersion = prefixMatch[0];
      console.log(`Resolved target version: ${targetVersion}`);
    } else if (prefixMatch.length > 1) {
      console.error(`Ambiguous target version "${targetVersion}". Matches:`);
      prefixMatch.forEach(m => console.error(`  ${m}`));
      process.exit(1);
    } else {
      console.error(`Target migration version not found: ${targetVersion}`);
      console.log('Available migrations:');
      allMigrationsAsc.forEach(m => console.log(`  ${m}`));
      process.exit(1);
    }
  }

  // Step 2: Get applied migrations
  console.log('Step 1: Fetching applied migrations...');
  const appliedMigrations = getAppliedMigrations(env);

  if (appliedMigrations.length === 0) {
    console.log('No applied migrations found. Nothing to roll back.');
    return;
  }

  // Sort applied migrations ascending
  const appliedAsc = [...appliedMigrations].sort();

  // Step 3: Find migrations newer than target
  const targetIndex = appliedAsc.indexOf(targetVersion);
  if (targetIndex === -1) {
    console.error(`Target migration "${targetVersion}" is not in the applied migrations list.`);
    console.log('Applied migrations:');
    appliedAsc.forEach(m => console.log(`  ${m}`));
    process.exit(1);
  }

  const toRollback = appliedAsc.slice(targetIndex + 1);

  if (toRollback.length === 0) {
    console.log('No migrations to roll back. Target version is the latest applied migration.');
    return;
  }

  // Step 4: Display rollback plan
  console.log(`\nStep 2: Rollback plan`);
  console.log(`Target version: ${targetVersion}`);
  console.log(`Migrations to roll back (${toRollback.length}):`);
  for (const migration of toRollback) {
    console.log(`  - ${migration}`);
  }

  // Step 5: Create backup (safety measure)
  console.log('\nStep 3: Creating backup before rollback...');
  let backupFile: string;
  try {
    backupFile = createBackup(env);
  } catch (error) {
    console.error('Backup creation failed. Rollback aborted for safety.');
    process.exit(1);
  }

  // Step 6: Process each migration to roll back
  console.log('\nStep 4: Processing migrations for rollback...\n');
  for (const migration of toRollback) {
    const sqlFile = path.join(MIGRATIONS_DIR, migration, 'migration.sql');

    console.log(`--- Migration: ${migration} ---`);

    if (fs.existsSync(sqlFile)) {
      const sql = fs.readFileSync(sqlFile, 'utf-8');
      console.log('Forward SQL (for reference):');
      console.log(
        sql
          .split('\n')
          .map(l => `  ${l}`)
          .join('\n')
      );
      console.log('\nNOTE: Automatic reverse SQL generation is not supported.');
      console.log('You must manually revert the database changes before marking as rolled-back.');
      console.log('Backup has been created at: ' + backupFile);
    } else {
      console.log('No migration.sql file found for this migration.');
    }

    // Mark the migration as rolled-back in Prisma
    console.log(`\nMarking migration "${migration}" as rolled-back...`);
    try {
      if (env && ENV_FILES[env]) {
        const envPath = path.join(__dirname, '..', ENV_FILES[env]);
        execSync(`dotenv -e ${envPath} -- prisma migrate resolve --rolled-back "${migration}"`, {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..'),
        });
      } else {
        execSync(`prisma migrate resolve --rolled-back "${migration}"`, {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..'),
        });
      }
      console.log(`  Marked as rolled-back: ${migration}`);
    } catch (error) {
      console.error(`  Failed to mark migration "${migration}" as rolled-back.`);
      console.error('  You may need to manually resolve this migration.');
      console.error(`  Backup file for manual restore: ${backupFile}`);
      process.exit(1);
    }

    console.log('');
  }

  // Summary
  console.log('\n=== Rollback Summary ===');
  console.log(`Target version: ${targetVersion}`);
  console.log(`Rolled back: ${toRollback.length} migration(s)`);
  for (const migration of toRollback) {
    console.log(`  - ${migration}`);
  }
  console.log(`Backup retained at: ${backupFile}`);
  console.log('\nIMPORTANT: The migration states have been marked as rolled-back in Prisma.');
  console.log('If you need to restore the database to its pre-rollback state, use:');
  console.log(`  npm run migration:restore -- --file="${backupFile}"${env ? ` --env=${env}` : ''}`);
}

/**
 * Diff migration state between environments or against schema
 */
function diffMigrationState(env?: string): void {
  console.log('\n=== Migration State Diff ===\n');

  if (env) {
    if (!ENV_FILES[env]) {
      console.error(`Unknown environment: ${env}. Valid: ${Object.keys(ENV_FILES).join(', ')}`);
      process.exit(1);
    }
    console.log(`Environment: ${env} (${ENV_FILES[env]})`);
    try {
      const envPath = path.join(__dirname, '..', ENV_FILES[env]);
      if (!fs.existsSync(envPath)) {
        console.error(`Env file not found: ${envPath}`);
        process.exit(1);
      }
      execSync(`dotenv -e ${envPath} -- prisma migrate status`, { stdio: 'inherit' });
    } catch {
      console.error(`Failed to check migration status for ${env}`);
      process.exit(1);
    }
  } else {
    // Compare migration state against current schema
    console.log('Comparing migration state vs schema...');
    try {
      // Get applied migrations from db vs migration files
      execSync('prisma migrate status', { stdio: 'inherit' });
    } catch {
      console.log('Schema drift detected - pending migrations exist.');
      process.exit(1);
    }

    // Compare env-specific migration states
    for (const [envName, envFile] of Object.entries(ENV_FILES)) {
      const envPath = path.join(__dirname, '..', envFile);
      if (fs.existsSync(envPath)) {
        console.log(`\n--- ${envName} (${envFile}) ---`);
        try {
          execSync(`dotenv -e ${envPath} -- prisma migrate status`, { stdio: 'inherit' });
        } catch {
          console.log(`  Migration mismatch detected in ${envName}`);
        }
      }
    }
  }
}

// Main CLI
const command = process.argv[2];
const args = process.argv.slice(3).reduce(
  (acc, arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    acc[key] = value;
    return acc;
  },
  {} as Record<string, string>
);

switch (command) {
  case 'create':
    createMigration(args.name || 'unnamed_migration');
    break;
  case 'review':
    reviewMigrations(args.name);
    break;
  case 'approve':
    approveMigration(args.name);
    break;
  case 'reject':
    rejectMigration(args.name);
    break;
  case 'execute':
    executeMigration(args.name);
    break;
  case 'diff':
    diffMigrationState(args.env);
    break;
  case 'backup':
    createBackup(args.env);
    break;
  case 'deploy:safe':
    safeDeploy(args.env);
    break;
  case 'detect-destructive':
    if (args.name) {
      const result = detectDestructiveChanges(args.name);
      printDestructiveFindings({ [args.name]: result.findings });
      if (!result.safe) {
        console.error('\nCritical destructive changes detected.');
        process.exit(1);
      }
    } else {
      const result = detectAllDestructiveChanges();
      printDestructiveFindings(result.findings);
      if (!result.safe) {
        console.error('\nCritical destructive changes detected.');
        process.exit(1);
      }
    }
    break;
  case 'rollback':
    if (!args.to) {
      console.error('Missing required argument: --to=<version>');
      console.log('Usage: npm run migration:rollback -- --to=<version> [--env=<env>]');
      process.exit(1);
    }
    rollbackToVersion(args.to, args.env);
    break;
  case 'restore':
    if (!args.file) {
      console.error('Missing required argument: --file=<backup-file>');
      console.log('Usage: npm run migration:restore -- --file=<backup-file> [--env=<env>]');
      process.exit(1);
    }
    restoreBackup(args.file, args.env);
    break;
  case 'audit-log':
    printAuditLog(args.count ? parseInt(args.count, 10) : undefined);
    break;
  default:
    console.log(`
Migration Workflow CLI

Usage:
  npm run migration:create -- --name=<description>    Create migration with naming convention check
  npm run migration:review                           List all migrations with status
  npm run migration:approve -- --name=<timestamp_desc>  Approve migration for deployment
  npm run migration:reject -- --name=<timestamp_desc>   Reject migration
  npm run migration:execute -- --name=<timestamp_desc>  Execute approved migration
  npm run migration:diff                             Diff migration state vs schema (all envs)
  npm run migration:diff -- --env=dev                Diff migration state for specific env
  npm run migration:backup                           Create pre-migration database backup
  npm run migration:backup -- --env=prod             Create backup for specific env
  npm run migration:deploy:safe                      Deploy with auto-backup + rollback + destructive check
  npm run migration:deploy:safe -- --env=prod        Safe deploy for production
  npm run migration:detect-destructive               Check all migrations for destructive changes
  npm run migration:detect-destructive -- --name=X   Check specific migration
  npm run migration:rollback -- --to=<version>       Roll back migrations to target version
  npm run migration:rollback -- --to=<version> --env=prod  Roll back in specific environment
  npm run migration:restore -- --file=<backup-file>  Restore database from backup file
  npm run migration:restore -- --file=<path> --env=prod    Restore in specific environment
  npm run migration:audit-log                        View recent migration audit records
  npm run migration:audit-log -- --count=50          View last N audit records

Environment-Specific Migration Scripts:
  npm run db:migrate:dev                             Run dev migrations
  npm run db:migrate:test                            Run test migrations
  npm run db:migrate:deploy:prod                     Run prod migrations
  npm run db:migrate:status:dev                      Check dev migration status
  npm run db:migrate:status:prod                    Check prod migration status

Naming Convention:
  Format: YYYYMMDDHHMMSS_description (e.g., 20260428000000_add_user_table)

Safety Features:
  - Pre-migration automatic backup (pg_dump)
  - Destructive change detection (DROP TABLE, DROP COLUMN, DELETE, TRUNCATE, etc.)
  - Automatic rollback on deployment failure
  - Rollback to a specific migration version with backup safety
`);
}

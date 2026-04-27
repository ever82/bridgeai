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
  execSync('prisma migrate deploy', { stdio: 'inherit' });
  console.log(`Migration executed: ${name}`);
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
    console.log('\nMigration deployed successfully.');
    console.log(`Backup retained at: ${backupFile}`);
  } catch (error) {
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
`);
}

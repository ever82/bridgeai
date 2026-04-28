#!/usr/bin/env tsx
/**
 * API Documentation Generator
 * Generates OpenAPI spec JSON from swagger-jsdoc annotations
 *
 * Usage:
 *   npm run docs:generate          - Generate OpenAPI JSON spec
 *   npm run docs:generate:watch    - Watch mode (regenerate on file changes)
 */

import { writeFileSync, mkdirSync, watch } from 'fs';
import { join } from 'path';

// Import the OpenAPI spec from server config
const specPath = join(__dirname, '..', 'src', 'config', 'openapi');

async function generateDocs(): Promise<void> {
  const outputDir = join(__dirname, '..', 'docs', 'api');

  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true });

  try {
    // Dynamic import for ESM/TS compatibility
    const { serveOpenApiSpec } = await import(specPath);
    const spec = serveOpenApiSpec;

    // Write OpenAPI JSON spec
    const jsonPath = join(outputDir, 'openapi.json');
    writeFileSync(jsonPath, JSON.stringify(spec, null, 2));
    console.log(`Generated OpenAPI JSON: ${jsonPath}`);

    const pathCount = Object.keys(spec.paths || {}).length;
    const tagCount = (spec.tags || []).length;
    console.log(`  Paths: ${pathCount}, Tags: ${tagCount}`);

    if (pathCount === 0) {
      console.warn(
        'Warning: No paths found in spec. Ensure src/docs/*.docs.ts files contain valid JSDoc annotations.'
      );
    }
  } catch (error) {
    console.error('Failed to generate documentation:', error);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const watchMode = args.includes('--watch');

  // Initial generation
  await generateDocs();

  if (watchMode) {
    const docsDir = join(__dirname, '..', 'src', 'docs');
    console.log(`\nWatching for changes in ${docsDir}...`);

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    watch(docsDir, { recursive: true }, (_event, filename) => {
      if (!filename?.endsWith('.ts')) return;

      // Debounce to avoid rapid regeneration
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        console.log(`\nChange detected: ${filename}`);
        await generateDocs();
      }, 300);
    });

    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\nStopping watch mode...');
      process.exit(0);
    });
  }
}

main();

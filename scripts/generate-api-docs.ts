#!/usr/bin/env tsx
/**
 * API Documentation Generator
 * Generates static OpenAPI spec JSON and markdown documentation
 *
 * Usage:
 *   npm run docs:generate          - Generate OpenAPI JSON spec
 *   npm run docs:generate:static   - Generate static HTML docs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Import the OpenAPI spec from server config
const specPath = join(__dirname, '..', 'apps', 'server', 'src', 'config', 'openapi');

async function main() {
  const outputDir = join(__dirname, '..', 'docs', 'api');

  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true });

  try {
    // Dynamic import for TypeScript path
    const { serveOpenApiSpec } = await import(specPath);
    const spec = serveOpenApiSpec;

    // Write OpenAPI JSON spec
    const jsonPath = join(outputDir, 'openapi.json');
    writeFileSync(jsonPath, JSON.stringify(spec, null, 2));
    console.log(`Generated OpenAPI JSON: ${jsonPath}`);

    // Write YAML version (manual conversion)
    const yamlPath = join(outputDir, 'openapi.yaml');
    const yamlContent = jsonToYaml(spec);
    writeFileSync(yamlPath, yamlContent);
    console.log(`Generated OpenAPI YAML: ${yamlPath}`);

    // Generate markdown summary
    const mdPath = join(outputDir, 'README.md');
    const mdContent = generateMarkdown(spec);
    writeFileSync(mdPath, mdContent);
    console.log(`Generated API docs markdown: ${mdPath}`);

    console.log('\nDocumentation generated successfully!');
    console.log(`  JSON: ${jsonPath}`);
    console.log(`  YAML: ${yamlPath}`);
    console.log(`  Markdown: ${mdPath}`);
    console.log(`\nSwagger UI available at: http://localhost:3000/api-docs`);
  } catch (error) {
    console.error('Failed to generate documentation:', error);
    process.exit(1);
  }
}

function jsonToYaml(obj: any, indent: number = 0): string {
  const prefix = '  '.repeat(indent);
  let result = '';

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object' && item !== null) {
        result += `${prefix}- ${jsonToYaml(item, indent + 1).trimStart()}\n`;
      } else {
        result += `${prefix}- ${formatYamlValue(item)}\n`;
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        result += `${prefix}${key}:\n${jsonToYaml(value, indent + 1)}`;
      } else {
        result += `${prefix}${key}: ${formatYamlValue(value)}\n`;
      }
    }
  }

  return result;
}

function formatYamlValue(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (value.includes(':') || value.includes('#') || value.includes("'") || value.includes('\n')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value || '""';
  }
  return String(value);
}

function generateMarkdown(spec: any): string {
  let md = `# BridgeAI API Documentation\n\n`;
  md += `**Version:** ${spec.info?.version || '1.0.0'}\n\n`;
  md += `${spec.info?.description || ''}\n\n`;
  md += `**Base URL:** \`${spec.servers?.[0]?.url || 'http://localhost:3000'}\`\n\n`;
  md += `**Authentication:** JWT Bearer Token\n\n`;

  if (spec.tags) {
    md += `## API Modules\n\n`;
    for (const tag of spec.tags) {
      md += `- **${tag.name}**: ${tag.description}\n`;
    }
    md += `\n`;
  }

  if (spec.paths) {
    md += `## Endpoints\n\n`;
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, detail] of Object.entries(methods as any)) {
        const d = detail as any;
        const tags = d.tags?.join(', ') || 'General';
        md += `### \`${method.toUpperCase()}\` ${path}\n\n`;
        md += `**Tags:** ${tags}  \n`;
        md += `**Summary:** ${d.summary || ''}  \n`;
        md += `${d.description || ''}\n\n`;
        if (d.security) {
          md += `*Requires authentication*\n\n`;
        }
      }
    }
  }

  md += `\n---\n\n`;
  md += `*Generated on ${new Date().toISOString()}*\n`;
  md += `\nInteractive docs: [Swagger UI](/api-docs)\n`;

  return md;
}

main();
#!/usr/bin/env node
/**
 * Audit Coverage Check Script
 * Grep-based inventory of createAuditLog calls to ensure comprehensive audit logging
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_SRC = path.join(__dirname, '../src');

/**
 * Run grep command and return results
 */
function grep(pattern, directory) {
  try {
    const result = execSync(
      `grep -r -n --include="*.ts" --include="*.js" "${pattern}" "${directory}"`,
      { encoding: 'utf-8', cwd: __dirname }
    );
    return result.trim().split('\n').filter(Boolean);
  } catch (error) {
    return [];
  }
}

/**
 * Find all controller files
 */
function getControllers() {
  const controllersDir = path.join(SERVER_SRC, 'controllers');
  if (!fs.existsSync(controllersDir)) return [];
  return fs.readdirSync(controllersDir).filter(f => f.endsWith('.controller.ts'));
}

/**
 * Check if a controller uses createAuditLog
 */
function checkControllerAuditCoverage(controllerFile) {
  const filePath = path.join(SERVER_SRC, 'controllers', controllerFile);
  const content = fs.readFileSync(filePath, 'utf-8');

  const hasCreateAuditLog = /createAuditLog|AuditService\.create/.test(content);
  const hasRouteHandlers = /async function \w+Handler|export async function \w+Handler/.test(content);
  const hasMutationRoutes = /POST|PUT|DELETE|PATCH/.test(content);

  return {
    file: controllerFile,
    hasCreateAuditLog,
    hasRouteHandlers,
    hasMutationRoutes,
    likelyMissingAudit: hasMutationRoutes && !hasCreateAuditLog
  };
}

/**
 * Main execution
 */
function main() {
  console.log('=== Audit Coverage Check ===\n');

  // Find all createAuditLog calls
  const createAuditLogCalls = grep('createAuditLog', SERVER_SRC);
  console.log(`Found ${createAuditLogCalls.length} createAuditLog calls:`);
  createAuditLogCalls.forEach(call => console.log(`  - ${call}`));

  // Find all AuditService.create calls
  const serviceCreateCalls = grep('AuditService\\.create', SERVER_SRC);
  console.log(`\nFound ${serviceCreateCalls.length} AuditService.create calls:`);
  serviceCreateCalls.forEach(call => console.log(`  - ${call}`));

  // Check controllers for missing audit
  console.log('\n=== Controller Audit Coverage ===');
  const controllers = getControllers();
  const controllersNeedingAudit = [];

  controllers.forEach(controller => {
    const coverage = checkControllerAuditCoverage(controller);
    if (coverage.likelyMissingAudit) {
      controllersNeedingAudit.push(coverage.file);
      console.log(`⚠️  ${controller} - likely missing audit logging`);
    } else if (coverage.hasCreateAuditLog) {
      console.log(`✓ ${controller} - has audit logging`);
    } else {
      console.log(`○ ${controller} - no mutation routes`);
    }
  });

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total controllers: ${controllers.length}`);
  console.log(`Controllers with audit: ${controllers.length - controllersNeedingAudit.length}`);
  console.log(`Controllers likely missing audit: ${controllersNeedingAudit.length}`);

  if (controllersNeedingAudit.length > 0) {
    console.log('\n⚠️  Recommended: Add audit logging to:');
    controllersNeedingAudit.forEach(c => console.log(`  - ${c}`));
    process.exit(1);
  } else {
    console.log('\n✓ All controllers with mutation routes have audit logging');
    process.exit(0);
  }
}

main();

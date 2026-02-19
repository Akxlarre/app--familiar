#!/usr/bin/env node
/**
 * Pre-commit hook: Detect prohibited Tailwind color classes
 * Design System Auto Escuelas - use tokens instead
 *
 * Prohibited: text-pink-*, bg-pink-*, text-blue-500, bg-blue-50,
 * text-red-700, bg-red-50 (except in error components),
 * text-orange-*, bg-orange-*, text-purple-*, bg-purple-*,
 * text-green-*, bg-green-* (use text-success, bg-success for success state)
 */

const fs = require('fs');
const path = require('path');

const PROHIBITED_PATTERNS = [
  /\btext-pink-\d+/,
  /\bbg-pink-\d+/,
  /\btext-blue-(50|100|200|300|400|500|600|700|800|900)/,
  /\bbg-blue-(50|100|200|300|400|500|600|700|800|900)/,
  /\btext-red-(50|100|200|300|400|500|600|700|800|900)/,
  /\bbg-red-(50|100|200|300|400|500|600|700|800|900)/,
  /\btext-orange-(50|100|200|300|400|500|600|700|800|900)/,
  /\bbg-orange-(50|100|200|300|400|500|600|700|800|900)/,
  /\btext-purple-(50|100|200|300|400|500|600|700|800|900)/,
  /\bbg-purple-(50|100|200|300|400|500|600|700|800|900)/,
  /\btext-green-(50|100|200|300|400|500|600|700|800|900)/,
  /\bbg-green-(50|100|200|300|400|500|600|700|800|900)/,
];

const ALLOWED_FILES = [
  'check-design-tokens.js',
  'tailwind.css',
  '_variables.scss',
  '_primeng-overrides.scss',
  'BRAND_GUIDELINES.md',
];

function getStagedFiles() {
  try {
    const result = require('child_process').execSync('git diff --cached --name-only', {
      encoding: 'utf-8',
    });
    return result.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function checkFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return [];
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, i) => {
    PROHIBITED_PATTERNS.forEach((pattern) => {
      const match = line.match(pattern);
      if (match) {
        violations.push({ file: filePath, line: i + 1, match: match[0], content: line.trim() });
      }
    });
  });

  return violations;
}

function getAllSourceFiles() {
  const { execSync } = require('child_process');
  try {
    const result = execSync('git ls-files "src/**/*.ts" "src/**/*.html" "src/**/*.scss"', {
      encoding: 'utf-8',
    });
    return result.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function main() {
  const checkAll = process.argv.includes('--all');
  const staged = getStagedFiles();
  const toCheck = checkAll
    ? getAllSourceFiles()
    : staged.filter(
        (f) =>
          (f.endsWith('.ts') || f.endsWith('.html') || f.endsWith('.scss')) &&
          !ALLOWED_FILES.some((a) => f.includes(a))
      );

  const allViolations = [];
  toCheck.forEach((file) => {
    allViolations.push(...checkFile(file));
  });

  if (allViolations.length > 0) {
    console.error('\n❌ Design System: Clases de color prohibidas detectadas.\n');
    console.error('Usa tokens: text-primary, bg-primary-muted, text-muted, text-success, text-warning, text-error\n');
    allViolations.forEach((v) => {
      console.error(`  ${v.file}:${v.line} - "${v.match}"`);
      console.error(`    ${v.content.substring(0, 80)}...`);
    });
    console.error('\nVer .cursor/rules/design-system-enforcement.mdc\n');
    process.exit(1);
  }

  process.exit(0);
}

main();

#!/usr/bin/env node
/**
 * Production-safe Reports regression suite. Exit 0 only if all pass.
 * Usage: REPORT_TEST_URL=https://embroidery-inventory-manager.vercel.app npm run test:reports
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname);
const url = process.env.REPORT_TEST_URL || 'https://embroidery-inventory-manager.vercel.app';
const env = { ...process.env, REPORT_TEST_URL: url };

const suites = [
    'verify-reports-october-e2e.js',
    'verify-reports-user-paths.js',
    'verify-reports-apply-shows-table.js'
];

console.log('Reports verification against', url);

for (const file of suites) {
    console.log('\n---', file, '---');
    const r = spawnSync(process.execPath, [path.join(root, file)], { env, stdio: 'inherit' });
    if (r.status !== 0) {
        console.error('\nFAILED:', file);
        process.exit(1);
    }
}

console.log('\nAll Reports checks passed.');

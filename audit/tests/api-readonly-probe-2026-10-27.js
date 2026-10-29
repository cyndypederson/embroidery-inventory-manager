#!/usr/bin/env node
/**
 * Read-only API probe for audit evidence. Does not mutate production data.
 * Unauthenticated POST sends empty array only (expect 401).
 */
'use strict';

const http = require('http');
const https = require('https');

const targets = [
  { name: 'local', base: 'http://localhost:3002' },
  { name: 'production', base: 'https://embroidery-inventory-manager.vercel.app' }
];

function request(base, path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, base);
    const lib = url.protocol === 'https:' ? https : http;
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    const req = lib.request(url, opts, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, len: data.length, body: data.slice(0, 200) }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  const rows = [];
  for (const t of targets) {
    for (const ep of ['/health', '/api/config', '/api/inventory', '/api/customers', '/api/sales', '/api/invoices']) {
      try {
        const r = await request(t.base, ep);
        rows.push({ target: t.name, method: 'GET', path: ep, status: r.status, bytes: r.len });
      } catch (e) {
        rows.push({ target: t.name, method: 'GET', path: ep, status: 'ERR', bytes: 0, error: e.message });
      }
    }
    try {
      const r = await request(t.base, '/api/inventory', 'POST', []);
      rows.push({ target: t.name, method: 'POST', path: '/api/inventory', status: r.status, bytes: r.len });
    } catch (e) {
      rows.push({ target: t.name, method: 'POST', path: '/api/inventory', status: 'ERR', error: e.message });
    }
  }
  console.log(JSON.stringify({ at: new Date().toISOString(), rows }, null, 2));
})();

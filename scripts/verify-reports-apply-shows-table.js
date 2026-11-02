#!/usr/bin/env node
/** Apply alone must replace welcome screen with sales table (user screenshot bug). */
require('dotenv').config();
const puppeteer = require('puppeteer');

const BASE = process.env.REPORT_TEST_URL || 'http://localhost:3002';
const USER = process.env.ADMIN_USERNAME || 'admin';
const PASS = process.env.ADMIN_PASSWORD || '';

async function main() {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    await page.evaluate(async (c) => {
        await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(c)
        });
    }, { username: USER, password: PASS });
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForFunction(() => window.sales && window.sales.length > 0, { timeout: 30000 });

    await page.click('[data-tab="reports"]');
    await page.waitForSelector('#reportStartDate');
    await page.evaluate(() => {
        document.getElementById('reportDateFilter').value = '';
        document.getElementById('reportStartDate').value = '2026-10-01';
        document.getElementById('reportEndDate').value = '2026-10-31';
    });
    await page.click('button[onclick="applyReportsFilters()"]');
    await new Promise((r) => setTimeout(r, 600));

    const state = await page.evaluate(() => ({
        welcome: !!document.querySelector('#reportContent .welcome-message'),
        rows: document.querySelectorAll('.sales-report .report-table tbody tr').length,
        status: document.getElementById('reportFilterStatus')?.textContent || ''
    }));
    console.log(state);
    await browser.close();

    if (state.welcome || state.rows < 1) {
        console.error('FAIL: Apply must show sales table, not welcome');
        process.exit(1);
    }
    console.log('PASS: Apply shows', state.rows, 'sales rows');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

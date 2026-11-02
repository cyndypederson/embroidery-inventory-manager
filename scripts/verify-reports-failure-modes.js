#!/usr/bin/env node
/** Test user failure modes that yield 0 October sales */
require('dotenv').config();
const puppeteer = require('puppeteer');

const BASE = process.env.REPORT_TEST_URL || 'https://embroidery-inventory-manager.vercel.app';
const USER = process.env.ADMIN_USERNAME || 'admin';
const PASS = process.env.ADMIN_PASSWORD || '';

async function login(page) {
    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
    const ok = await page.evaluate(async (credentials) => {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(credentials)
        });
        return res.ok;
    }, { username: USER, password: PASS });
    if (!ok) throw new Error('login failed');
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.body.classList.contains('user-authenticated'), { timeout: 20000 });
    await page.waitForFunction(() => window.sales && window.sales.length > 0, { timeout: 30000 });
}

async function countOctober(page) {
    return page.evaluate(() => {
        const f = getReportFilters();
        return getFilteredSales(f).length;
    });
}

async function main() {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await login(page);
    await page.click('[data-tab="reports"]');
    await page.waitForSelector('#reportYearFilter');

    const scenarios = [];

    async function run(name, setup) {
        await page.evaluate(() => {
            ['reportDateFilter', 'reportLocationFilter', 'reportStatusFilter', 'reportYearFilter', 'reportMonthFilter', 'reportStartDate', 'reportEndDate'].forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
        });
        await setup();
        const n = await countOctober(page);
        scenarios.push({ name, count: n });
    }

    await run('nothing set (all time)', async () => {});
    await run('This Month preset only', async () => {
        await page.select('#reportDateFilter', 'month');
    });
    await run('October month only no year', async () => {
        await page.select('#reportMonthFilter', '10');
    });
    await run('Year 2025 + October', async () => {
        await page.select('#reportYearFilter', '2025');
        await page.select('#reportMonthFilter', '10');
    });
    await run('Year 2026 + October (no Apply, no date sync)', async () => {
        await page.select('#reportYearFilter', '2026');
        await page.select('#reportMonthFilter', '10');
    });
    await run('Year 2026 + October after change events', async () => {
        await page.select('#reportYearFilter', '2026');
        await page.select('#reportMonthFilter', '10');
        await new Promise((r) => setTimeout(r, 100));
    });
    await run('dates 2025-10-01 to 2025-10-31', async () => {
        await page.evaluate(() => {
            document.getElementById('reportStartDate').value = '2025-10-01';
            document.getElementById('reportEndDate').value = '2025-10-31';
        });
    });
    await run('This Month + October 2026 selected (conflict)', async () => {
        await page.select('#reportDateFilter', 'month');
        await page.select('#reportYearFilter', '2026');
        await page.select('#reportMonthFilter', '10');
    });

    console.log(JSON.stringify(scenarios, null, 2));
    await browser.close();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

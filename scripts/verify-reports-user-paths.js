#!/usr/bin/env node
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

async function main() {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await login(page);

    // Path A: user opens Reports and clicks Sales Report immediately (default = previous month)
    await page.click('[data-tab="reports"]');
    await page.waitForSelector('#reportYearFilter');
    await page.evaluate(() => {
        if (typeof generateSalesReport === 'function') generateSalesReport();
    });
    await new Promise((r) => setTimeout(r, 400));
    let a = await page.evaluate(() => ({
        filtered: getFilteredSales(getReportFilters()).length,
        rows: document.querySelectorAll('.sales-report .report-table tbody tr').length,
        year: document.getElementById('reportYearFilter')?.value,
        month: document.getElementById('reportMonthFilter')?.value
    }));
    console.log('Path A (Sales Report only):', a);

    // Path B: "This Month" trap
    await page.evaluate(() => {
        ['reportYearFilter', 'reportMonthFilter', 'reportStartDate', 'reportEndDate'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('reportDateFilter').value = 'month';
    });
    const bCount = await page.evaluate(() => getFilteredSales(getReportFilters()).length);
    console.log('Path B (This Month only) count:', bCount);

    await browser.close();

    const passA = a.filtered >= 18 && a.rows >= 18 && a.month === '10' && a.year === '2026';
    const passB = bCount === 0; // documents the trap
    if (!passA) {
        console.error('FAIL Path A');
        process.exit(1);
    }
    console.log('PASS Path A — default previous month shows October 2026 sales');
    console.log('NOTE Path B — Current calendar month alone yields', bCount, 'sales (expected 0 in early Nov if no Nov sales)');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

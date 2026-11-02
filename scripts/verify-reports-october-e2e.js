#!/usr/bin/env node
/**
 * E2E: Reports → October 2026 → Sales Report must show sales.
 */
require('dotenv').config();
const puppeteer = require('puppeteer');

const BASE = process.env.REPORT_TEST_URL || 'http://localhost:3002';
const USER = process.env.ADMIN_USERNAME || 'admin';
const PASS = process.env.ADMIN_PASSWORD || '';

async function main() {
    if (!PASS) {
        console.error('ADMIN_PASSWORD required in .env');
        process.exit(1);
    }

    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('console', (msg) => {
        if (msg.type() === 'error') console.error('PAGE ERROR:', msg.text());
    });

    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });

    const loggedIn = await page.evaluate(async (credentials) => {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(credentials)
        });
        return res.ok;
    }, { username: USER, password: PASS });

    if (!loggedIn) {
        console.error('Login failed');
        await browser.close();
        process.exit(1);
    }

    await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForFunction(
        () => document.body.classList.contains('user-authenticated'),
        { timeout: 20000 }
    );

    await page.waitForFunction(
        () => typeof window.sales !== 'undefined' && window.sales.length > 0,
        { timeout: 30000 }
    );

    const salesCount = await page.evaluate(() => window.sales.length);
    console.log('window.sales.length after load:', salesCount);

    await page.click('[data-tab="reports"]');
    await page.waitForSelector('#reportYearFilter', { timeout: 10000 });

    await page.evaluate(() => {
        document.getElementById('reportDateFilter').value = '';
        document.getElementById('reportLocationFilter').value = '';
        document.getElementById('reportStatusFilter').value = '';
        document.getElementById('reportStartDate').value = '';
        document.getElementById('reportEndDate').value = '';
    });

    await page.select('#reportYearFilter', '2026');
    await page.select('#reportMonthFilter', '10');

    await page.click('button[onclick="applyReportsFilters()"]');
    await new Promise((r) => setTimeout(r, 500));

    const statusBefore = await page.$eval('#reportFilterStatus', (el) => el.textContent.trim());
    console.log('Filter status after Apply:', statusBefore);

    await page.evaluate(() => {
        if (typeof generateSalesReport === 'function') generateSalesReport();
    });
    await new Promise((r) => setTimeout(r, 300));

    const result = await page.evaluate(() => {
        const stat = document.querySelector('.sales-report .stat-label');
        const empty = document.querySelector('.report-empty-state');
        const rows = document.querySelectorAll('.sales-report .report-table tbody tr').length;
        const filters = typeof getReportFilters === 'function' ? getReportFilters() : null;
        const filtered = typeof getFilteredSales === 'function' && filters ? getFilteredSales(filters).length : -1;
        return {
            statLabel: stat ? stat.textContent : null,
            emptyText: empty ? empty.textContent.slice(0, 200) : null,
            tableRows: rows,
            getFilteredSalesCount: filtered,
            start: document.getElementById('reportStartDate')?.value,
            end: document.getElementById('reportEndDate')?.value,
            year: document.getElementById('reportYearFilter')?.value,
            month: document.getElementById('reportMonthFilter')?.value,
            preset: document.getElementById('reportDateFilter')?.value
        };
    });

    console.log('Report result:', JSON.stringify(result, null, 2));

    const ok = result.getFilteredSalesCount > 0 && (result.tableRows > 0 || (result.statLabel && !result.statLabel.includes('(0 sales)')));
    await browser.close();

    if (!ok) {
        console.error('FAIL: Expected October 2026 sales in report');
        process.exit(1);
    }
    console.log('PASS: October sales visible in Reports');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

/**
 * Verify invoice save + reload round-trip (local server or live).
 * Usage: node test-invoice-persist.js [baseUrl]
 */
require('dotenv').config();

const BASE = process.argv[2] || 'http://localhost:3000';
const USER = process.env.ADMIN_USERNAME || 'admin';
const PASS = process.env.ADMIN_PASSWORD || 'Kobedavis#1';
const TEST_ID = `test-invoice-${Date.now()}`;

async function main() {
    console.log(`Testing invoice persist at ${BASE}`);

    const loginRes = await fetch(`${BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: USER, password: PASS })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.success) {
        throw new Error(`Login failed: ${loginData.message || loginRes.status}`);
    }
    const cookie = loginRes.headers.get('set-cookie');
    if (!cookie) throw new Error('No session cookie returned from login');
    const sessionCookie = cookie.split(';')[0];
    console.log('✅ Logged in');

    const headers = {
        'Content-Type': 'application/json',
        Cookie: sessionCookie
    };

    const beforeRes = await fetch(`${BASE}/api/invoices`, { headers: { Cookie: sessionCookie } });
    if (!beforeRes.ok) throw new Error(`GET invoices failed: ${beforeRes.status}`);
    const before = await beforeRes.json();
    if (!Array.isArray(before)) throw new Error('GET invoices did not return array');
    console.log(`📄 Invoices before: ${before.length}`);

    const testInvoice = {
        id: TEST_ID,
        customer: 'Test Customer',
        date: new Date().toISOString(),
        dateDisplay: new Date().toLocaleDateString(),
        total: 42,
        status: 'completed',
        source: 'completed',
        notes: 'Automated persist test — safe to delete',
        createdAt: new Date().toISOString(),
        sales: [{ itemName: 'Test Item', dateSold: new Date().toLocaleDateString(), salePrice: 42 }]
    };

    const payload = [...before, testInvoice];
    const postRes = await fetch(`${BASE}/api/invoices`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });
    if (!postRes.ok) {
        const err = await postRes.text();
        throw new Error(`POST invoices failed: ${postRes.status} ${err}`);
    }
    console.log('✅ POST invoices succeeded');

    const afterRes = await fetch(`${BASE}/api/invoices`, { headers: { Cookie: sessionCookie } });
    const after = await afterRes.json();
    const found = after.find((inv) => inv.id === TEST_ID);
    if (!found) {
        throw new Error('Test invoice not found after save — round-trip FAILED');
    }
    console.log('✅ Test invoice found after reload');

    const restored = before.filter((inv) => inv.id !== TEST_ID);
    const cleanupRes = await fetch(`${BASE}/api/invoices`, {
        method: 'POST',
        headers,
        body: JSON.stringify(restored)
    });
    if (!cleanupRes.ok) {
        console.warn('⚠️  Could not clean up test invoice — remove manually:', TEST_ID);
    } else {
        console.log('✅ Test invoice cleaned up');
    }

    console.log('\nInvoice persist round-trip: PASS');
}

main().catch((err) => {
    console.error('\nInvoice persist round-trip: FAIL');
    console.error(err.message);
    process.exit(1);
});

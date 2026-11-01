require('dotenv').config();

const DEFAULT_USER = process.env.ADMIN_USERNAME || 'admin';
const DEFAULT_PASS = process.env.ADMIN_PASSWORD || '';

/**
 * Log in through the auth modal so Puppeteer tests can reach gated UI.
 */
async function loginTestUser(page, baseUrl = 'http://localhost:3002') {
    if (!DEFAULT_PASS) {
        throw new Error('ADMIN_PASSWORD is required in .env for authenticated tests');
    }

    await page.goto(baseUrl, { waitUntil: 'load', timeout: 60000 });

    const loggedIn = await page.evaluate(async (credentials) => {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(credentials)
        });
        return res.ok;
    }, { username: DEFAULT_USER, password: DEFAULT_PASS });

    if (!loggedIn) {
        throw new Error('Test login failed — check ADMIN_USERNAME / ADMIN_PASSWORD in .env');
    }

    await page.reload({ waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(
        () => document.body.classList.contains('user-authenticated'),
        { timeout: 15000 }
    );
}

module.exports = { loginTestUser, DEFAULT_USER };

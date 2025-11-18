const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const userDataDir = path.join(__dirname, '..', 'tmp', `puppeteer-profile-${process.pid}`);

function ensureUserDataDir() {
    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
    }
}

const baseArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-crash-reporter',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    '--metrics-recording-only',
    '--mute-audio',
    '--no-first-run',
    '--no-zygote'
];

function mergeArgs(extraArgs = []) {
    const set = new Set([...baseArgs, ...extraArgs]);
    return Array.from(set);
}

function buildLaunchOptions(extraOptions = {}) {
    ensureUserDataDir();
    
    const options = {
        headless: true,
        userDataDir,
        args: mergeArgs(extraOptions.args || [])
    };
    
    return {
        ...options,
        ...extraOptions,
        args: mergeArgs(extraOptions.args || [])
    };
}

async function launch(extraOptions = {}) {
    const launchOptions = buildLaunchOptions(extraOptions);
    return puppeteer.launch(launchOptions);
}

module.exports = {
    launch,
    buildLaunchOptions,
    puppeteer
};


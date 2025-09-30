#!/usr/bin/env node

/**
 * Version Manager for Embroidery Inventory Manager
 * Automatically increments version numbers and updates cache-busting parameters
 */

const fs = require('fs');
const path = require('path');

// Read current version from package.json
const packagePath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Increment patch version
const currentVersion = packageJson.version;
const versionParts = currentVersion.split('.').map(Number);
versionParts[2]++; // Increment patch version
const newVersion = versionParts.join('.');

console.log(`🔄 Updating version from ${currentVersion} to ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

// Update HTML file
const htmlPath = path.join(__dirname, 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Update title with cache bust indicator
htmlContent = htmlContent.replace(
    /<title>CyndyP StitchCraft Inventory - v[\d.]+.*?<\/title>/,
    `<title>CyndyP StitchCraft Inventory - v${newVersion} - CACHE BUST</title>`
);

// Generate fresh timestamp for cache-busting
const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);

// Update CSS cache-busting with version AND timestamp
htmlContent = htmlContent.replace(
    /styles\.css\?v=[\d.]+&t=\d+/g,
    `styles.css?v=${newVersion}&t=${timestamp}`
);

// Update JS cache-busting with version AND timestamp
htmlContent = htmlContent.replace(
    /script\.js\?v=[\d.]+&t=\d+/g,
    `script.js?v=${newVersion}&t=${timestamp}`
);

fs.writeFileSync(htmlPath, htmlContent);

// Update JavaScript file
const jsPath = path.join(__dirname, 'script.js');
let jsContent = fs.readFileSync(jsPath, 'utf8');

// Update appVersion
jsContent = jsContent.replace(
    /appVersion: '[\d.]+'/g,
    `appVersion: '${newVersion}'`
);

// Update currentVersion
jsContent = jsContent.replace(
    /const currentVersion = '[\d.]+';/g,
    `const currentVersion = '${newVersion}';`
);

fs.writeFileSync(jsPath, jsContent);

console.log(`✅ Version updated to ${newVersion}`);
console.log(`📝 Updated files: package.json, index.html, script.js`);
console.log(`🚀 Ready to commit and deploy!`);

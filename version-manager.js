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

// Update title
htmlContent = htmlContent.replace(
    /<title>CyndyP StitchCraft Inventory - v[\d.]+.*?<\/title>/,
    `<title>CyndyP StitchCraft Inventory - v${newVersion}</title>`
);

// Update CSS cache-busting
htmlContent = htmlContent.replace(
    /styles\.css\?v=[\d.]+/g,
    `styles.css?v=${newVersion}`
);

// Update JS cache-busting
htmlContent = htmlContent.replace(
    /script\.js\?v=[\d.]+/g,
    `script.js?v=${newVersion}`
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

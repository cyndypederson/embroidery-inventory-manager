#!/usr/bin/env node

/**
 * Modal Layout Testing Script
 * Tests modal layout fixes before deploying to localhost
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Starting Modal Layout Tests...\n');

// Test 1: Check if CSS overrides are present in HTML
function testInlineCSS() {
    console.log('📋 Test 1: Checking inline CSS overrides...');
    
    const htmlContent = fs.readFileSync('index.html', 'utf8');
    
    const requiredCSS = [
        'display: grid !important',
        'grid-template-columns: 1fr 1fr !important',
        '#editItemForm',
        '#addItemForm',
        '.modal-form .form-group.full-width',
        '.modal-form .form-group.half-width'
    ];
    
    let passed = 0;
    let failed = 0;
    
    requiredCSS.forEach(rule => {
        if (htmlContent.includes(rule)) {
            console.log(`  ✅ Found: ${rule}`);
            passed++;
        } else {
            console.log(`  ❌ Missing: ${rule}`);
            failed++;
        }
    });
    
    console.log(`  📊 Result: ${passed}/${requiredCSS.length} CSS rules found\n`);
    return failed === 0;
}

// Test 2: Check if CSS file has proper overrides
function testCSSFile() {
    console.log('📋 Test 2: Checking CSS file overrides...');
    
    const cssContent = fs.readFileSync('styles.css', 'utf8');
    
    const requiredCSS = [
        'display: grid !important',
        'grid-template-columns: 1fr 1fr !important',
        'flex: none !important',
        'flex-direction: unset !important',
        '.modal-form .form-group {',
        'width: 100% !important'
    ];
    
    let passed = 0;
    let failed = 0;
    
    requiredCSS.forEach(rule => {
        if (cssContent.includes(rule)) {
            console.log(`  ✅ Found: ${rule}`);
            passed++;
        } else {
            console.log(`  ❌ Missing: ${rule}`);
            failed++;
        }
    });
    
    console.log(`  📊 Result: ${passed}/${requiredCSS.length} CSS rules found\n`);
    return failed === 0;
}

// Test 3: Check if JavaScript has proper image validation
function testJavaScriptImageLogic() {
    console.log('📋 Test 3: Checking JavaScript image validation...');
    
    const jsContent = fs.readFileSync('script.js', 'utf8');
    
    const requiredLogic = [
        'imageData && imageData.trim() !== \'\'',
        'imageSection.style.display = \'none\'',
        'console.log(\'📸 Image data is empty, hiding section\')'
    ];
    
    let passed = 0;
    let failed = 0;
    
    requiredLogic.forEach(logic => {
        if (jsContent.includes(logic)) {
            console.log(`  ✅ Found: ${logic}`);
            passed++;
        } else {
            console.log(`  ❌ Missing: ${logic}`);
            failed++;
        }
    });
    
    console.log(`  📊 Result: ${passed}/${requiredLogic.length} logic checks found\n`);
    return failed === 0;
}

// Test 4: Validate HTML structure
function testHTMLStructure() {
    console.log('📋 Test 4: Checking HTML modal structure...');
    
    const htmlContent = fs.readFileSync('index.html', 'utf8');
    
    const requiredElements = [
        'id="editItemModal"',
        'class="modal-form"',
        'class="form-group full-width"',
        'class="form-group half-width"',
        'id="editItemImageSection"',
        'style="display: none;"'
    ];
    
    let passed = 0;
    let failed = 0;
    
    requiredElements.forEach(element => {
        if (htmlContent.includes(element)) {
            console.log(`  ✅ Found: ${element}`);
            passed++;
        } else {
            console.log(`  ❌ Missing: ${element}`);
            failed++;
        }
    });
    
    console.log(`  📊 Result: ${passed}/${requiredElements.length} elements found\n`);
    return failed === 0;
}

// Test 5: Check version consistency
function testVersionConsistency() {
    console.log('📋 Test 5: Checking version consistency...');
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const htmlContent = fs.readFileSync('index.html', 'utf8');
    const scriptContent = fs.readFileSync('script.js', 'utf8');
    
    const version = packageJson.version;
    
    const checks = [
        { file: 'HTML', content: htmlContent, pattern: `v${version}` },
        { file: 'Script', content: scriptContent, pattern: `appVersion: '${version}'` },
        { file: 'Script', content: scriptContent, pattern: `currentVersion = '${version}'` }
    ];
    
    let passed = 0;
    let failed = 0;
    
    checks.forEach(check => {
        if (check.content.includes(check.pattern)) {
            console.log(`  ✅ ${check.file}: Version ${version} found`);
            passed++;
        } else {
            console.log(`  ❌ ${check.file}: Version ${version} missing`);
            failed++;
        }
    });
    
    console.log(`  📊 Result: ${passed}/${checks.length} version checks passed\n`);
    return failed === 0;
}

// Run all tests
function runAllTests() {
    const tests = [
        { name: 'Inline CSS Overrides', fn: testInlineCSS },
        { name: 'CSS File Overrides', fn: testCSSFile },
        { name: 'JavaScript Image Logic', fn: testJavaScriptImageLogic },
        { name: 'HTML Structure', fn: testHTMLStructure },
        { name: 'Version Consistency', fn: testVersionConsistency }
    ];
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    tests.forEach(test => {
        const result = test.fn();
        if (result) {
            totalPassed++;
        } else {
            totalFailed++;
        }
    });
    
    console.log('🎯 FINAL RESULTS:');
    console.log(`  ✅ Passed: ${totalPassed}/${tests.length} tests`);
    console.log(`  ❌ Failed: ${totalFailed}/${tests.length} tests`);
    
    if (totalFailed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Safe to deploy to localhost.');
        return true;
    } else {
        console.log('\n⚠️  SOME TESTS FAILED! Fix issues before deploying.');
        return false;
    }
}

// Run the tests
const allTestsPassed = runAllTests();
process.exit(allTestsPassed ? 0 : 1);

#!/usr/bin/env node

const https = require('https');
const { execSync } = require('child_process');

// Configuration
const LIVE_URL = 'https://embroidery-inventory-manager.vercel.app';
const LOCAL_URL = 'http://localhost:3002';

console.log('🧪 LIVE DEPLOYMENT COMPREHENSIVE TEST');
console.log('=====================================');
console.log('');
console.log('🌐 Testing URL:', LIVE_URL);
console.log('📅 Started:', new Date().toISOString());
console.log('');

// Helper function to make HTTPS requests
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            response.on('end', () => {
                resolve({
                    status: response.statusCode,
                    headers: response.headers,
                    body: data
                });
            });
        });
        
        request.on('error', (error) => {
            reject(error);
        });
        
        request.setTimeout(10000, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

// Test 1: Basic Connectivity
async function testConnectivity() {
    console.log('🔗 Test 1: Basic Connectivity');
    try {
        const response = await makeRequest(LIVE_URL);
        const success = response.status === 200;
        console.log(success ? '✅ PASSED' : '❌ FAILED', '- Status:', response.status);
        return { success, response };
    } catch (error) {
        console.log('❌ FAILED - Error:', error.message);
        return { success: false, error };
    }
}

// Test 2: Version Consistency
async function testVersionConsistency(response) {
    console.log('🏷️  Test 2: Version Consistency');
    if (!response || !response.body) {
        console.log('❌ FAILED - No response body');
        return false;
    }
    
    const html = response.body;
    const versionMatches = html.match(/v1\.0\.9[56]/g) || [];
    const uniqueVersions = [...new Set(versionMatches)];
    
    const hasCorrectVersion = uniqueVersions.includes('v1.0.96');
    const allSameVersion = uniqueVersions.length === 1;
    
    console.log(hasCorrectVersion ? '✅ PASSED' : '❌ FAILED', '- Version check');
    console.log(allSameVersion ? '✅ PASSED' : '❌ FAILED', '- Version consistency');
    console.log('   Versions found:', uniqueVersions);
    
    return hasCorrectVersion && allSameVersion;
}

// Test 3: Accessibility Fixes
async function testAccessibilityFixes(response) {
    console.log('♿ Test 3: Accessibility Fixes');
    if (!response || !response.body) {
        console.log('❌ FAILED - No response body');
        return false;
    }
    
    const html = response.body;
    
    // Check viewport zoom
    const hasUserScalable = html.includes('user-scalable=yes');
    console.log(hasUserScalable ? '✅ PASSED' : '❌ FAILED', '- Viewport zoom enabled');
    
    // Check ARIA labels
    const hasAriaLabels = html.includes('aria-label=');
    console.log(hasAriaLabels ? '✅ PASSED' : '❌ FAILED', '- ARIA labels present');
    
    // Check for proper viewport meta tag
    const hasViewportMeta = html.includes('maximum-scale=5.0');
    console.log(hasViewportMeta ? '✅ PASSED' : '❌ FAILED', '- Viewport meta tag updated');
    
    return hasUserScalable && hasAriaLabels && hasViewportMeta;
}

// Test 4: Invoice Header Fix
async function testInvoiceHeaderFix(response) {
    console.log('📄 Test 4: Invoice Header Fix');
    if (!response || !response.body) {
        console.log('❌ FAILED - No response body');
        return false;
    }
    
    const html = response.body;
    
    // Check that we don't have "CONSIGNMENT INVOICE"
    const hasConsignmentInvoice = html.includes('CONSIGNMENT INVOICE');
    console.log(!hasConsignmentInvoice ? '✅ PASSED' : '❌ FAILED', '- Removed CONSIGNMENT from invoice');
    
    // Check that we have clean "INVOICE"
    const hasCleanInvoice = html.includes('>INVOICE<') || html.includes('"INVOICE"');
    console.log(hasCleanInvoice ? '✅ PASSED' : '❌ FAILED', '- Clean invoice header present');
    
    return !hasConsignmentInvoice && hasCleanInvoice;
}

// Test 5: Cache Busting
async function testCacheBusting(response) {
    console.log('🔄 Test 5: Cache Busting');
    if (!response || !response.body) {
        console.log('❌ FAILED - No response body');
        return false;
    }
    
    const html = response.body;
    
    // Check for cache bust parameters
    const hasCacheBust = html.includes('version=fix') || html.includes('cb=6') || html.includes('cb=5');
    console.log(hasCacheBust ? '✅ PASSED' : '❌ FAILED', '- Cache bust parameters present');
    
    // Check for timestamp parameters
    const hasTimestamp = html.includes('t=202510121540');
    console.log(hasTimestamp ? '✅ PASSED' : '❌ FAILED', '- Recent timestamp present');
    
    return hasCacheBust;
}

// Test 6: Performance Check
async function testPerformance() {
    console.log('⚡ Test 6: Performance Check');
    try {
        const startTime = Date.now();
        await makeRequest(LIVE_URL);
        const endTime = Date.now();
        const loadTime = endTime - startTime;
        
        const isFast = loadTime < 3000; // Less than 3 seconds
        console.log(isFast ? '✅ PASSED' : '❌ FAILED', '- Load time:', loadTime + 'ms');
        
        return isFast;
    } catch (error) {
        console.log('❌ FAILED - Performance test error:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Running comprehensive live deployment tests...\n');
    
    const results = [];
    
    // Test 1: Connectivity
    const connectivityResult = await testConnectivity();
    results.push(connectivityResult.success);
    console.log('');
    
    if (!connectivityResult.success) {
        console.log('❌ Cannot proceed with other tests - connectivity failed');
        return;
    }
    
    // Test 2: Version Consistency
    const versionResult = await testVersionConsistency(connectivityResult.response);
    results.push(versionResult);
    console.log('');
    
    // Test 3: Accessibility Fixes
    const accessibilityResult = await testAccessibilityFixes(connectivityResult.response);
    results.push(accessibilityResult);
    console.log('');
    
    // Test 4: Invoice Header Fix
    const invoiceResult = await testInvoiceHeaderFix(connectivityResult.response);
    results.push(invoiceResult);
    console.log('');
    
    // Test 5: Cache Busting
    const cacheResult = await testCacheBusting(connectivityResult.response);
    results.push(cacheResult);
    console.log('');
    
    // Test 6: Performance
    const performanceResult = await testPerformance();
    results.push(performanceResult);
    console.log('');
    
    // Summary
    const passed = results.filter(r => r).length;
    const total = results.length;
    const successRate = (passed / total * 100).toFixed(1);
    
    console.log('📊 TEST SUMMARY');
    console.log('===============');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${total - passed}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log('');
    
    if (successRate >= 80) {
        console.log('🎉 LIVE DEPLOYMENT: EXCELLENT');
        console.log('🚀 Ready for production use!');
    } else if (successRate >= 60) {
        console.log('⚠️  LIVE DEPLOYMENT: GOOD');
        console.log('🔧 Some issues to address');
    } else {
        console.log('❌ LIVE DEPLOYMENT: NEEDS ATTENTION');
        console.log('🚨 Multiple issues detected');
    }
    
    console.log('');
    console.log('📅 Completed:', new Date().toISOString());
}

// Run the tests
runAllTests().catch(console.error);

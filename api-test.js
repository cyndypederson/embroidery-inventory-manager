#!/usr/bin/env node

/**
 * API ENDPOINT TESTING
 * Tests backend API endpoints independently of UI
 */

const http = require('http');

// Color codes for output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    log(`\n${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    log(`${colors.bold}${colors.cyan}🧪 ${title}${colors.reset}`);
    log(`${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
}

function logPass(test) {
    log(`✅ PASSED: ${test}`, 'green');
}

function logFail(test, error = '') {
    log(`❌ FAILED: ${test}${error ? ` - ${error}` : ''}`, 'red');
}

const results = {
    passed: 0,
    failed: 0,
    errors: []
};

const BASE_URL = 'http://localhost:3002';

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, headers: res.headers, body: json, rawBody: body });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, body: null, rawBody: body });
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

async function runTests() {
    logSection('API Endpoint Testing');
    log(`📅 Started: ${new Date().toISOString()}`, 'cyan');
    log(`🌐 Base URL: ${BASE_URL}`, 'cyan');
    
    // Test 1: Server is running
    logSection('Test 1: Server Health');
    try {
        const res = await makeRequest('/');
        if (res.status === 200) {
            logPass('Server is responding');
            results.passed++;
        } else {
            logFail('Server health check', `Expected 200, got ${res.status}`);
            results.failed++;
        }
    } catch (error) {
        logFail('Server health check', error.message);
        results.failed++;
        results.errors.push({ test: 'Server Health', error: error.message });
    }
    
    // Test 2: GET /api/inventory
    logSection('Test 2: GET /api/inventory');
    try {
        const res = await makeRequest('/api/inventory');
        
        if (res.status === 200) {
            logPass('Returns 200 status');
            results.passed++;
        } else {
            logFail('Status code', `Expected 200, got ${res.status}`);
            results.failed++;
        }
        
        if (Array.isArray(res.body)) {
            logPass('Returns array');
            results.passed++;
            log(`   📦 Found ${res.body.length} inventory items`, 'cyan');
        } else {
            logFail('Response format', 'Expected array');
            results.failed++;
        }
        
        if (res.body && res.body.length > 0) {
            const item = res.body[0];
            const hasRequiredFields = item._id && item.type;
            if (hasRequiredFields) {
                logPass('Items have required fields (_id, type)');
                results.passed++;
            } else {
                logFail('Required fields', 'Items missing _id or type');
                results.failed++;
            }
        }
    } catch (error) {
        logFail('GET /api/inventory', error.message);
        results.failed++;
        results.errors.push({ test: 'GET /api/inventory', error: error.message });
    }
    
    // Test 3: GET /api/customers
    logSection('Test 3: GET /api/customers');
    try {
        const res = await makeRequest('/api/customers');
        
        if (res.status === 200) {
            logPass('Returns 200 status');
            results.passed++;
        } else {
            logFail('Status code', `Expected 200, got ${res.status}`);
            results.failed++;
        }
        
        if (Array.isArray(res.body)) {
            logPass('Returns array');
            results.passed++;
            log(`   👥 Found ${res.body.length} customers`, 'cyan');
        } else {
            logFail('Response format', 'Expected array');
            results.failed++;
        }
    } catch (error) {
        logFail('GET /api/customers', error.message);
        results.failed++;
        results.errors.push({ test: 'GET /api/customers', error: error.message });
    }
    
    // Test 4: POST /api/inventory validation (should fail without auth)
    logSection('Test 4: POST /api/inventory - Validation');
    try {
        const testData = {
            type: 'project',
            description: 'Test Project',
            status: 'pending'
        };
        
        const res = await makeRequest('/api/inventory', 'POST', testData);
        
        // Expect success or 401 if auth is enabled
        if (res.status === 200 || res.status === 401) {
            if (res.status === 401) {
                logPass('Authentication protection working');
            } else {
                logPass('Endpoint accepts valid data');
            }
            results.passed++;
        } else {
            logFail('POST validation', `Unexpected status ${res.status}`);
            results.failed++;
        }
    } catch (error) {
        logFail('POST /api/inventory', error.message);
        results.failed++;
        results.errors.push({ test: 'POST /api/inventory', error: error.message });
    }
    
    // Test 5: Response headers
    logSection('Test 5: Response Headers');
    try {
        const res = await makeRequest('/api/inventory');
        
        if (res.headers['content-type']?.includes('application/json')) {
            logPass('Correct content-type header');
            results.passed++;
        } else {
            logFail('Content-Type', `Expected application/json, got ${res.headers['content-type']}`);
            results.failed++;
        }
    } catch (error) {
        logFail('Response headers', error.message);
        results.failed++;
    }
    
    // Test 6: Error handling - Invalid endpoint
    logSection('Test 6: Error Handling');
    try {
        const res = await makeRequest('/api/nonexistent');
        
        if (res.status === 404) {
            logPass('Returns 404 for invalid endpoints');
            results.passed++;
        } else {
            logFail('404 handling', `Expected 404, got ${res.status}`);
            results.failed++;
        }
    } catch (error) {
        logFail('Error handling', error.message);
        results.failed++;
    }
    
    // Final Report
    logSection('Test Summary');
    
    log(`\n📊 Results:`, 'cyan');
    log(`   ✅ Passed: ${results.passed}`, 'green');
    log(`   ❌ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
    
    if (results.errors.length > 0) {
        log(`\n💥 Errors:`, 'red');
        results.errors.forEach(error => {
            log(`   • ${error.test}: ${error.error}`, 'red');
        });
    }
    
    log(`\n📅 Completed: ${new Date().toISOString()}`, 'cyan');
    
    const exitCode = results.failed > 0 ? 1 : 0;
    log(`\n${exitCode === 0 ? '✅ All API tests passed!' : '❌ Some API tests failed'}`, exitCode === 0 ? 'green' : 'red');
    
    process.exit(exitCode);
}

// Run tests
runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});


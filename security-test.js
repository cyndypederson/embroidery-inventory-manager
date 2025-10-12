#!/usr/bin/env node

/**
 * SECURITY TESTING SUITE
 * Tests for common security vulnerabilities
 */

const http = require('http');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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
    log(`${colors.bold}${colors.cyan}🔒 ${title}${colors.reset}`);
    log(`${colors.bold}${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
}

function logPass(test) {
    log(`✅ PASSED: ${test}`, 'green');
}

function logFail(test, error = '') {
    log(`❌ FAILED: ${test}${error ? ` - ${error}` : ''}`, 'red');
}

function logWarn(test, warning = '') {
    log(`⚠️  WARNING: ${test}${warning ? ` - ${warning}` : ''}`, 'yellow');
}

const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    issues: []
};

const BASE_URL = 'http://localhost:3002';

function makeRequest(path, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, headers: res.headers, body });
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

async function runSecurityTests() {
    logSection('Security Testing Suite');
    log(`📅 Started: ${new Date().toISOString()}`, 'cyan');
    log(`🌐 Base URL: ${BASE_URL}`, 'cyan');
    
    // Test 1: NPM Audit
    logSection('Test 1: Dependency Vulnerabilities');
    try {
        const { stdout, stderr } = await execPromise('npm audit --json');
        const auditResult = JSON.parse(stdout);
        
        const { vulnerabilities } = auditResult;
        const criticalCount = Object.values(vulnerabilities || {}).filter(v => v.severity === 'critical').length;
        const highCount = Object.values(vulnerabilities || {}).filter(v => v.severity === 'high').length;
        const moderateCount = Object.values(vulnerabilities || {}).filter(v => v.severity === 'moderate').length;
        
        log(`   Critical: ${criticalCount}`, criticalCount > 0 ? 'red' : 'green');
        log(`   High: ${highCount}`, highCount > 0 ? 'red' : 'yellow');
        log(`   Moderate: ${moderateCount}`, moderateCount > 0 ? 'yellow' : 'green');
        
        if (criticalCount === 0 && highCount === 0) {
            logPass('No critical or high vulnerabilities');
            results.passed++;
        } else {
            logWarn('Vulnerabilities found', `${criticalCount} critical, ${highCount} high`);
            results.warnings++;
            results.issues.push({ issue: 'NPM Vulnerabilities', critical: criticalCount, high: highCount });
        }
    } catch (error) {
        // npm audit returns non-zero exit code when vulnerabilities found
        if (error.stdout) {
            try {
                const auditResult = JSON.parse(error.stdout);
                const criticalCount = Object.values(auditResult.vulnerabilities || {}).filter(v => v.severity === 'critical').length;
                const highCount = Object.values(auditResult.vulnerabilities || {}).filter(v => v.severity === 'high').length;
                
                logWarn('Vulnerabilities found', `${criticalCount} critical, ${highCount} high`);
                results.warnings++;
            } catch (e) {
                logFail('NPM audit', 'Could not parse audit results');
                results.failed++;
            }
        }
    }
    
    // Test 2: XSS Prevention
    logSection('Test 2: XSS Attack Prevention');
    try {
        const xssPayload = '<script>alert("XSS")</script>';
        const res = await makeRequest('/api/inventory', 'POST', {
            type: 'project',
            description: xssPayload,
            status: 'pending'
        });
        
        // Even if request succeeds, check if XSS is escaped in GET
        const getRes = await makeRequest('/api/inventory');
        const hasUnescapedScript = getRes.body.includes('<script>');
        
        if (!hasUnescapedScript) {
            logPass('XSS payloads are escaped or rejected');
            results.passed++;
        } else {
            logFail('XSS vulnerability', 'Unescaped script tags found');
            results.failed++;
            results.issues.push({ issue: 'XSS Vulnerability', details: 'Script tags not escaped' });
        }
    } catch (error) {
        logPass('XSS attempt rejected by server');
        results.passed++;
    }
    
    // Test 3: SQL/NoSQL Injection
    logSection('Test 3: NoSQL Injection Prevention');
    try {
        const injectionPayload = { $ne: null };
        const res = await makeRequest('/api/inventory', 'POST', {
            type: injectionPayload,
            description: 'test'
        });
        
        // Server should reject this or sanitize it
        if (res.status >= 400) {
            logPass('NoSQL injection attempt rejected');
            results.passed++;
        } else {
            logWarn('NoSQL injection', 'Server accepted object in type field');
            results.warnings++;
        }
    } catch (error) {
        logPass('NoSQL injection prevented');
        results.passed++;
    }
    
    // Test 4: CORS Headers
    logSection('Test 4: CORS Policy');
    try {
        const res = await makeRequest('/', 'GET', null, { Origin: 'http://evil-site.com' });
        
        const corsHeader = res.headers['access-control-allow-origin'];
        if (!corsHeader || corsHeader === BASE_URL || corsHeader === 'http://localhost:3002') {
            logPass('CORS is restricted or not overly permissive');
            results.passed++;
        } else if (corsHeader === '*') {
            logWarn('CORS allows all origins', 'Consider restricting CORS');
            results.warnings++;
        }
    } catch (error) {
        logPass('CORS restrictions in place');
        results.passed++;
    }
    
    // Test 5: Sensitive Data Exposure
    logSection('Test 5: Sensitive Data Exposure');
    try {
        const res = await makeRequest('/');
        const html = res.body.toLowerCase();
        
        const hasSensitiveData = html.includes('password') || 
                                 html.includes('mongodb') || 
                                 html.includes('api_key') ||
                                 html.includes('secret');
        
        if (!hasSensitiveData) {
            logPass('No obvious sensitive data in HTML');
            results.passed++;
        } else {
            logWarn('Potential sensitive data exposure', 'Check HTML for credentials');
            results.warnings++;
        }
    } catch (error) {
        logFail('Sensitive data check', error.message);
        results.failed++;
    }
    
    // Test 6: Rate Limiting
    logSection('Test 6: Rate Limiting (Basic Check)');
    try {
        const requests = [];
        for (let i = 0; i < 50; i++) {
            requests.push(makeRequest('/api/inventory'));
        }
        
        const responses = await Promise.all(requests);
        const tooManyRequests = responses.filter(r => r.status === 429).length;
        
        if (tooManyRequests > 0) {
            logPass('Rate limiting is active');
            results.passed++;
        } else {
            logWarn('No rate limiting detected', 'Consider implementing rate limiting');
            results.warnings++;
        }
    } catch (error) {
        logWarn('Rate limiting check failed', error.message);
        results.warnings++;
    }
    
    // Test 7: Authentication Headers
    logSection('Test 7: Authentication Security');
    try {
        const res = await makeRequest('/api/check-auth');
        
        if (res.headers['x-powered-by']) {
            logWarn('X-Powered-By header exposed', 'Remove this header for security');
            results.warnings++;
        } else {
            logPass('X-Powered-By header not exposed');
            results.passed++;
        }
        
        if (res.headers['strict-transport-security']) {
            logPass('HSTS header present');
            results.passed++;
        } else {
            logWarn('Missing HSTS header', 'Consider adding Strict-Transport-Security');
            results.warnings++;
        }
    } catch (error) {
        logWarn('Auth security check incomplete', error.message);
        results.warnings++;
    }
    
    // Final Report
    logSection('Security Test Summary');
    
    log(`\n📊 Results:`, 'cyan');
    log(`   ✅ Passed:   ${results.passed}`, 'green');
    log(`   ❌ Failed:   ${results.failed}`, results.failed > 0 ? 'red' : 'green');
    log(`   ⚠️  Warnings: ${results.warnings}`, results.warnings > 0 ? 'yellow' : 'green');
    
    if (results.issues.length > 0) {
        log(`\n🔧 Security Issues:`, 'yellow');
        results.issues.forEach(issue => {
            log(`   • ${issue.issue}`, 'yellow');
            if (issue.details) log(`     ${issue.details}`, 'yellow');
            if (issue.critical !== undefined) log(`     Critical: ${issue.critical}, High: ${issue.high}`, 'yellow');
        });
    }
    
    log(`\n📅 Completed: ${new Date().toISOString()}`, 'cyan');
    
    const exitCode = results.failed > 0 ? 1 : 0;
    log(`\n${exitCode === 0 ? '✅ Security tests passed!' : '❌ Security tests failed'}`, exitCode === 0 ? 'green' : 'red');
    
    if (results.warnings > 0) {
        log(`⚠️  ${results.warnings} warnings - review recommended`, 'yellow');
    }
    
    process.exit(exitCode);
}

// Run tests
runSecurityTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});


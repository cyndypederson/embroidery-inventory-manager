#!/usr/bin/env node

/**
 * PERFORMANCE TESTING SUITE
 * Tests card rendering performance and page load times
 */

const { launch } = require('./test-utils/puppeteer-config');

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
    log(`${colors.bold}${colors.cyan}⚡ ${title}${colors.reset}`);
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
    metrics: {}
};

const BASE_URL = 'http://localhost:3002';

async function runPerformanceTests() {
    logSection('Performance Testing Suite');
    log(`📅 Started: ${new Date().toISOString()}`, 'cyan');
    log(`🌐 Base URL: ${BASE_URL}`, 'cyan');
    
    const browser = await launch();
    const page = await browser.newPage();
    
    try {
        // Test 1: Page Load Time
        logSection('Test 1: Page Load Time');
        
        const startTime = Date.now();
        await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 60000 });
        const loadTime = Date.now() - startTime;
        
        log(`   ⏱️  Load Time: ${loadTime}ms`, 'cyan');
        results.metrics.pageLoadTime = loadTime;
        
        if (loadTime < 2000) {
            logPass('Page loads in under 2 seconds');
            results.passed++;
        } else if (loadTime < 5000) {
            logWarn('Page load time acceptable', `${loadTime}ms (target: <2000ms)`);
            results.warnings++;
        } else {
            logFail('Page load too slow', `${loadTime}ms`);
            results.failed++;
        }
        
        // Test 2: First Contentful Paint
        logSection('Test 2: First Contentful Paint (FCP)');
        
        const metrics = await page.evaluate(() => {
            const perfEntries = performance.getEntriesByType('paint');
            const fcp = perfEntries.find(entry => entry.name === 'first-contentful-paint');
            return {
                fcp: fcp ? fcp.startTime : null,
                domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
                domInteractive: performance.timing.domInteractive - performance.timing.navigationStart
            };
        });
        
        log(`   ⏱️  FCP: ${metrics.fcp ? metrics.fcp.toFixed(2) + 'ms' : 'N/A'}`, 'cyan');
        log(`   ⏱️  DOM Interactive: ${metrics.domInteractive}ms`, 'cyan');
        log(`   ⏱️  DOM Content Loaded: ${metrics.domContentLoaded}ms`, 'cyan');
        
        if (metrics.fcp && metrics.fcp < 1800) {
            logPass('FCP is excellent (< 1.8s)');
            results.passed++;
        } else if (metrics.fcp && metrics.fcp < 3000) {
            logWarn('FCP needs improvement', `${metrics.fcp.toFixed(2)}ms`);
            results.warnings++;
        }
        
        results.metrics.fcp = metrics.fcp;
        results.metrics.domInteractive = metrics.domInteractive;
        
        // Test 3: Card Rendering Performance
        logSection('Test 3: Card Rendering Performance');
        
        await page.click('[data-tab="projects"]');
        await page.waitForSelector('#projectsCards', { timeout: 5000 });
        
        const cardRenderTime = await page.evaluate(() => {
            performance.mark('start-card-render');
            
            // Force re-render by switching tabs
            const projectsTab = document.querySelector('[data-tab="projects"]');
            projectsTab.click();
            
            // Wait for cards to render
            return new Promise((resolve) => {
                setTimeout(() => {
                    performance.mark('end-card-render');
                    performance.measure('card-render', 'start-card-render', 'end-card-render');
                    const measure = performance.getEntriesByName('card-render')[0];
                    const cardCount = document.querySelectorAll('.project-card').length;
                    resolve({ duration: measure.duration, cardCount });
                }, 100);
            });
        });
        
        log(`   ⏱️  Card Render Time: ${cardRenderTime.duration.toFixed(2)}ms`, 'cyan');
        log(`   📦 Cards Rendered: ${cardRenderTime.cardCount}`, 'cyan');
        
        if (cardRenderTime.duration < 100) {
            logPass('Card rendering is fast (< 100ms)');
            results.passed++;
        } else if (cardRenderTime.duration < 500) {
            logWarn('Card rendering acceptable', `${cardRenderTime.duration.toFixed(2)}ms`);
            results.warnings++;
        } else {
            logFail('Card rendering slow', `${cardRenderTime.duration.toFixed(2)}ms`);
            results.failed++;
        }
        
        results.metrics.cardRenderTime = cardRenderTime.duration;
        results.metrics.cardCount = cardRenderTime.cardCount;
        
        // Test 4: Memory Usage
        logSection('Test 4: Memory Usage');
        
        const memoryMetrics = await page.metrics();
        const heapMB = (memoryMetrics.JSHeapUsedSize / 1024 / 1024).toFixed(2);
        
        log(`   💾 Heap Used: ${heapMB}MB`, 'cyan');
        log(`   📊 JS Event Listeners: ${memoryMetrics.JSEventListeners}`, 'cyan');
        log(`   🌐 DOM Nodes: ${memoryMetrics.Nodes}`, 'cyan');
        
        if (heapMB < 50) {
            logPass('Memory usage is excellent (< 50MB)');
            results.passed++;
        } else if (heapMB < 100) {
            logWarn('Memory usage acceptable', `${heapMB}MB`);
            results.warnings++;
        } else {
            logFail('High memory usage', `${heapMB}MB`);
            results.failed++;
        }
        
        results.metrics.heapUsedMB = heapMB;
        results.metrics.domNodes = memoryMetrics.Nodes;
        
        // Test 5: Tab Switching Performance
        logSection('Test 5: Tab Switching Performance');
        
        const tabs = ['inventory', 'customers', 'sales', 'completed'];
        const switchTimes = [];
        
        for (const tab of tabs) {
            const start = Date.now();
            await page.click(`[data-tab="${tab}"]`);
            await page.waitForTimeout(100); // Small delay for render
            const switchTime = Date.now() - start;
            switchTimes.push(switchTime);
            log(`   ⏱️  ${tab.toUpperCase()}: ${switchTime}ms`, 'cyan');
        }
        
        const avgSwitchTime = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length;
        log(`   ⏱️  Average: ${avgSwitchTime.toFixed(2)}ms`, 'cyan');
        
        if (avgSwitchTime < 200) {
            logPass('Tab switching is fast');
            results.passed++;
        } else {
            logWarn('Tab switching could be faster', `${avgSwitchTime.toFixed(2)}ms`);
            results.warnings++;
        }
        
        results.metrics.avgTabSwitchTime = avgSwitchTime;
        
        // Test 6: Lighthouse Scores (Basic)
        logSection('Test 6: Performance Score');
        
        const performanceScore = await page.evaluate(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (!navigation) return null;
            
            const score = {
                redirectTime: navigation.redirectEnd - navigation.redirectStart,
                dnsTime: navigation.domainLookupEnd - navigation.domainLookupStart,
                connectTime: navigation.connectEnd - navigation.connectStart,
                responseTime: navigation.responseEnd - navigation.responseStart,
                domProcessing: navigation.domComplete - navigation.domInteractive,
            };
            
            return score;
        });
        
        if (performanceScore) {
            log(`   ⏱️  DNS Lookup: ${performanceScore.dnsTime.toFixed(2)}ms`, 'cyan');
            log(`   ⏱️  Connection: ${performanceScore.connectTime.toFixed(2)}ms`, 'cyan');
            log(`   ⏱️  Response: ${performanceScore.responseTime.toFixed(2)}ms`, 'cyan');
            log(`   ⏱️  DOM Processing: ${performanceScore.domProcessing.toFixed(2)}ms`, 'cyan');
            
            logPass('Performance metrics captured');
            results.passed++;
        }
        
    } catch (error) {
        logFail('Performance test error', error.message);
        results.failed++;
    } finally {
        await browser.close();
    }
    
    // Final Report
    logSection('Performance Test Summary');
    
    log(`\n📊 Results:`, 'cyan');
    log(`   ✅ Passed:   ${results.passed}`, 'green');
    log(`   ❌ Failed:   ${results.failed}`, results.failed > 0 ? 'red' : 'green');
    log(`   ⚠️  Warnings: ${results.warnings}`, results.warnings > 0 ? 'yellow' : 'green');
    
    log(`\n⚡ Key Metrics:`, 'cyan');
    if (results.metrics.pageLoadTime) log(`   Page Load: ${results.metrics.pageLoadTime}ms`, 'cyan');
    if (results.metrics.fcp) log(`   FCP: ${results.metrics.fcp.toFixed(2)}ms`, 'cyan');
    if (results.metrics.cardRenderTime) log(`   Card Render: ${results.metrics.cardRenderTime.toFixed(2)}ms`, 'cyan');
    if (results.metrics.heapUsedMB) log(`   Memory: ${results.metrics.heapUsedMB}MB`, 'cyan');
    if (results.metrics.avgTabSwitchTime) log(`   Avg Tab Switch: ${results.metrics.avgTabSwitchTime.toFixed(2)}ms`, 'cyan');
    
    log(`\n📅 Completed: ${new Date().toISOString()}`, 'cyan');
    
    const exitCode = results.failed > 0 ? 1 : 0;
    log(`\n${exitCode === 0 ? '✅ Performance tests passed!' : '❌ Performance tests failed'}`, exitCode === 0 ? 'green' : 'red');
    
    process.exit(exitCode);
}

// Run tests
runPerformanceTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});


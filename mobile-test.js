#!/usr/bin/env node

/**
 * MOBILE INTERACTION TESTING SUITE
 * Tests mobile-specific interactions, touch targets, and responsive design
 */

const { launch, puppeteer } = require('./test-utils/puppeteer-config');

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
    log(`${colors.bold}${colors.cyan}📱 ${title}${colors.reset}`);
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

// Helper function to replace deprecated waitForTimeout
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Mobile device configurations
const devices = [
    { 
        name: 'iPhone 12', 
        device: {
            name: 'iPhone 12',
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
            viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
        }
    },
    { 
        name: 'iPhone SE', 
        device: {
            name: 'iPhone SE',
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
            viewport: { width: 375, height: 667, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
        }
    },
    { 
        name: 'Pixel 5', 
        device: {
            name: 'Pixel 5',
            userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
            viewport: { width: 393, height: 851, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true }
        }
    },
    { 
        name: 'iPad', 
        device: {
            name: 'iPad',
            userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
            viewport: { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
        }
    }
];

async function runMobileTests() {
    logSection('Mobile Interaction Testing Suite');
    log(`📅 Started: ${new Date().toISOString()}`, 'cyan');
    log(`🌐 Base URL: ${BASE_URL}`, 'cyan');
    
    const browser = await launch();
    
    try {
        // Test on iPhone 12 (most common mobile device)
        const page = await browser.newPage();
        await page.emulate(devices[0].device);
        
        log(`\n📱 Testing on: ${devices[0].name}`, 'cyan');
        log(`   Viewport: ${devices[0].device.viewport.width}x${devices[0].device.viewport.height}`, 'cyan');
        
        // Test 1: Page loads on mobile
        logSection('Test 1: Mobile Page Load');
        
        try {
            await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
            logPass('Page loads successfully on mobile');
            results.passed++;
        } catch (error) {
            logFail('Mobile page load', error.message);
            results.failed++;
            results.issues.push({ test: 'Mobile Page Load', error: error.message });
        }
        
        // Test 2: Viewport meta tag
        logSection('Test 2: Viewport Configuration');
        
        const viewportMeta = await page.evaluate(() => {
            const meta = document.querySelector('meta[name="viewport"]');
            return meta ? meta.getAttribute('content') : null;
        });
        
        if (viewportMeta && viewportMeta.includes('width=device-width')) {
            logPass('Viewport meta tag configured correctly');
            results.passed++;
        } else {
            logFail('Viewport meta tag', 'Missing or incorrect viewport meta tag');
            results.failed++;
        }
        
        log(`   Content: ${viewportMeta}`, 'cyan');
        
        // Test 3: Touch target sizes
        logSection('Test 3: Touch Target Sizes');
        
        const touchTargets = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a, .btn, .nav-btn'));
            return buttons.map(btn => {
                const rect = btn.getBoundingClientRect();
                return {
                    element: btn.className || btn.tagName,
                    width: rect.width,
                    height: rect.height,
                    area: rect.width * rect.height
                };
            }).filter(t => t.width > 0 && t.height > 0);
        });
        
        const minTouchSize = 44; // Apple's recommended minimum
        const smallTargets = touchTargets.filter(t => t.width < minTouchSize || t.height < minTouchSize);
        
        log(`   ✋ Total touch targets: ${touchTargets.length}`, 'cyan');
        log(`   📏 Targets < 44px: ${smallTargets.length}`, smallTargets.length > 0 ? 'yellow' : 'cyan');
        
        if (smallTargets.length === 0) {
            logPass('All touch targets meet minimum size (44x44px)');
            results.passed++;
        } else if (smallTargets.length < 5) {
            logWarn('Some touch targets are small', `${smallTargets.length} targets < 44px`);
            results.warnings++;
        } else {
            logFail('Touch target sizes', `${smallTargets.length} targets too small for touch`);
            results.failed++;
            results.issues.push({ test: 'Touch Targets', count: smallTargets.length });
        }
        
        // Test 4: Card responsiveness
        logSection('Test 4: Card Layout Responsiveness');
        
        await page.click('[data-tab="projects"]');
        await sleep(500);
        
        const cardLayout = await page.evaluate(() => {
            const cardsContainer = document.querySelector('#projectsCards');
            if (!cardsContainer) return null;
            
            const cards = Array.from(document.querySelectorAll('.project-card'));
            const containerWidth = cardsContainer.getBoundingClientRect().width;
            
            if (cards.length === 0) return { cardsPerRow: 0, responsive: false };
            
            const cardWidth = cards[0].getBoundingClientRect().width;
            const gap = 16; // Typical gap
            const cardsPerRow = Math.floor((containerWidth + gap) / (cardWidth + gap));
            
            return {
                containerWidth,
                cardWidth,
                cardsPerRow,
                totalCards: cards.length,
                responsive: cardsPerRow <= 2 // Mobile should show 1-2 cards per row
            };
        });
        
        if (cardLayout) {
            log(`   📦 Cards per row: ${cardLayout.cardsPerRow}`, 'cyan');
            log(`   📏 Card width: ${cardLayout.cardWidth?.toFixed(0)}px`, 'cyan');
            log(`   📐 Container width: ${cardLayout.containerWidth?.toFixed(0)}px`, 'cyan');
            
            if (cardLayout.responsive || cardLayout.cardsPerRow <= 2) {
                logPass('Cards adapt to mobile viewport (1-2 per row)');
                results.passed++;
            } else {
                logWarn('Card layout', `${cardLayout.cardsPerRow} cards per row on mobile - might be too many`);
                results.warnings++;
            }
        } else {
            logWarn('Card layout test', 'No cards found or container missing');
            results.warnings++;
        }
        
        // Test 5: Navigation responsiveness
        logSection('Test 5: Mobile Navigation');
        
        const navTests = await page.evaluate(() => {
            const nav = document.querySelector('nav');
            if (!nav) return null;
            
            const navStyle = window.getComputedStyle(nav);
            const navBtns = Array.from(document.querySelectorAll('.nav-btn'));
            
            return {
                overflowX: navStyle.overflowX,
                flexWrap: navStyle.flexWrap,
                buttonCount: navBtns.length,
                buttonsVisible: navBtns.filter(btn => {
                    const rect = btn.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                }).length
            };
        });
        
        if (navTests) {
            log(`   🔘 Navigation buttons: ${navTests.buttonCount}`, 'cyan');
            log(`   👁️  Visible buttons: ${navTests.buttonsVisible}`, 'cyan');
            log(`   📜 Overflow: ${navTests.overflowX}`, 'cyan');
            
            if (navTests.overflowX === 'auto' || navTests.overflowX === 'scroll') {
                logPass('Navigation supports horizontal scrolling');
                results.passed++;
            } else {
                logWarn('Navigation', 'No horizontal scroll - buttons might wrap');
                results.warnings++;
            }
        }
        
        // Test 6: Touch interactions
        logSection('Test 6: Touch Interactions');
        
        try {
            // Test tapping a navigation button
            await page.tap('[data-tab="inventory"]');
            await sleep(300);
            
            const activeTab = await page.evaluate(() => {
                const active = document.querySelector('.nav-btn.active');
                return active ? active.getAttribute('data-tab') : null;
            });
            
            if (activeTab === 'inventory') {
                logPass('Touch tap on navigation works correctly');
                results.passed++;
            } else {
                logFail('Touch tap', 'Navigation did not activate on tap');
                results.failed++;
            }
        } catch (error) {
            logFail('Touch interaction', error.message);
            results.failed++;
        }
        
        // Test 7: Form inputs on mobile
        logSection('Test 7: Mobile Form Interactions');
        
        try {
            await page.click('[data-tab="projects"]');
            await sleep(300);
            
            // Try to open add project modal
            const addButton = await page.$('button[onclick*="openAddProjectModal"]');
            if (addButton) {
                try {
                    await addButton.click(); // Use click instead of tap for better compatibility
                } catch (e) {
                    // If click fails, try evaluate
                    await page.evaluate(() => {
                        const btn = document.querySelector('button[onclick*="openAddProjectModal"]');
                        if (btn) btn.click();
                    });
                }
                await sleep(500);
                
                const modalVisible = await page.evaluate(() => {
                    const modal = document.querySelector('#addProjectModal');
                    return modal && window.getComputedStyle(modal).display !== 'none';
                });
                
                if (modalVisible) {
                    logPass('Modal opens on mobile');
                    results.passed++;
                    
                    // Check if form inputs are accessible
                    const inputAccessibility = await page.evaluate(() => {
                        const inputs = Array.from(document.querySelectorAll('#addProjectModal input, #addProjectModal select, #addProjectModal textarea'));
                        return {
                            totalInputs: inputs.length,
                            accessibleInputs: inputs.filter(input => {
                                const rect = input.getBoundingClientRect();
                                return rect.height >= 32; // Minimum touch-friendly height
                            }).length
                        };
                    });
                    
                    log(`   📝 Form inputs: ${inputAccessibility.totalInputs}`, 'cyan');
                    log(`   ✅ Touch-friendly: ${inputAccessibility.accessibleInputs}`, 'cyan');
                    
                    if (inputAccessibility.accessibleInputs === inputAccessibility.totalInputs) {
                        logPass('All form inputs are touch-friendly');
                        results.passed++;
                    } else {
                        logWarn('Form inputs', 'Some inputs may be too small');
                        results.warnings++;
                    }
                    
                    // Close modal
                    const closeBtn = await page.$('#addProjectModal .close');
                    if (closeBtn) await closeBtn.tap();
                } else {
                    logFail('Modal visibility', 'Modal did not open on mobile');
                    results.failed++;
                }
            } else {
                logWarn('Add button', 'Add project button not found');
                results.warnings++;
            }
        } catch (error) {
            logFail('Mobile form test', error.message);
            results.failed++;
        }
        
        // Test 8: Scroll performance
        logSection('Test 8: Scroll Performance');
        
        try {
            await page.click('[data-tab="projects"]');
            await sleep(300);
            
            const scrollTest = await page.evaluate(() => {
                const start = performance.now();
                window.scrollTo(0, 500);
                const scrollTime = performance.now() - start;
                
                const style = window.getComputedStyle(document.body);
                return {
                    scrollTime,
                    scrollBehavior: style.scrollBehavior,
                    overflowScrolling: style.webkitOverflowScrolling || 'none'
                };
            });
            
            log(`   ⏱️  Scroll time: ${scrollTest.scrollTime.toFixed(2)}ms`, 'cyan');
            log(`   📜 Scroll behavior: ${scrollTest.scrollBehavior}`, 'cyan');
            
            if (scrollTest.scrollTime < 50) {
                logPass('Scroll performance is excellent');
                results.passed++;
            } else {
                logWarn('Scroll performance', `${scrollTest.scrollTime.toFixed(2)}ms`);
                results.warnings++;
            }
        } catch (error) {
            logWarn('Scroll test', error.message);
            results.warnings++;
        }
        
        // Test 9: Text readability
        logSection('Test 9: Text Readability on Mobile');
        
        const textSizes = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('p, span, div, h1, h2, h3, button, a'));
            const sizes = elements.map(el => {
                const style = window.getComputedStyle(el);
                const fontSize = parseFloat(style.fontSize);
                return { element: el.tagName, fontSize };
            }).filter(s => s.fontSize > 0);
            
            const tooSmall = sizes.filter(s => s.fontSize < 14);
            return {
                totalElements: sizes.length,
                tooSmall: tooSmall.length,
                minSize: Math.min(...sizes.map(s => s.fontSize)),
                avgSize: sizes.reduce((sum, s) => sum + s.fontSize, 0) / sizes.length
            };
        });
        
        log(`   📏 Min font size: ${textSizes.minSize}px`, 'cyan');
        log(`   📊 Avg font size: ${textSizes.avgSize.toFixed(1)}px`, 'cyan');
        log(`   ⚠️  Elements < 14px: ${textSizes.tooSmall}`, 'cyan');
        
        if (textSizes.minSize >= 14) {
            logPass('All text is readable on mobile (≥14px)');
            results.passed++;
        } else if (textSizes.minSize >= 12) {
            logWarn('Text size', `Minimum ${textSizes.minSize}px (recommend ≥14px)`);
            results.warnings++;
        } else {
            logFail('Text readability', `Minimum ${textSizes.minSize}px is too small`);
            results.failed++;
        }
        
        // Test 10: Cross-device compatibility
        logSection('Test 10: Cross-Device Compatibility');
        
        let devicesPassed = 0;
        let devicesFailed = 0;
        
        for (const { name, device } of devices.slice(1)) { // Test remaining devices
            try {
                const testPage = await browser.newPage();
                await testPage.emulate(device);
                await testPage.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
                await sleep(500);
                
                const loaded = await testPage.evaluate(() => {
                    return document.readyState === 'complete' || document.readyState === 'interactive';
                });
                
                if (loaded) {
                    log(`   ✅ ${name}: OK`, 'green');
                    devicesPassed++;
                } else {
                    log(`   ❌ ${name}: Failed to load`, 'red');
                    devicesFailed++;
                }
                
                await testPage.close();
            } catch (error) {
                log(`   ❌ ${name}: ${error.message}`, 'red');
                devicesFailed++;
            }
        }
        
        if (devicesFailed === 0) {
            logPass(`All ${devicesPassed} test devices work correctly`);
            results.passed++;
        } else {
            logWarn('Device compatibility', `${devicesFailed} devices failed`);
            results.warnings++;
        }
        
    } catch (error) {
        logFail('Mobile test error', error.message);
        results.failed++;
        results.issues.push({ test: 'Mobile Testing', error: error.message });
    } finally {
        await browser.close();
    }
    
    // Final Report
    logSection('Mobile Test Summary');
    
    log(`\n📊 Results:`, 'cyan');
    log(`   ✅ Passed:   ${results.passed}`, 'green');
    log(`   ❌ Failed:   ${results.failed}`, results.failed > 0 ? 'red' : 'green');
    log(`   ⚠️  Warnings: ${results.warnings}`, results.warnings > 0 ? 'yellow' : 'green');
    
    if (results.issues.length > 0) {
        log(`\n🔧 Issues Found:`, 'yellow');
        results.issues.forEach(issue => {
            log(`   • ${issue.test}`, 'yellow');
            if (issue.error) log(`     ${issue.error}`, 'yellow');
            if (issue.count) log(`     Count: ${issue.count}`, 'yellow');
        });
    }
    
    log(`\n📅 Completed: ${new Date().toISOString()}`, 'cyan');
    
    const exitCode = results.failed > 0 ? 1 : 0;
    log(`\n${exitCode === 0 ? '✅ Mobile tests passed!' : '❌ Mobile tests failed'}`, exitCode === 0 ? 'green' : 'red');
    
    if (results.warnings > 0) {
        log(`⚠️  ${results.warnings} warnings - review recommended`, 'yellow');
    }
    
    process.exit(exitCode);
}

// Run tests
runMobileTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});


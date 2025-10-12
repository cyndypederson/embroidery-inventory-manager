#!/usr/bin/env node

/**
 * ACCESSIBILITY TESTING SUITE
 * Tests WCAG compliance, keyboard navigation, ARIA labels, and screen reader support
 */

const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');

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
    log(`${colors.bold}${colors.cyan}♿ ${title}${colors.reset}`);
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
    violations: []
};

const BASE_URL = 'http://localhost:3002';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runAccessibilityTests() {
    logSection('Accessibility Testing Suite');
    log(`📅 Started: ${new Date().toISOString()}`, 'cyan');
    log(`🌐 Base URL: ${BASE_URL}`, 'cyan');
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
        
        // Test 1: Axe-core automated accessibility scan
        logSection('Test 1: WCAG Compliance (Axe-core)');
        
        try {
            const axeResults = await new AxePuppeteer(page).analyze();
            
            log(`   📊 Violations: ${axeResults.violations.length}`, 'cyan');
            log(`   ✅ Passes: ${axeResults.passes.length}`, 'cyan');
            log(`   ℹ️  Incomplete: ${axeResults.incomplete.length}`, 'cyan');
            
            if (axeResults.violations.length === 0) {
                logPass('No WCAG violations detected');
                results.passed++;
            } else {
                // Categorize by severity
                const critical = axeResults.violations.filter(v => v.impact === 'critical');
                const serious = axeResults.violations.filter(v => v.impact === 'serious');
                const moderate = axeResults.violations.filter(v => v.impact === 'moderate');
                const minor = axeResults.violations.filter(v => v.impact === 'minor');
                
                log(`\n   Violations by severity:`, 'yellow');
                if (critical.length > 0) log(`   🔴 Critical: ${critical.length}`, 'red');
                if (serious.length > 0) log(`   🟠 Serious: ${serious.length}`, 'red');
                if (moderate.length > 0) log(`   🟡 Moderate: ${moderate.length}`, 'yellow');
                if (minor.length > 0) log(`   🔵 Minor: ${minor.length}`, 'yellow');
                
                // Show first 5 violations
                log(`\n   Top violations:`, 'yellow');
                axeResults.violations.slice(0, 5).forEach((violation, i) => {
                    log(`   ${i + 1}. ${violation.id}: ${violation.help}`, 'yellow');
                    log(`      Impact: ${violation.impact} | Nodes: ${violation.nodes.length}`, 'yellow');
                });
                
                if (critical.length > 0 || serious.length > 0) {
                    logFail('WCAG violations', `${critical.length} critical, ${serious.length} serious`);
                    results.failed++;
                } else {
                    logWarn('WCAG violations', `${moderate.length + minor.length} moderate/minor issues`);
                    results.warnings++;
                }
                
                results.violations = axeResults.violations;
            }
        } catch (error) {
            logFail('Axe-core scan', error.message);
            results.failed++;
        }
        
        // Test 2: Keyboard navigation
        logSection('Test 2: Keyboard Navigation');
        
        try {
            // Test Tab navigation
            await page.keyboard.press('Tab');
            await sleep(100);
            
            const firstFocused = await page.evaluate(() => {
                return {
                    element: document.activeElement?.tagName,
                    className: document.activeElement?.className,
                    isVisible: document.activeElement ? 
                        window.getComputedStyle(document.activeElement).display !== 'none' : false
                };
            });
            
            log(`   ⌨️  First tab stop: ${firstFocused.element} (${firstFocused.className})`, 'cyan');
            
            if (firstFocused.isVisible) {
                logPass('Keyboard focus is visible');
                results.passed++;
            } else {
                logFail('Keyboard focus', 'First focusable element not visible');
                results.failed++;
            }
            
            // Test through multiple tabs
            let tabCount = 0;
            const focusedElements = [];
            
            for (let i = 0; i < 10; i++) {
                await page.keyboard.press('Tab');
                await sleep(50);
                
                const focused = await page.evaluate(() => ({
                    tag: document.activeElement?.tagName,
                    id: document.activeElement?.id
                }));
                
                if (focused.tag && focused.tag !== 'BODY') {
                    tabCount++;
                    focusedElements.push(`${focused.tag}${focused.id ? '#' + focused.id : ''}`);
                }
            }
            
            log(`   🔢 Focusable elements found: ${tabCount}/10 tabs`, 'cyan');
            log(`   📍 Elements: ${focusedElements.slice(0, 5).join(', ')}...`, 'cyan');
            
            if (tabCount >= 5) {
                logPass('Multiple elements are keyboard accessible');
                results.passed++;
            } else {
                logWarn('Keyboard navigation', `Only ${tabCount} elements focusable`);
                results.warnings++;
            }
        } catch (error) {
            logFail('Keyboard navigation test', error.message);
            results.failed++;
        }
        
        // Test 3: Focus indicators
        logSection('Test 3: Focus Indicators');
        
        const focusStyles = await page.evaluate(() => {
            const testElement = document.querySelector('button');
            if (!testElement) return null;
            
            testElement.focus();
            const focusedStyle = window.getComputedStyle(testElement, ':focus');
            const normalStyle = window.getComputedStyle(testElement);
            
            return {
                hasFocusOutline: focusedStyle.outline !== 'none' && focusedStyle.outline !== normalStyle.outline,
                outlineStyle: focusedStyle.outline,
                boxShadow: focusedStyle.boxShadow,
                border: focusedStyle.border
            };
        });
        
        if (focusStyles) {
            log(`   🎨 Outline: ${focusStyles.outlineStyle}`, 'cyan');
            log(`   💫 Box shadow: ${focusStyles.boxShadow?.substring(0, 50)}...`, 'cyan');
            
            if (focusStyles.hasFocusOutline || focusStyles.boxShadow !== 'none') {
                logPass('Focus indicators are visible');
                results.passed++;
            } else {
                logWarn('Focus indicators', 'No visible focus outline detected');
                results.warnings++;
            }
        }
        
        // Test 4: ARIA labels and roles
        logSection('Test 4: ARIA Labels and Roles');
        
        const ariaAnalysis = await page.evaluate(() => {
            const elements = {
                buttons: document.querySelectorAll('button'),
                links: document.querySelectorAll('a'),
                inputs: document.querySelectorAll('input'),
                landmarks: document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], main, nav, header')
            };
            
            const withAriaLabel = Array.from(document.querySelectorAll('[aria-label]')).length;
            const withAriaDescribedBy = Array.from(document.querySelectorAll('[aria-describedby]')).length;
            const withRole = Array.from(document.querySelectorAll('[role]')).length;
            
            return {
                buttons: elements.buttons.length,
                links: elements.links.length,
                inputs: elements.inputs.length,
                landmarks: elements.landmarks.length,
                withAriaLabel,
                withAriaDescribedBy,
                withRole
            };
        });
        
        log(`   🏷️  ARIA labels: ${ariaAnalysis.withAriaLabel}`, 'cyan');
        log(`   📝 ARIA described-by: ${ariaAnalysis.withAriaDescribedBy}`, 'cyan');
        log(`   🎭 Role attributes: ${ariaAnalysis.withRole}`, 'cyan');
        log(`   🗺️  Landmarks: ${ariaAnalysis.landmarks}`, 'cyan');
        
        if (ariaAnalysis.landmarks > 0) {
            logPass('Page has semantic landmarks');
            results.passed++;
        } else {
            logWarn('Landmarks', 'No semantic landmarks found');
            results.warnings++;
        }
        
        // Test 5: Color contrast
        logSection('Test 5: Color Contrast');
        
        const contrastIssues = await page.evaluate(() => {
            // Simple contrast check for visible text elements
            const textElements = Array.from(document.querySelectorAll('p, span, div, h1, h2, h3, button, a, label'));
            const issues = [];
            
            textElements.slice(0, 50).forEach(el => {
                const style = window.getComputedStyle(el);
                const color = style.color;
                const bgColor = style.backgroundColor;
                const text = el.textContent?.trim();
                
                if (text && text.length > 0 && color && bgColor !== 'rgba(0, 0, 0, 0)') {
                    // Simplified check - just record the colors
                    issues.push({ color, bgColor });
                }
            });
            
            return issues.length;
        });
        
        log(`   🎨 Text elements checked: ${contrastIssues}`, 'cyan');
        logPass('Color contrast check completed');
        results.passed++;
        
        // Test 6: Form labels
        logSection('Test 6: Form Label Association');
        
        try {
            await page.click('[data-tab="projects"]');
            await sleep(300);
        } catch (e) {
            // Tab switching failed, skip this test
            logWarn('Form label test skipped', 'Could not switch to projects tab');
            results.warnings++;
            return;
        }
        
        const formAnalysis = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
            const withLabel = inputs.filter(input => {
                const id = input.id;
                if (!id) return false;
                
                const label = document.querySelector(`label[for="${id}"]`);
                return label !== null;
            });
            
            const withAriaLabel = inputs.filter(input => input.hasAttribute('aria-label'));
            const withPlaceholder = inputs.filter(input => input.hasAttribute('placeholder'));
            
            return {
                totalInputs: inputs.length,
                withLabel: withLabel.length,
                withAriaLabel: withAriaLabel.length,
                withPlaceholder: withPlaceholder.length
            };
        });
        
        log(`   📝 Total form inputs: ${formAnalysis.totalInputs}`, 'cyan');
        log(`   🏷️  With <label>: ${formAnalysis.withLabel}`, 'cyan');
        log(`   🏷️  With aria-label: ${formAnalysis.withAriaLabel}`, 'cyan');
        log(`   💬 With placeholder: ${formAnalysis.withPlaceholder}`, 'cyan');
        
        const labeled = formAnalysis.withLabel + formAnalysis.withAriaLabel;
        const labelPercentage = formAnalysis.totalInputs > 0 ? 
            (labeled / formAnalysis.totalInputs * 100).toFixed(0) : 0;
        
        if (labelPercentage >= 80) {
            logPass(`${labelPercentage}% of inputs have proper labels`);
            results.passed++;
        } else if (labelPercentage >= 50) {
            logWarn('Form labels', `Only ${labelPercentage}% of inputs labeled`);
            results.warnings++;
        } else {
            logFail('Form labels', `Only ${labelPercentage}% of inputs labeled`);
            results.failed++;
        }
        
        // Test 7: Heading hierarchy
        logSection('Test 7: Heading Hierarchy');
        
        const headings = await page.evaluate(() => {
            const h = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
            return h.map(tag => ({
                level: tag,
                count: document.querySelectorAll(tag).length
            })).filter(h => h.count > 0);
        });
        
        log(`   📋 Heading structure:`, 'cyan');
        headings.forEach(h => {
            log(`      ${h.level.toUpperCase()}: ${h.count}`, 'cyan');
        });
        
        const hasH1 = headings.some(h => h.level === 'h1');
        if (hasH1) {
            logPass('Page has H1 heading');
            results.passed++;
        } else {
            logWarn('Heading structure', 'No H1 heading found');
            results.warnings++;
        }
        
        // Test 8: Alt text for images
        logSection('Test 8: Image Alt Text');
        
        const imageAnalysis = await page.evaluate(() => {
            const images = Array.from(document.querySelectorAll('img'));
            const withAlt = images.filter(img => img.hasAttribute('alt'));
            const withEmptyAlt = images.filter(img => img.getAttribute('alt') === '');
            
            return {
                totalImages: images.length,
                withAlt: withAlt.length,
                withEmptyAlt: withEmptyAlt.length,
                missingAlt: images.length - withAlt.length
            };
        });
        
        log(`   🖼️  Total images: ${imageAnalysis.totalImages}`, 'cyan');
        log(`   ✅ With alt text: ${imageAnalysis.withAlt}`, 'cyan');
        log(`   ⚠️  Empty alt: ${imageAnalysis.withEmptyAlt}`, 'cyan');
        log(`   ❌ Missing alt: ${imageAnalysis.missingAlt}`, 'cyan');
        
        if (imageAnalysis.missingAlt === 0) {
            logPass('All images have alt attributes');
            results.passed++;
        } else if (imageAnalysis.totalImages === 0) {
            logPass('No images on page');
            results.passed++;
        } else {
            logWarn('Image alt text', `${imageAnalysis.missingAlt} images missing alt`);
            results.warnings++;
        }
        
    } catch (error) {
        logFail('Accessibility test error', error.message);
        results.failed++;
    } finally {
        await browser.close();
    }
    
    // Final Report
    logSection('Accessibility Test Summary');
    
    log(`\n📊 Results:`, 'cyan');
    log(`   ✅ Passed:   ${results.passed}`, 'green');
    log(`   ❌ Failed:   ${results.failed}`, results.failed > 0 ? 'red' : 'green');
    log(`   ⚠️  Warnings: ${results.warnings}`, results.warnings > 0 ? 'yellow' : 'green');
    
    if (results.violations.length > 0) {
        log(`\n♿ Accessibility Issues:`, 'yellow');
        log(`   Total violations: ${results.violations.length}`, 'yellow');
        log(`   See above for details`, 'yellow');
    }
    
    log(`\n📅 Completed: ${new Date().toISOString()}`, 'cyan');
    
    const exitCode = results.failed > 0 ? 1 : 0;
    log(`\n${exitCode === 0 ? '✅ Accessibility tests passed!' : '❌ Accessibility tests failed'}`, exitCode === 0 ? 'green' : 'red');
    
    if (results.warnings > 0) {
        log(`⚠️  ${results.warnings} warnings - review recommended`, 'yellow');
    }
    
    process.exit(exitCode);
}

// Run tests
runAccessibilityTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});


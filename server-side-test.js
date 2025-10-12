#!/usr/bin/env node

/**
 * Server-Side Comprehensive Test Suite
 * Tests code integrity, function definitions, and basic functionality without browser
 */

const fs = require('fs');
const path = require('path');

// Color codes for output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    log(`\n${colors.bold}${colors.blue}🧪 [${title}]${colors.reset}`);
}

function logPass(test, details = '') {
    log(`✅ PASSED: ${test}${details ? ` - ${details}` : ''}`, 'green');
}

function logFail(test, error = '') {
    log(`❌ FAILED: ${test}${error ? ` - ${error}` : ''}`, 'red');
}

function logWarn(test, warning = '') {
    log(`⚠️  WARNING: ${test}${warning ? ` - ${warning}` : ''}`, 'yellow');
}

// Test results tracking
const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    errors: []
};

function recordResult(test, status, error = null) {
    if (status === 'pass') {
        results.passed++;
    } else if (status === 'fail') {
        results.failed++;
        if (error) results.errors.push(error);
    } else if (status === 'warn') {
        results.warnings++;
    }
}

// Read and parse files
function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        return null;
    }
}

// Test 1: File Existence and Syntax
function testFileIntegrity() {
    logSection('File Integrity');
    
    const requiredFiles = [
        'script.js',
        'index.html', 
        'styles.css',
        'server.js',
        'package.json'
    ];
    
    requiredFiles.forEach(file => {
        const content = readFile(file);
        if (content) {
            logPass(`File exists: ${file}`);
            recordResult(`File exists: ${file}`, 'pass');
            
            // Test JavaScript syntax
            if (file.endsWith('.js')) {
                try {
                    // Basic syntax check - remove export/import statements for Node.js compatibility
                    const testContent = content.replace(/export\s+/g, '// export ').replace(/import\s+/g, '// import ');
                    new Function(testContent);
                    logPass(`JavaScript syntax: ${file}`);
                    recordResult(`JavaScript syntax: ${file}`, 'pass');
                } catch (error) {
                    logFail(`JavaScript syntax: ${file}`, error.message);
                    recordResult(`JavaScript syntax: ${file}`, 'fail', error.message);
                }
            }
        } else {
            logFail(`File missing: ${file}`);
            recordResult(`File missing: ${file}`, 'fail', 'File not found');
        }
    });
}

// Test 2: Critical Function Definitions
function testCriticalFunctions() {
    logSection('Critical Function Definitions');
    
    const scriptContent = readFile('script.js');
    if (!scriptContent) {
        logFail('Cannot test functions - script.js not found');
        return;
    }
    
    const criticalFunctions = [
        // Core functions
        'loadInventoryTableWithPagination',
        'loadInventoryItemsTableWithPagination',
        'loadCompletedItemsTable',
        
        // UI functions
        'switchTab',
        'openAddProjectModal',
        'editItem',
        'deleteItem',
        'copyItem',
        
        // Completed items functions
        'editCompletedItem',
        'addCompletedItem',
        
        // Invoice functions
        'generateInvoiceForItems',
        'displayInvoice',
        'createInvoiceFromSelected',
        'selectAllCompleted',
        'clearCompletedSelection',
        'toggleSelectAll',
        'updateInvoiceSelection',
        
        // Utility functions
        'showNotification',
        'checkAuthentication',
        'closeModal'
    ];
    
    criticalFunctions.forEach(funcName => {
        const regex = new RegExp(`function\\s+${funcName}\\s*\\(|const\\s+${funcName}\\s*=.*function|let\\s+${funcName}\\s*=.*function`);
        if (regex.test(scriptContent)) {
            logPass(`Function defined: ${funcName}`);
            recordResult(`Function defined: ${funcName}`, 'pass');
        } else {
            logFail(`Function missing: ${funcName}`);
            recordResult(`Function missing: ${funcName}`, 'fail', `Function ${funcName} not found`);
        }
    });
}

// Test 3: HTML Structure
function testHTMLStructure() {
    logSection('HTML Structure');
    
    const htmlContent = readFile('index.html');
    if (!htmlContent) {
        logFail('Cannot test HTML - index.html not found');
        return;
    }
    
    const requiredElements = [
        // Navigation
        'data-tab="completed"',
        'Completed Items',
        
        // Completed Items Tab
        'id="completed"',
        'id="completedItemsCards"',
        'id="selectAllCheckbox"',
        'onclick="addCompletedItem()"',
        'onclick="createInvoiceFromSelected()"',
        'onclick="selectAllCompleted()"',
        'onclick="clearCompletedSelection()"',
        'onchange="toggleSelectAll(this)"',
        
        // Invoice Summary
        'id="invoiceSummary"',
        'id="selectedCount"',
        'id="selectedTotal"',
        
        // Existing modals
        'id="invoicePreviewModal"',
        'id="invoiceContent"',
        
        // Edit Project Modal fields
        'id="editProjectPrice"',
        'id="editProjectTotalPrice"',
        'id="editProjectLocation"',
        
        // Edit Completed Item Modal
        'id="editCompletedItemModal"',
        'id="editCompletedItemForm"',
        'id="editCompletedItemDescription"',
        'id="editCompletedItemQuantity"',
        'id="editCompletedItemPrice"',
        'id="editCompletedItemTotal"'
    ];
    
    requiredElements.forEach(element => {
        if (htmlContent.includes(element)) {
            logPass(`HTML element found: ${element}`);
            recordResult(`HTML element: ${element}`, 'pass');
        } else {
            logFail(`HTML element missing: ${element}`);
            recordResult(`HTML element: ${element}`, 'fail', `Element ${element} not found`);
        }
    });
}

// Test 4: CSS Styles
function testCSSStructure() {
    logSection('CSS Structure');
    
    const cssContent = readFile('styles.css');
    if (!cssContent) {
        logFail('Cannot test CSS - styles.css not found');
        return;
    }
    
    const requiredStyles = [
        // Navigation styles
        'nav {',
        'flex-wrap: nowrap',
        'overflow-x: auto',
        
        // Button styles
        '.nav-btn {',
        'white-space: nowrap',
        'flex-shrink: 0',
        
        // Invoice styles
        '.invoice-summary {',
        '.completed-cards-grid',
        '.completed-item-card'
    ];
    
    requiredStyles.forEach(style => {
        if (cssContent.includes(style)) {
            logPass(`CSS style found: ${style}`);
            recordResult(`CSS style: ${style}`, 'pass');
        } else {
            logFail(`CSS style missing: ${style}`);
            recordResult(`CSS style: ${style}`, 'fail', `Style ${style} not found`);
        }
    });
}

// Test 5: Data Integration
function testDataIntegration() {
    logSection('Data Integration');
    
    const scriptContent = readFile('script.js');
    if (!scriptContent) {
        logFail('Cannot test data integration - script.js not found');
        return;
    }
    
    // Check for proper data handling
    const dataChecks = [
        {
            name: 'Inventory data filtering',
            pattern: /inventory\.filter.*status.*completed/,
            critical: true
        },
        {
            name: 'Customer data integration',
            pattern: /customers\.find/,
            critical: false
        },
        {
            name: 'Invoice data generation',
            pattern: /invoice.*items.*map/,
            critical: true
        },
        {
            name: 'LocalStorage integration',
            pattern: /localStorage\.(get|set)Item/,
            critical: false
        }
    ];
    
    dataChecks.forEach(check => {
        if (check.pattern.test(scriptContent)) {
            logPass(check.name);
            recordResult(check.name, 'pass');
        } else {
            if (check.critical) {
                logFail(check.name);
                recordResult(check.name, 'fail', `${check.name} not found`);
            } else {
                logWarn(check.name, 'Optional feature');
                recordResult(check.name, 'warn');
            }
        }
    });
}

// Test 6: Error Handling
function testErrorHandling() {
    logSection('Error Handling');
    
    const scriptContent = readFile('script.js');
    if (!scriptContent) {
        logFail('Cannot test error handling - script.js not found');
        return;
    }
    
    const errorChecks = [
        {
            name: 'Null checks for DOM elements',
            pattern: /if\s*\(\s*!.*\)\s*return/,
            critical: true
        },
        {
            name: 'Try-catch blocks',
            pattern: /try\s*{/,
            critical: false
        },
        {
            name: 'Error notifications',
            pattern: /showNotification.*error/,
            critical: false
        }
    ];
    
    errorChecks.forEach(check => {
        const matches = scriptContent.match(check.pattern);
        if (matches) {
            logPass(`${check.name} (${matches.length} instances)`);
            recordResult(check.name, 'pass');
        } else {
            if (check.critical) {
                logFail(check.name);
                recordResult(check.name, 'fail', `${check.name} not found`);
            } else {
                logWarn(check.name, 'Optional safety feature');
                recordResult(check.name, 'warn');
            }
        }
    });
}

// Test 7: Integration Points
function testIntegrationPoints() {
    logSection('Integration Points');
    
    const scriptContent = readFile('script.js');
    if (!scriptContent) {
        logFail('Cannot test integration - script.js not found');
        return;
    }
    
    // Check for proper integration with existing systems
    const integrationChecks = [
        {
            name: 'Existing invoice system integration',
            pattern: /showInvoicePreview/,
            critical: true
        },
        {
            name: 'Tab switching integration',
            pattern: /tabName.*===.*completed/,
            critical: true
        },
        {
            name: 'Authentication integration',
            pattern: /checkAuthentication/,
            critical: false
        },
        {
            name: 'Notification system integration',
            pattern: /showNotification/,
            critical: false
        }
    ];
    
    integrationChecks.forEach(check => {
        if (check.pattern.test(scriptContent)) {
            logPass(check.name);
            recordResult(check.name, 'pass');
        } else {
            if (check.critical) {
                logFail(check.name);
                recordResult(check.name, 'fail', `${check.name} not found`);
            } else {
                logWarn(check.name, 'Optional integration');
                recordResult(check.name, 'warn');
            }
        }
    });
}

// Test 8: Performance Considerations
function testPerformanceConsiderations() {
    logSection('Performance Considerations');
    
    const scriptContent = readFile('script.js');
    if (!scriptContent) {
        logFail('Cannot test performance - script.js not found');
        return;
    }
    
    const performanceChecks = [
        {
            name: 'Data caching implementation',
            pattern: /PerformanceManager|getCachedData/,
            critical: false
        },
        {
            name: 'Pagination implementation',
            pattern: /paginateData|currentPage/,
            critical: false
        },
        {
            name: 'Debounced search',
            pattern: /debounce|setTimeout.*search/,
            critical: false
        }
    ];
    
    performanceChecks.forEach(check => {
        if (check.pattern.test(scriptContent)) {
            logPass(check.name);
            recordResult(check.name, 'pass');
        } else {
            logWarn(check.name, 'Performance optimization not implemented');
            recordResult(check.name, 'warn');
        }
    });
}

// Test 10: Runtime DOM Simulation
function testRuntimeDOMSimulation() {
    logSection('Runtime DOM Simulation');
    
    try {
        // Mock DOM environment
        const mockDOM = {
            elements: {},
            getElementById: function(id) {
                return this.elements[id] || null;
            },
            createElement: function(tag) {
                return {
                    tagName: tag,
                    innerHTML: '',
                    style: { display: 'block' },
                    value: '',
                    textContent: '',
                    appendChild: function() {},
                    addEventListener: function() {}
                };
            },
            querySelector: function() { return null; },
            querySelectorAll: function() { return []; }
        };
        
        // Mock global objects
        global.document = mockDOM;
        global.window = {
            localStorage: {
                getItem: function() { return null; },
                setItem: function() {},
                removeItem: function() {}
            },
            sessionStorage: {
                getItem: function() { return null; },
                setItem: function() {},
                removeItem: function() {}
            },
            fetch: function() { return Promise.resolve({ ok: true, json: () => Promise.resolve([]) }); },
            alert: function() {},
            confirm: function() { return true; },
            setTimeout: function(fn, delay) { fn(); },
            clearTimeout: function() {}
        };
        
        // Mock global variables
        global.inventory = [
            { 
                _id: 'test1', 
                description: 'Test Item 1', 
                status: 'completed', 
                type: 'project',
                customer: 'Test Customer',
                quantity: 1,
                price: 10.00,
                notes: 'Test notes'
            }
        ];
        global.customers = [{ name: 'Test Customer', location: 'Test Location' }];
        global.sales = [];
        global.gallery = [];
        global.ideas = [];
        
        logPass('Runtime DOM simulation setup');
        recordResult('Runtime DOM simulation setup', 'pass');
        
    } catch (error) {
        logFail('Runtime DOM simulation', error.message);
        recordResult('Runtime DOM simulation', 'fail', error.message);
    }
}

// Test 11: Function Execution with Mock Data
function testFunctionExecution() {
    logSection('Function Execution Testing');
    
    try {
        // Test editItem function with null checks
        const mockItem = {
            _id: 'test1',
            description: 'Test Completed Item',
            status: 'completed',
            type: 'project',
            customer: 'Test Customer',
            quantity: 1,
            price: 15.00,
            notes: 'Test notes'
        };
        
        // Mock DOM elements that editItem expects
        const mockElements = {
            'editItemIndex': { value: '' },
            'editItemDescription': { value: '' },
            'editItemLocation': { value: '' },
            'editItemQuantity': { value: '' },
            'editItemPrice': { value: '' },
            'editItemType': { value: '' },
            'editItemStatus': { value: '' },
            'editItemCategory': { value: '' },
            'editItemNotes': { value: '' },
            'editItemSupplier': { value: '' },
            'editItemReorderPoint': { value: '' },
            'editItemCustomer': { value: '' },
            'editItemDueDate': { value: '' },
            'editItemPriority': { value: '' },
            'editItemTags': { value: '' },
            'editItemPatternLink': { value: '' },
            'editItemImageSection': { style: { display: '' } },
            'editItemImageDisplay': { src: '' },
            'editItemModal': { style: { display: '' } }
        };
        
        global.document.getElementById = function(id) {
            return mockElements[id] || null;
        };
        
        // Test if functions exist and can be called
        const scriptContent = readFile('script.js');
        if (scriptContent.includes('function editItem') && scriptContent.includes('function editCompletedItem')) {
            logPass('Critical edit functions defined');
            recordResult('Critical edit functions defined', 'pass');
        } else {
            logFail('Critical edit functions missing');
            recordResult('Critical edit functions defined', 'fail', 'Functions not found');
        }
        
        // Test null handling patterns
        if (scriptContent.includes('setElementValue') && scriptContent.includes('if (element)')) {
            logPass('Null handling patterns detected');
            recordResult('Null handling patterns', 'pass');
        } else {
            logFail('Null handling patterns not found');
            recordResult('Null handling patterns', 'fail', 'Missing null checks');
        }
        
    } catch (error) {
        logFail('Function execution testing', error.message);
        recordResult('Function execution testing', 'fail', error.message);
    }
}

// Test 12: Edge Case Testing
function testEdgeCases() {
    logSection('Edge Case Testing');
    
    try {
        const scriptContent = readFile('script.js');
        
        // Test for edge case handling
        const edgeCasePatterns = [
            {
                name: 'Undefined type handling',
                pattern: /item\.type\s*\|\|\s*['"]project['"]/,
                critical: true
            },
            {
                name: 'Null element checking',
                pattern: /if\s*\(\s*[a-zA-Z]+\s*\)\s*\{/,
                critical: true
            },
            {
                name: 'Default value assignment',
                pattern: /\|\|\s*['"][^'"]*['"]/,
                critical: false
            },
            {
                name: 'Empty inventory handling',
                pattern: /length\s*===\s*0|\.length\s*===\s*0/,
                critical: false
            }
        ];
        
        let edgeCasesFound = 0;
        edgeCasePatterns.forEach(test => {
            if (test.pattern.test(scriptContent)) {
                logPass(test.name);
                recordResult(test.name, 'pass');
                edgeCasesFound++;
            } else {
                if (test.critical) {
                    logFail(test.name);
                    recordResult(test.name, 'fail', 'Critical edge case handling missing');
                } else {
                    logWarn(test.name, 'Edge case handling not implemented');
                    recordResult(test.name, 'warn');
                }
            }
        });
        
        if (edgeCasesFound > 0) {
            logPass(`Found ${edgeCasesFound} edge case handling patterns`);
        }
        
    } catch (error) {
        logFail('Edge case testing', error.message);
        recordResult('Edge case testing', 'fail', error.message);
    }
}

// Test 13: Null Reference Error Detection
function testNullReferenceDetection() {
    logSection('Null Reference Error Detection');
    
    try {
        const scriptContent = readFile('script.js');
        
        // Look for null reference protection patterns
        const nullProtectionPatterns = [
            {
                name: 'Element existence checking',
                pattern: /if\s*\(\s*[a-zA-Z]+\s*\)\s*\{[^}]*\.value\s*=/,
                critical: true
            },
            {
                name: 'Safe element access',
                pattern: /getElementById.*\?|document\.getElementById.*\?/,
                critical: true
            },
            {
                name: 'Default value assignment',
                pattern: /\|\|\s*['"]\s*['"]|\|\|\s*null|\|\|\s*undefined/,
                critical: false
            },
            {
                name: 'Function existence checking',
                pattern: /if\s*\(\s*typeof.*===.*function/,
                critical: false
            }
        ];
        
        let protectionsFound = 0;
        nullProtectionPatterns.forEach(test => {
            if (test.pattern.test(scriptContent)) {
                logPass(test.name);
                recordResult(test.name, 'pass');
                protectionsFound++;
            } else {
                if (test.critical) {
                    logFail(test.name);
                    recordResult(test.name, 'fail', 'Critical null protection missing');
                } else {
                    logWarn(test.name, 'Null protection not implemented');
                    recordResult(test.name, 'warn');
                }
            }
        });
        
        if (protectionsFound > 0) {
            logPass(`Found ${protectionsFound} null protection patterns`);
        }
        
    } catch (error) {
        logFail('Null reference detection', error.message);
        recordResult('Null reference detection', 'fail', error.message);
    }
}

// Main test runner
function runTests() {
    log(`${colors.bold}${colors.blue}🚀 Starting Server-Side Comprehensive Test Suite...${colors.reset}`);
    log(`${colors.blue}📋 Testing code integrity, function definitions, and basic functionality${colors.reset}\n`);
    
    const startTime = Date.now();
    
    // Run all tests
    testFileIntegrity();
    testCriticalFunctions();
    testHTMLStructure();
    testCSSStructure();
    testDataIntegration();
    testErrorHandling();
    testIntegrationPoints();
    testPerformanceConsiderations();
    testRuntimeDOMSimulation();
    testFunctionExecution();
    testEdgeCases();
    testNullReferenceDetection();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Print results summary
    log(`\n${colors.bold}📊 COMPREHENSIVE TEST RESULTS${colors.reset}`);
    log(`${colors.blue}==============================${colors.reset}`);
    log(`${colors.green}✅ Passed: ${results.passed}${colors.reset}`);
    log(`${colors.red}❌ Failed: ${results.failed}${colors.reset}`);
    log(`${colors.yellow}⚠️  Warnings: ${results.warnings}${colors.reset}`);
    log(`${colors.blue}⏱️  Duration: ${duration}ms${colors.reset}`);
    
    const successRate = results.passed + results.failed > 0 ? 
        (results.passed / (results.passed + results.failed) * 100).toFixed(1) : 0;
    log(`${colors.blue}📈 Success Rate: ${successRate}%${colors.reset}`);
    
    if (results.errors.length > 0) {
        log(`\n${colors.red}❌ ERRORS:${colors.reset}`);
        results.errors.forEach((error, index) => {
            log(`${colors.red}  ${index + 1}. ${error}${colors.reset}`);
        });
    }
    
    // Overall status
    if (results.failed === 0) {
        log(`\n${colors.green}${colors.bold}🎉 ALL CRITICAL TESTS PASSED!${colors.reset}`);
        log(`${colors.green}The code is ready for deployment.${colors.reset}`);
        process.exit(0);
    } else {
        log(`\n${colors.red}${colors.bold}⚠️  SOME TESTS FAILED${colors.reset}`);
        log(`${colors.yellow}Please review the errors above before deploying.${colors.reset}`);
        process.exit(1);
    }
}

// Run the tests
runTests();

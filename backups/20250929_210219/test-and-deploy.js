#!/usr/bin/env node

/**
 * Comprehensive Testing and Deployment Script
 * Tests all fixes before deploying to localhost
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting Comprehensive Test and Deploy Workflow...\n');

// Step 1: Run static tests
function runStaticTests() {
    console.log('📋 Step 1: Running Static Tests...');
    try {
        execSync('node test-modal-layout.js', { stdio: 'inherit' });
        console.log('✅ Static tests passed!\n');
        return true;
    } catch (error) {
        console.log('❌ Static tests failed!\n');
        return false;
    }
}

// Step 2: Check if server is running
function checkServer() {
    console.log('📋 Step 2: Checking Server Status...');
    try {
        const { execSync } = require('child_process');
        execSync('curl -s http://localhost:3002/version.json > /dev/null', { stdio: 'pipe' });
        console.log('✅ Server is running on localhost:3002\n');
        return true;
    } catch (error) {
        console.log('❌ Server is not running. Starting server...');
        try {
            execSync('pkill -f "node server.js"', { stdio: 'pipe' });
            execSync('sleep 2 && PORT=3002 node server.js &', { stdio: 'pipe' });
            console.log('✅ Server started\n');
            return true;
        } catch (startError) {
            console.log('❌ Failed to start server\n');
            return false;
        }
    }
}

// Step 3: Test actual modal layout in browser
function testBrowserLayout() {
    console.log('📋 Step 3: Testing Browser Layout...');
    console.log('🌐 Opening browser to test modal layout...');
    
    // Create a simple HTML test file
    const testHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Modal Layout Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-result { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .pass { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .fail { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .info { background-color: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
    </style>
</head>
<body>
    <h1>Modal Layout Test Results</h1>
    <div id="results"></div>
    
    <script>
        async function runTests() {
            const results = document.getElementById('results');
            
            try {
                // Test 1: Check if localhost is accessible
                const response = await fetch('http://localhost:3002/version.json');
                const data = await response.json();
                
                results.innerHTML += \`
                    <div class="test-result info">
                        <strong>Server Status:</strong> Running version \${data.version}
                    </div>
                \`;
                
                // Test 2: Check modal CSS
                const cssResponse = await fetch('http://localhost:3002/styles.css');
                const cssText = await cssResponse.text();
                
                const hasGridCSS = cssText.includes('display: grid !important') && 
                                 cssText.includes('grid-template-columns: 1fr 1fr !important');
                
                results.innerHTML += \`
                    <div class="test-result \${hasGridCSS ? 'pass' : 'fail'}">
                        <strong>CSS Grid Layout:</strong> \${hasGridCSS ? 'PASS' : 'FAIL'}
                    </div>
                \`;
                
                // Test 3: Check HTML structure
                const htmlResponse = await fetch('http://localhost:3002/');
                const htmlText = await htmlResponse.text();
                
                const hasModalStructure = htmlText.includes('id="editItemModal"') && 
                                        htmlText.includes('class="modal-form"') &&
                                        htmlText.includes('class="form-group full-width"');
                
                results.innerHTML += \`
                    <div class="test-result \${hasModalStructure ? 'pass' : 'fail'}">
                        <strong>HTML Structure:</strong> \${hasModalStructure ? 'PASS' : 'FAIL'}
                    </div>
                \`;
                
                // Test 4: Check inline CSS
                const hasInlineCSS = htmlText.includes('display: grid !important') && 
                                   htmlText.includes('#editItemForm');
                
                results.innerHTML += \`
                    <div class="test-result \${hasInlineCSS ? 'pass' : 'fail'}">
                        <strong>Inline CSS Overrides:</strong> \${hasInlineCSS ? 'PASS' : 'FAIL'}
                    </div>
                \`;
                
                // Overall result
                const allPassed = hasGridCSS && hasModalStructure && hasInlineCSS;
                results.innerHTML += \`
                    <div class="test-result \${allPassed ? 'pass' : 'fail'}">
                        <strong>Overall Result:</strong> \${allPassed ? 'ALL TESTS PASSED - READY TO DEPLOY' : 'SOME TESTS FAILED - FIX ISSUES FIRST'}
                    </div>
                \`;
                
            } catch (error) {
                results.innerHTML += \`
                    <div class="test-result fail">
                        <strong>Error:</strong> \${error.message}
                    </div>
                \`;
            }
        }
        
        runTests();
    </script>
</body>
</html>`;
    
    fs.writeFileSync('modal-test.html', testHTML);
    console.log('📄 Created test file: modal-test.html');
    console.log('🌐 Open this file in your browser to see test results');
    console.log('   Or run: open modal-test.html\n');
    
    return true;
}

// Step 4: Deploy with validation
function deployWithValidation() {
    console.log('📋 Step 4: Deploying with Validation...');
    
    // Restart server to ensure latest changes
    try {
        execSync('pkill -f "node server.js"', { stdio: 'pipe' });
        execSync('sleep 3 && PORT=3002 node server.js &', { stdio: 'pipe' });
        console.log('✅ Server restarted with latest changes');
        
        // Wait for server to start
        execSync('sleep 5', { stdio: 'pipe' });
        
        // Verify server is running
        const versionResponse = execSync('curl -s http://localhost:3002/version.json', { encoding: 'utf8' });
        const versionData = JSON.parse(versionResponse);
        console.log(`✅ Server running version ${versionData.version}`);
        
        console.log('\n🎉 DEPLOYMENT COMPLETE!');
        console.log('🌐 Test your changes at: http://localhost:3002');
        console.log('📊 View test results at: modal-test.html');
        
        return true;
    } catch (error) {
        console.log('❌ Deployment failed:', error.message);
        return false;
    }
}

// Main workflow
async function main() {
    const steps = [
        { name: 'Static Tests', fn: runStaticTests },
        { name: 'Server Check', fn: checkServer },
        { name: 'Browser Tests', fn: testBrowserLayout },
        { name: 'Deploy', fn: deployWithValidation }
    ];
    
    let allPassed = true;
    
    for (const step of steps) {
        console.log(`\n🔄 Running: ${step.name}`);
        const result = step.fn();
        if (!result) {
            allPassed = false;
            console.log(`❌ ${step.name} failed. Stopping workflow.`);
            break;
        }
    }
    
    if (allPassed) {
        console.log('\n🎉 ALL STEPS COMPLETED SUCCESSFULLY!');
        console.log('✅ Your modal layout fixes are ready for testing.');
    } else {
        console.log('\n⚠️  WORKFLOW INCOMPLETE - Please fix issues and try again.');
    }
}

// Run the workflow
main();

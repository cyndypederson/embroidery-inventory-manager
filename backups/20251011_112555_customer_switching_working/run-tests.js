#!/usr/bin/env node

/**
 * Simple Test Runner for Embroidery Inventory Manager
 * Runs basic connectivity and functionality tests
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

class SimpleTestRunner {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async testServerConnection() {
        return new Promise((resolve) => {
            const req = http.get(this.baseUrl, (res) => {
                if (res.statusCode === 200) {
                    this.results.passed++;
                    console.log('✅ Server is running and responding');
                    resolve(true);
                } else {
                    this.results.failed++;
                    this.results.errors.push(`Server returned status ${res.statusCode}`);
                    console.log(`❌ Server returned status ${res.statusCode}`);
                    resolve(false);
                }
            });

            req.on('error', (err) => {
                this.results.failed++;
                this.results.errors.push(`Connection failed: ${err.message}`);
                console.log(`❌ Connection failed: ${err.message}`);
                resolve(false);
            });

            req.setTimeout(5000, () => {
                req.destroy();
                this.results.failed++;
                this.results.errors.push('Connection timeout');
                console.log('❌ Connection timeout');
                resolve(false);
            });
        });
    }

    async testAPIEndpoints() {
        const endpoints = [
            '/api/inventory',
            '/api/customers',
            '/api/sales',
            '/api/gallery',
            '/api/ideas',
            '/health'
        ];

        for (const endpoint of endpoints) {
            const success = await this.testEndpoint(endpoint);
            if (success) {
                this.results.passed++;
                console.log(`✅ ${endpoint} - OK`);
            } else {
                this.results.failed++;
                this.results.errors.push(`${endpoint} failed`);
                console.log(`❌ ${endpoint} - FAILED`);
            }
        }
    }

    async testEndpoint(endpoint) {
        return new Promise((resolve) => {
            const req = http.get(`${this.baseUrl}${endpoint}`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });
            });

            req.on('error', () => resolve(false));
            req.setTimeout(3000, () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    async testDataFiles() {
        const dataFiles = [
            'data/inventory.json',
            'data/customers.json',
            'data/sales.json',
            'data/gallery.json',
            'data/ideas.json'
        ];

        for (const file of dataFiles) {
            try {
                const data = fs.readFileSync(file, 'utf8');
                JSON.parse(data); // Test if valid JSON
                this.results.passed++;
                console.log(`✅ ${file} - Valid JSON`);
            } catch (error) {
                this.results.failed++;
                this.results.errors.push(`${file} is invalid: ${error.message}`);
                console.log(`❌ ${file} - Invalid JSON`);
            }
        }
    }

    async testDependencies() {
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const requiredDeps = ['express', 'cors', 'mongodb', 'dotenv'];
            
            for (const dep of requiredDeps) {
                if (packageJson.dependencies[dep]) {
                    this.results.passed++;
                    console.log(`✅ ${dep} - Installed`);
                } else {
                    this.results.failed++;
                    this.results.errors.push(`Missing dependency: ${dep}`);
                    console.log(`❌ ${dep} - Missing`);
                }
            }
        } catch (error) {
            this.results.failed++;
            this.results.errors.push(`package.json error: ${error.message}`);
            console.log(`❌ package.json - Error`);
        }
    }

    async runTests() {
        console.log('🧪 Running Simple Test Suite...\n');
        
        await this.testDependencies();
        await this.testDataFiles();
        await this.testServerConnection();
        await this.testAPIEndpoints();
        
        this.printResults();
    }

    printResults() {
        console.log('\n📊 TEST RESULTS');
        console.log('================');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.results.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        const total = this.results.passed + this.results.failed;
        const successRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;
        console.log(`\n📈 Success Rate: ${successRate}%`);
        
        if (this.results.failed === 0) {
            console.log('\n🎉 All tests passed! Your application is ready to run.');
        } else {
            console.log('\n⚠️ Some tests failed. Please check the errors above.');
        }
    }
}

// Run tests
if (require.main === module) {
    const runner = new SimpleTestRunner();
    runner.runTests().catch(console.error);
}

module.exports = SimpleTestRunner;

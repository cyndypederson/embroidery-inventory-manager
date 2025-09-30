#!/usr/bin/env node

/**
 * Start Server and Run Tests
 * Automatically starts the server and runs comprehensive tests
 */

const { spawn } = require('child_process');
const http = require('http');
const SimpleTestRunner = require('./run-tests');
const EmbroideryTestSuite = require('./test-suite');

class StartAndTest {
    constructor() {
        this.serverProcess = null;
        this.baseUrl = 'http://localhost:3000';
        this.serverReady = false;
    }

    async startServer() {
        return new Promise((resolve, reject) => {
            console.log('🚀 Starting server...');
            
            this.serverProcess = spawn('node', ['server.js'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: process.cwd()
            });

            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`[SERVER] ${output.trim()}`);
                
                // Check if server is ready
                if (output.includes('Server Running') || output.includes('listening')) {
                    this.serverReady = true;
                    resolve();
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                console.error(`[SERVER ERROR] ${data.toString().trim()}`);
            });

            this.serverProcess.on('error', (error) => {
                console.error('Failed to start server:', error);
                reject(error);
            });

            this.serverProcess.on('exit', (code) => {
                if (code !== 0) {
                    console.error(`Server exited with code ${code}`);
                    reject(new Error(`Server exited with code ${code}`));
                }
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                if (!this.serverReady) {
                    console.error('Server startup timeout');
                    reject(new Error('Server startup timeout'));
                }
            }, 30000);
        });
    }

    async waitForServer() {
        console.log('⏳ Waiting for server to be ready...');
        
        for (let i = 0; i < 30; i++) {
            try {
                await this.testConnection();
                console.log('✅ Server is ready!');
                return true;
            } catch (error) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        throw new Error('Server did not become ready within 30 seconds');
    }

    async testConnection() {
        return new Promise((resolve, reject) => {
            const req = http.get(this.baseUrl, (res) => {
                if (res.statusCode === 200) {
                    resolve();
                } else {
                    reject(new Error(`Server returned status ${res.statusCode}`));
                }
            });

            req.on('error', reject);
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Connection timeout'));
            });
        });
    }

    async runSimpleTests() {
        console.log('\n🧪 Running Simple Tests...');
        const runner = new SimpleTestRunner();
        await runner.runTests();
        return runner.results;
    }

    async runFullTests() {
        console.log('\n🧪 Running Full Test Suite...');
        const testSuite = new EmbroideryTestSuite();
        await testSuite.runAllTests();
        return testSuite.results;
    }

    async run() {
        try {
            // Start server
            await this.startServer();
            
            // Wait for server to be ready
            await this.waitForServer();
            
            // Run simple tests first
            const simpleResults = await this.runSimpleTests();
            
            // If simple tests pass, run full tests
            if (simpleResults.failed === 0) {
                console.log('\n🎉 Simple tests passed! Running full test suite...');
                await this.runFullTests();
            } else {
                console.log('\n⚠️ Simple tests failed. Skipping full test suite.');
            }
            
        } catch (error) {
            console.error('\n❌ Error during testing:', error.message);
            process.exit(1);
        } finally {
            // Clean up server
            if (this.serverProcess) {
                console.log('\n🛑 Stopping server...');
                this.serverProcess.kill();
            }
        }
    }
}

// Run if called directly
if (require.main === module) {
    const startAndTest = new StartAndTest();
    startAndTest.run().catch(console.error);
}

module.exports = StartAndTest;

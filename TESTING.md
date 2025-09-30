# 🧪 Automated Testing for Embroidery Inventory Manager

This directory contains comprehensive automated tests to verify all functionality of the Embroidery Inventory Manager.

## 🚀 Quick Start

### Run All Tests (Recommended)
```bash
npm run test:full
```
This will start the server, run all tests, and generate a detailed report.

### Run Simple Tests Only
```bash
npm test
```
Quick connectivity and basic functionality tests.

### Run Tests with Server Auto-Start
```bash
node start-and-test.js
```
Automatically starts the server and runs all tests.

## 📋 Test Types

### 1. Simple Tests (`run-tests.js`)
- ✅ Server connectivity
- ✅ API endpoint availability
- ✅ Data file validation
- ✅ Dependency checking

### 2. Full Test Suite (`test-suite.js`)
- ✅ Desktop functionality
- ✅ Mobile responsiveness
- ✅ Data operations (CRUD)
- ✅ Search and filtering
- ✅ Data persistence
- ✅ Error handling
- ✅ Performance metrics
- ✅ Accessibility checks

## 🎯 What Gets Tested

### Core Functionality
- [x] Server startup and connectivity
- [x] All navigation tabs
- [x] Add/Edit/Delete operations
- [x] Search and filtering
- [x] Data persistence
- [x] Error handling

### Mobile & Desktop
- [x] Responsive design
- [x] Mobile card layouts
- [x] Touch interactions
- [x] Desktop table views
- [x] Modal functionality

### Data Management
- [x] MongoDB connectivity
- [x] localStorage fallback
- [x] Data synchronization
- [x] Backup/restore
- [x] Import/export

### Performance
- [x] Page load times
- [x] Memory usage
- [x] Response times
- [x] Memory leak detection

## 📊 Test Reports

### Console Output
Tests provide real-time feedback with:
- ✅ Passed tests
- ❌ Failed tests
- ⚠️ Warnings
- 📊 Summary statistics

### JSON Report
Detailed test results are saved to `test-report.json` including:
- Test results summary
- Error details
- Performance metrics
- Timestamps

## 🔧 Configuration

### Test Settings
- **Timeout**: 30 seconds for server startup
- **Page Load**: 5 seconds timeout
- **API Calls**: 3 seconds timeout
- **Viewport**: Desktop (1920x1080), Mobile (375x667)

### Browser Settings
- Headless mode (can be changed in `test-suite.js`)
- Disabled sandbox for CI/CD compatibility
- Console logging enabled
- Error capture enabled

## 🚨 Troubleshooting

### Common Issues

**Server won't start:**
```bash
# Check if port 3000 is available
lsof -i :3000
# Kill process if needed
kill -9 <PID>
```

**Tests fail with connection errors:**
```bash
# Make sure server is running
npm start
# In another terminal, run tests
npm test
```

**Puppeteer issues:**
```bash
# Install dependencies
npm install
# Make sure puppeteer is installed
npm install puppeteer
```

### Debug Mode
To see browser interactions:
```javascript
// In test-suite.js, change:
headless: false  // Shows browser window
devtools: true   // Opens DevTools
```

## 📈 Continuous Integration

### GitHub Actions Example
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:full
```

## 🎉 Success Criteria

Tests are considered successful when:
- ✅ All simple tests pass
- ✅ Server starts without errors
- ✅ All API endpoints respond
- ✅ Data operations work correctly
- ✅ Mobile and desktop views render properly
- ✅ No critical JavaScript errors
- ✅ Performance metrics are within acceptable ranges

## 📝 Adding New Tests

### Simple Test
Add to `run-tests.js`:
```javascript
async testNewFeature() {
    // Your test logic here
    const success = await this.testSomething();
    if (success) {
        this.results.passed++;
        console.log('✅ New Feature - OK');
    } else {
        this.results.failed++;
        console.log('❌ New Feature - FAILED');
    }
}
```

### Full Test
Add to `test-suite.js`:
```javascript
async testNewFeature() {
    // Your test logic here
    await this.page.click('#newFeatureButton');
    await this.page.waitForSelector('#result');
    // Assertions...
}
```

## 🔍 Monitoring

### Real-time Monitoring
```bash
# Watch mode - reruns tests on file changes
npm run test:watch
```

### Performance Monitoring
```bash
# Run with performance profiling
node --inspect test-suite.js
```

---

**Happy Testing! 🎉**

These automated tests ensure your Embroidery Inventory Manager is robust, reliable, and ready for production use.

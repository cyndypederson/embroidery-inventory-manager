# 🚀 Deployment Checklist

## Pre-Deployment Testing

### 1. Automated Tests
```bash
# Run all tests
npm run test:all

# Or run individually:
npm run test:smoke          # Quick smoke tests (30 seconds)
npm run test:modals         # Modal separation tests (2 minutes)
npm run test:comprehensive  # Full test suite (5 minutes)
```

### 2. Manual Testing Checklist

#### ✅ Core Functionality
- [ ] App loads without errors
- [ ] All tabs switch correctly
- [ ] Data loads from API/localStorage
- [ ] Search functionality works
- [ ] Filters work correctly

#### ✅ Modal Testing
- [ ] **Projects Tab**: Edit button opens `editProjectModal` (not `editItemModal`)
- [ ] **Inventory Tab**: Edit button opens `editInventoryModal` (not `editItemModal`)
- [ ] **Project Modal**: Has image section, customer fields, due date, etc.
- [ ] **Inventory Modal**: No image section, has price, location, supplier fields
- [ ] **No Cross-Contamination**: Opening one modal doesn't affect the other
- [ ] **Form Submissions**: Both modals save data correctly

#### ✅ Mobile Testing
- [ ] Mobile viewport (375x667) displays correctly
- [ ] Mobile cards show for each tab
- [ ] Mobile add buttons are centered and properly styled
- [ ] Mobile modals are single-column layout
- [ ] Touch interactions work properly

#### ✅ Data Integrity
- [ ] Projects save with correct fields
- [ ] Inventory items save with correct fields
- [ ] No data corruption between types
- [ ] Images display correctly for projects
- [ ] No broken image icons for inventory items

#### ✅ Performance
- [ ] Page loads in under 5 seconds
- [ ] Tab switching is responsive
- [ ] No console errors
- [ ] Memory usage is reasonable

## Deployment Process

### 1. Pre-Deployment
```bash
# 1. Run all tests
npm run test:all

# 2. Check for linting errors
npm run lint  # (if available)

# 3. Backup current data
cp -r data/ backup-$(date +%Y%m%d-%H%M%S)/

# 4. Update version number
npm run version:bump
```

### 2. Deployment Options

#### Option A: Local Network Deployment
```bash
# Start server
npm start

# Test on network
# Access via: http://YOUR_IP:3002
```

#### Option B: Cloud Deployment
```bash
# Deploy to your chosen platform
npm run deploy
```

### 3. Post-Deployment Verification

#### ✅ Immediate Checks
- [ ] App loads on target URL
- [ ] All tabs work
- [ ] Data persists
- [ ] Mobile view works
- [ ] No console errors

#### ✅ User Acceptance Testing
- [ ] Add a new project
- [ ] Add a new inventory item
- [ ] Edit existing project
- [ ] Edit existing inventory item
- [ ] Test on mobile device
- [ ] Test on different browsers

## Rollback Plan

If issues are found after deployment:

### 1. Quick Rollback
```bash
# Stop current server
pm2 stop embroidery-inventory

# Restore from backup
cp -r backup-YYYYMMDD-HHMMSS/ data/

# Restart with previous version
git checkout previous-stable-commit
npm start
```

### 2. Data Recovery
```bash
# Restore data from backup
cp -r backup-YYYYMMDD-HHMMSS/data/* data/

# Restart server
pm2 restart embroidery-inventory
```

## Monitoring

### 1. Health Checks
- Monitor server logs: `pm2 logs embroidery-inventory`
- Check error rates in browser console
- Monitor response times

### 2. User Feedback
- Watch for user reports of issues
- Monitor mobile usage patterns
- Check for modal-related complaints

## Emergency Contacts

- **Developer**: [Your contact info]
- **Server Admin**: [Server admin contact]
- **Backup Location**: [Where backups are stored]

---

## 🚨 Critical Issues to Watch For

1. **Modal Cross-Contamination**: Projects opening inventory modal or vice versa
2. **Broken Image Icons**: Inventory items showing broken image placeholders
3. **Mobile Layout Issues**: Add buttons not centered or properly styled
4. **Data Loss**: Items not saving or saving with wrong fields
5. **Performance Degradation**: Slow loading or unresponsive interface

## ✅ Success Criteria

- All automated tests pass
- Manual testing checklist completed
- No critical issues reported
- Performance within acceptable limits
- User acceptance testing passed

---

**Remember**: It's better to catch issues in testing than in production! 🛡️

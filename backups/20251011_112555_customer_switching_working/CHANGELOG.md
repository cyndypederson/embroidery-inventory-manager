# Changelog

All notable changes to the Embroidery Inventory Manager will be documented in this file.

## [1.0.75] - 2025-01-05

### 🎯 **Major UI/UX Improvements**

#### **Table Header Optimization**
- **Problem Solved**: Reduced table header clutter on the home tab
- **Solution**: Implemented context-aware table headers with two view modes:
  - **Simplified Home View** (default): 4 columns - Project, Status, Due Date, Actions
  - **Detailed Edit View** (toggle): 8 columns - Project, Category, Qty, Status, Due Date, Notes, Link, Actions
- **User Benefit**: Clean, focused view for daily use with option for detailed information when needed

#### **Smart View Toggle**
- Added "Detailed View" toggle button in the Sales section
- Dynamic table header switching based on view mode
- Visual feedback with button state changes
- Seamless switching between simple and comprehensive views

### 🔧 **Bug Fixes & Technical Improvements**

#### **Sticky Header Functionality**
- **Fixed**: Table headers not staying sticky when scrolling
- **Root Cause**: CSS properties `max-height` and `overflow-y` were commented out
- **Solution**: Restored essential CSS properties for sticky positioning
- **Result**: Headers now properly stick to top when scrolling through customer groups

#### **Customer Header Positioning**
- **Fixed**: Customer headers interfering with main table headers
- **Solution**: Changed customer headers from `position: sticky` to `position: relative`
- **Result**: Clean layering with main headers staying sticky above customer headers

#### **Table Column Alignment**
- **Fixed**: Column misalignment after checkbox functionality additions
- **Solution**: Corrected `colspan` values to match actual column count
- **Result**: All columns now properly align with their headers

### 🚮 **Code Cleanup**

#### **Removed Invoice-Related Features**
- Removed checkbox selection system for invoice functionality
- Removed "Add Selected to Invoice" button
- Removed `addProjectToInvoice()` function
- Removed checkbox-related CSS styles
- **Reason**: Features were causing table formatting issues and complexity

#### **Validation Error Resolution**
- **Fixed**: Console flooding with "Invalid maxLength validation" errors
- **Root Cause**: Form validation trying to validate fields with invalid maxLength attributes
- **Solution**: Added validation guards to only apply maxLength validation to fields with valid values
- **Result**: Clean console output without validation errors

### 📱 **Mobile Compatibility**
- Maintained mobile card functionality
- Preserved responsive design principles
- Ensured sticky headers work across all device sizes

### 🎨 **Visual Improvements**
- Streamlined table appearance with context-appropriate columns
- Better visual hierarchy with simplified home view
- Consistent button styling and states
- Improved user experience with less cognitive load

### 🔄 **Backward Compatibility**
- All existing functionality preserved
- No data loss or migration required
- Existing projects and customers remain fully functional
- Mobile app functionality unchanged

---

## Previous Versions

### [1.0.74] - Previous Version
- Basic project management functionality
- Customer grouping system
- Mobile-responsive design
- Invoice generation system (removed in 1.0.75)

---

## Development Notes

### **Key Learnings**
1. **UI Simplicity**: Fewer columns on home view significantly improves usability
2. **Sticky Headers**: Require proper CSS container setup with `max-height` and `overflow-y`
3. **Feature Scope**: Adding complex features can break existing functionality if not carefully integrated
4. **User Feedback**: Context-aware interfaces reduce cognitive load and improve workflow

### **Technical Debt Addressed**
- Removed unused checkbox selection code
- Cleaned up CSS conflicts between sticky elements
- Simplified table rendering logic
- Improved form validation error handling

### **Performance Improvements**
- Reduced DOM complexity with fewer columns in default view
- Cleaner console output without validation errors
- More efficient table rendering with context-aware headers

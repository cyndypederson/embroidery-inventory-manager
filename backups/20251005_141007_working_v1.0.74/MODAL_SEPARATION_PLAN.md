# Modal Separation Plan

## ✅ Completed
1. Created separate HTML modals:
   - `editProjectModal` - For editing projects (with image support)
   - `editInventoryModal` - For editing inventory items (no images)

## 🔨 Next Steps (JavaScript)

### Functions to Create:
1. `editInventoryItem(index)` - Populate and show edit inventory modal
2. `handleEditInventory()` - Handle edit inventory form submission  
3. `calculateEditInventoryTotalValue()` - Calculate total value for inventory

### Functions to Update:
1. `editProject(index)` - Change to use `editProjectModal` instead of `editItemModal`
2. `handleEditItem()` - Update to use `editProjectForm` or remove if not needed

### Functions to Check:
1. All onclick handlers in tables that call `editItem()` - need to call correct function based on type
2. Mobile card edit buttons - need to call correct function

## Benefits
- ✅ No more cross-contamination between projects and inventory
- ✅ Inventory items won't show broken image icons
- ✅ Each modal has only the fields it needs
- ✅ Cleaner, more maintainable code

## Current Status
HTML modals are complete. JavaScript functions need to be created/updated.



# Pattern Upload System - Current Implementation

## Status: 🚧 Shelved - Rethink Needed

This document summarizes the current pattern upload functionality for future redesign consideration.

## Current Implementation

### UI Components
- **Patterns Tab**: Main interface for viewing/browsing patterns
- **Add Pattern Modal**: Form for uploading new patterns
- **Search & Filters**: Filter by category, designer, search by name
- **Pattern Cards**: Grid display of pattern thumbnails

### Server Endpoints (`server.js`)
- `GET /api/patterns` - List all patterns
- `GET /api/patterns/:id` - Get single pattern
- `POST /api/patterns` - Upload new pattern (checks duplicates)
- `PUT /api/patterns/:id` - Update pattern
- `DELETE /api/patterns/:id` - Delete pattern
- `GET /api/patterns/search` - Search patterns
- `POST /api/patterns/check-duplicate` - Check for duplicate patterns

### Data Storage
- **MongoDB Collection**: `patterns` collection in `embroidery_inventory` database
- **JSON Backup**: `data/patterns.json` (backed up on each save)
- **File Storage**: `public/patterns/` directory for uploaded pattern files
- **Source Files**: `patterns-source/` directory (contains original pattern files)

### Import Scripts
- `import-patterns.js` - Bulk import patterns from local folders
- `import-patterns-all.js` - Import all patterns from source directories
- `cleanup-pattern-names.js` - Clean up pattern names
- `check-duplicates.js` - Find duplicate patterns
- `unpack-patterns.js` - Extract/unpack pattern files

### Pattern Data Structure
```javascript
{
  name: string,           // Pattern name
  imageUrl: string,       // URL to pattern image/PDF
  designer: string,       // Designer name
  category: string,       // Category (Floral, Animal, Text, etc.)
  dateAdded: Date,        // When added
  lastModified: Date,     // Last modification
  // ... other fields
}
```

### Features
- ✅ Duplicate detection (normalized name comparison)
- ✅ File upload to `public/patterns/`
- ✅ MongoDB storage with JSON backup
- ✅ Search and filter functionality
- ✅ Bulk import from folders
- ✅ Pattern name normalization

## Files Related to Patterns

### Main Files
- `server.js` - Pattern API endpoints (lines 460-675)
- `script.js` - Pattern UI functions (search for `openAddPatternModal`, `filterPatterns`)
- `index.html` - Patterns tab UI (lines 629-664)

### Utility Scripts
- `import-patterns.js` - Bulk import utility
- `import-patterns-all.js` - Full directory import
- `cleanup-pattern-names.js` - Name cleanup
- `check-duplicates.js` - Duplicate finder
- `unpack-patterns.js` - File unpacker

### Directories
- `patterns-source/` - Original pattern source files
  - `embroidery 2/` - Nested folder structure
  - `patterns-flat/` - Flattened pattern files
- `public/patterns/` - Uploaded pattern files (served statically)

## Issues to Consider for Redesign

1. **File Storage**: Current approach uses `public/patterns/` - consider cloud storage or better organization
2. **Duplicate Detection**: Current normalization might miss some duplicates
3. **Bulk Upload**: Current import scripts work but could be more user-friendly
4. **Pattern Metadata**: Consider adding more fields (stitch count, size, colors, etc.)
5. **Thumbnail Generation**: Currently stores full files - consider auto-thumbnail generation
6. **Organization**: Nested folder structures from source - how to handle in UI?
7. **Integration**: How patterns relate to projects/inventory items

## Next Steps (When Revisiting)

1. Define requirements for pattern management
2. Decide on file storage strategy (local vs cloud)
3. Design better duplicate detection
4. Create better bulk upload UI
5. Consider pattern versioning
6. Link patterns to projects/inventory items
7. Add pattern preview/thumbnail generation

## Notes
- Pattern upload was working but may need refinement
- Consider integrating patterns more closely with project/inventory system
- Current MongoDB + JSON backup approach works but may need optimization


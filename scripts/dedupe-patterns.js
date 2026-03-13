/**
 * Replace large pattern assets in `public/patterns` with symbolic links that
 * point to the original sources under `patterns-source/`.
 *
 * This prevents storing duplicate 10+ GB copies of the same PDFs while keeping
 * the hashed filenames that the application expects to serve.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEST_DIR = path.join(ROOT, 'public', 'patterns');

// Prioritise the raw "embroidery 2" directory and fall back to flattened files.
const SOURCE_DIRS = [
  path.join(ROOT, 'patterns-source', 'embroidery 2'),
  path.join(ROOT, 'patterns-source', 'patterns-flat')
];

/**
 * Recursively collect all files in a directory tree, returning a map keyed by
 * the filename (basename) so we can look up originals quickly.
 */
function collectSourceFiles(dir, map) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(fullPath, map);
    } else if (entry.isFile()) {
      // Only store the first occurrence of a filename so earlier directories take priority.
      if (!map.has(entry.name)) {
        map.set(entry.name, fullPath);
      }
    }
  }
}

function ensureSymlink(targetPath, linkPath) {
  const relativeTarget = path.relative(path.dirname(linkPath), targetPath);

  if (fs.existsSync(linkPath)) {
    const stats = fs.lstatSync(linkPath);
    if (stats.isSymbolicLink()) {
      const currentTarget = fs.readlinkSync(linkPath);
      if (currentTarget === relativeTarget) {
        return; // Already the expected symlink
      }
      fs.unlinkSync(linkPath);
    } else {
      fs.unlinkSync(linkPath);
    }
  }

  fs.symlinkSync(relativeTarget, linkPath);
}

function main() {
  if (!fs.existsSync(DEST_DIR)) {
    console.error(`Destination directory not found: ${DEST_DIR}`);
    process.exit(1);
  }

  const sourceMap = new Map();
  for (const dir of SOURCE_DIRS) {
    collectSourceFiles(dir, sourceMap);
  }

  const destEntries = fs.readdirSync(DEST_DIR, { withFileTypes: true });
  let converted = 0;
  let skipped = 0;

  for (const entry of destEntries) {
    if (!entry.isFile() && !entry.isSymbolicLink()) {
      continue;
    }

    const destPath = path.join(DEST_DIR, entry.name);
    const parts = entry.name.split('_');
    if (parts.length < 3) {
      skipped++;
      continue;
    }

    const originalName = parts.slice(2).join('_');
    const sourcePath = sourceMap.get(originalName);

    if (!sourcePath) {
      console.warn(`⚠️  Unable to find original for ${entry.name}`);
      skipped++;
      continue;
    }

    ensureSymlink(sourcePath, destPath);
    converted++;
  }

  console.log(`Converted ${converted} pattern files to symlinks. Skipped ${skipped}.`);
}

main();






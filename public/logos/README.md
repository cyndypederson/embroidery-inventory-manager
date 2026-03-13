# Logos Folder

This folder contains logo images that are automatically loaded when generating price tags.

## Folder Structure

```
public/logos/
├── vendors/          # Vendor/Shop logos (vendor-dependent)
│   ├── flippin-happy.png
│   ├── flippin-happy.jpg
│   └── [vendor-name].png
└── my-logo.png       # Your logo (auto-loaded)
```

## Vendor Logos

Place vendor logos in the `vendors/` folder with the filename matching the vendor name (normalized).

**Naming Convention:**
- Vendor name: "Flippin' Happy" → filename: `flippin-happy.png` (or `.jpg`, `.svg`, etc.)
- The system automatically normalizes vendor names:
  - Converts to lowercase
  - Replaces spaces and special characters with hyphens
  - Removes leading/trailing hyphens

**Example:**
- Vendor: "Flippin' Happy" → Look for: `flippin-happy.png`
- Vendor: "First Avenue Shop" → Look for: `first-avenue-shop.png`
- Vendor: "ABC Store" → Look for: `abc-store.png`

**Supported Formats:**
- PNG (`.png`)
- JPEG (`.jpg`, `.jpeg`)
- SVG (`.svg`)
- GIF (`.gif`)
- WebP (`.webp`)

The system will try each format automatically.

## Your Logo

Place your logo in the `logos/` folder (not in `vendors/`). The system will look for:
- `my-logo.png` (or `.jpg`, `.svg`, etc.)
- `logo.png`
- `stitchcraft-logo.png`
- `cyndyp-logo.png`

## How It Works

1. When you enter a vendor name in the price tag modal, the system automatically searches for a matching logo file
2. If found, the logo URL is automatically filled in
3. If not found, you can still enter a URL manually
4. Your logo is automatically loaded when the modal opens (if not already set)

## Tips

- Use PNG format for best compatibility
- Keep logo files reasonably sized (under 500KB recommended)
- Use transparent backgrounds for PNG files when possible
- Logo dimensions: Recommended max 200x100px for price tags


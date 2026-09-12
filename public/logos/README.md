# Logos Folder

This folder contains logo images used across the app (hang tags, price tags, invoices, header, and favicon).

## Where to drop a new brand logo

Replace this file:

```
public/logos/my-logo.png
```

That is the only brand-logo file you need to update. Hang tags, price tags, invoices, the header, and the browser icon all load it (with `stitchcraft-logo.svg` as a fallback if the PNG is missing).

**Tips for a clean hang tag:**
- PNG with a **transparent** background (avoid the gray designer grid)
- Keep the needle + name + slogan in one image if that is the lockup you want on tags
- A few hundred KB is fine; square or slightly tall works best in the 2.5in tag cell

## Folder Structure

```
public/logos/
├── vendors/              # Vendor/Shop logos (vendor-dependent)
│   └── [vendor-name].png
├── my-logo.png           # YOUR brand logo — drop replacements here
├── stitchcraft-logo.svg  # Fallback if my-logo.png is missing
└── qr-facebook.png       # QR image for Facebook (logo tags + price tag footer)
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

Place your logo in this folder (not in `vendors/`). Lookup order:

1. `my-logo.png` (or `.jpg`, `.svg`, `.webp`, `.gif`)
2. `stitchcraft-logo.svg` (bundled fallback)

## How It Works

1. When you enter a vendor name in the price tag modal, the system automatically searches for a matching logo file
2. If found, the logo URL is automatically filled in
3. If not found, you can still enter a URL manually
4. Your logo is automatically loaded when hang tags or invoices are generated

## Tips

- Use PNG format for best compatibility
- Keep logo files reasonably sized (under 500KB recommended)
- Use transparent backgrounds for PNG files when possible

#!/usr/bin/env node
/**
 * Hoop display base — Cyndy P Stitch Craft
 * Copy of the small wooden display you buy: one rounded square, keyhole
 * for the hoop screw, CyndyP on the front. Fits hoops 10 in and smaller.
 *
 * Glue 6 layers of 1/8 in plywood → ~19.2 mm (the store one is ~20 mm).
 * Loosen the hoop screw, put it at the bottom of the hoop, tighten, slide
 * the hardware through the wide hole and down into the slot.
 *
 * LightBurn — Sculpfun S30 Pro Max (20W), 400×400 mm bed
 *   Blue     #0000FF = CUT (Line, through)     600 mm/min, 90%, 2 passes, air on
 *   Magenta  #FF00FF = NAME (Line engrave)     3000 mm/min, 14%, 1 pass, air off
 *
 * Units: mm. Stock 1/8 in ≈ 3.2 mm. Kerf 0.18 mm. All engrave is Line.
 */

const fs = require('fs');
const path = require('path');

const CUT = '#0000FF';
const ENG = '#FF00FF';
const IN = 25.4;
const STOCK = 3.2;
const KERF = 0.18;
const LAYERS = 6;
const MARGIN = 8;
const GAP = 4;
const LASER = { device: 'Sculpfun S30 Pro Max', bed: 400 };

const BASE = {
    w: 76.2,   // 3.00 in
    h: 70.1,   // 2.76 in
    corner: 16,
    neckW: 8.4,
    neckH: 22,
    pocketR: 11
};

function roundedRectPath(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    return [
        `M ${(x + rr).toFixed(3)} ${y.toFixed(3)}`,
        `H ${(x + w - rr).toFixed(3)}`,
        `A ${rr} ${rr} 0 0 1 ${(x + w).toFixed(3)} ${(y + rr).toFixed(3)}`,
        `V ${(y + h - rr).toFixed(3)}`,
        `A ${rr} ${rr} 0 0 1 ${(x + w - rr).toFixed(3)} ${(y + h).toFixed(3)}`,
        `H ${(x + rr).toFixed(3)}`,
        `A ${rr} ${rr} 0 0 1 ${x.toFixed(3)} ${(y + h - rr).toFixed(3)}`,
        `V ${(y + rr).toFixed(3)}`,
        `A ${rr} ${rr} 0 0 1 ${(x + rr).toFixed(3)} ${y.toFixed(3)}`,
        'Z'
    ].join(' ');
}

/** Closed keyhole: wide pocket for the screw hardware, narrow slot for the shaft. */
function keyholePath(cx, yTop, neckW, neckH, pocketR) {
    const n = neckW / 2;
    const yJoin = yTop + neckH;
    const topR = n;
    return [
        `M ${(cx - n).toFixed(3)} ${(yTop + topR).toFixed(3)}`,
        `A ${topR} ${topR} 0 0 1 ${(cx + n).toFixed(3)} ${(yTop + topR).toFixed(3)}`,
        `L ${(cx + n).toFixed(3)} ${yJoin.toFixed(3)}`,
        `A ${pocketR} ${pocketR} 0 1 1 ${(cx - n).toFixed(3)} ${yJoin.toFixed(3)}`,
        'Z'
    ].join(' ');
}

function nameMark(x, y) {
    const tx = x + 20;
    const ty = y + 26;
    return [
        `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-family="Snell Roundhand, Apple Chancery, cursive" font-size="7.4" fill="none" stroke="${ENG}" stroke-width="0.22">CyndyP</text>`,
        `<text x="${tx.toFixed(1)}" y="${(ty + 5.2).toFixed(1)}" text-anchor="middle" font-family="Georgia, Times New Roman, serif" font-size="2.6" letter-spacing="0.55" fill="none" stroke="${ENG}" stroke-width="0.16">STITCH CRAFT</text>`
    ].join('\n      ');
}

function piece(x, y, { nameOn } = {}) {
    const cx = x + BASE.w * 0.58;
    const yTop = y + 11;
    const outline = roundedRectPath(x, y, BASE.w, BASE.h, BASE.corner);
    const hole = keyholePath(cx, yTop, BASE.neckW, BASE.neckH, BASE.pocketR);
    const cuts = `    <path d="${outline}"/>\n    <path d="${hole}"/>`;
    const engrave = nameOn ? `      ${nameMark(x, y)}` : '';
    return { cuts, engrave, x, y };
}

function standBlocks(standCount) {
    const cols = 3;
    const rowsPer = 2;
    const pieces = [];
    for (let s = 0; s < standCount; s++) {
        const blockY = MARGIN + s * (rowsPer * BASE.h + (rowsPer - 1) * GAP + GAP + 2);
        for (let r = 0; r < rowsPer; r++) {
            for (let c = 0; c < cols; c++) {
                const x = MARGIN + c * (BASE.w + GAP);
                const y = blockY + r * (BASE.h + GAP);
                const nameOn = r === 0 && c === 0;
                pieces.push(piece(x, y, { nameOn }));
            }
        }
    }
    const sheetW = Math.ceil(MARGIN * 2 + cols * BASE.w + (cols - 1) * GAP);
    const blockH = rowsPer * BASE.h + (rowsPer - 1) * GAP;
    const sheetH = Math.ceil(MARGIN * 2 + standCount * blockH + (standCount - 1) * (GAP + 2));
    return { pieces, sheetW, sheetH, cols, standCount, fronts: standCount };
}

function lightburnSvg(layout, label) {
    const cuts = layout.pieces.map((p) => p.cuts).join('\n');
    const names = layout.pieces.filter((p) => p.engrave).map((p) => p.engrave).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${layout.sheetW}mm" height="${layout.sheetH}mm" viewBox="0 0 ${layout.sheetW} ${layout.sheetH}">
  <!-- Cyndy P Stitch Craft hoop display base (${label}) for ${LASER.device}.
       Blue #0000FF = CUT Line. 600 mm/min, 90%, 2 passes, air on.
       Magenta #FF00FF = NAME Line. 3000 mm/min, 14%, 1 pass, air off.
       ${layout.fronts} stand(s): 6 layers each. CyndyP is the front of each stack.
       Glue ${LAYERS} layers (~${(LAYERS * STOCK).toFixed(1)} mm). Kerf ${KERF} mm.
       One size fits hoops 10 in and smaller. Convert name to paths. Do not use Fill. -->
  <g id="cut" fill="none" stroke="${CUT}" stroke-width="0.15">
${cuts}
  </g>
  <g id="engrave-name" fill="none" stroke="${ENG}" stroke-width="0.22" stroke-linecap="round" stroke-linejoin="round">
${names}
  </g>
</svg>
`;
}

function assembledSvg() {
    const w = 180;
    const h = 230;
    const bx = 52;
    const by = 148;
    const wood = '#c9a15e';
    const woodEdge = '#8d6b32';
    const hoopR = 58;
    const hoopCx = 90;
    const hoopCy = 88;
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm">
  <rect width="100%" height="100%" fill="#f4efe6"/>
  <rect x="0" y="210" width="${w}" height="20" fill="#1c1c1c"/>
  <g id="base">
    <rect x="${bx + 4}" y="${by + 6}" width="${BASE.w}" height="8" rx="2" fill="#5c4320" opacity="0.25"/>
    <rect x="${bx}" y="${by}" width="${BASE.w}" height="${BASE.h * 0.42}" rx="8" fill="${wood}" stroke="${woodEdge}" stroke-width="0.8"/>
    <rect x="${bx + BASE.w * 0.5 - 4}" y="${by + 6}" width="8.4" height="18" rx="4" fill="#7a5a28" opacity="0.55"/>
    <text x="${bx + 20}" y="${by + 16}" text-anchor="middle" font-family="Snell Roundhand, Apple Chancery, cursive" font-size="7.2" fill="#5a3f1c">CyndyP</text>
    <text x="${bx + 20}" y="${by + 21}" text-anchor="middle" font-family="Georgia, Times New Roman, serif" font-size="2.5" letter-spacing="0.5" fill="#5a3f1c">STITCH CRAFT</text>
  </g>
  <g id="hoop">
    <circle cx="${hoopCx}" cy="${hoopCy}" r="${hoopR}" fill="#d7b06a" stroke="${woodEdge}" stroke-width="1.1"/>
    <circle cx="${hoopCx}" cy="${hoopCy}" r="${hoopR - 3.2}" fill="#efe3c4"/>
    <circle cx="${hoopCx}" cy="${hoopCy}" r="${hoopR - 7.5}" fill="#f4ead3"/>
    <circle cx="${hoopCx}" cy="${hoopCy}" r="${hoopR - 3.2}" fill="none" stroke="#c49a55" stroke-width="1.5"/>
    <g fill="none" stroke="#7a8f62" stroke-width="0.85" stroke-linecap="round">
      <path d="M ${hoopCx - 22} ${hoopCy + 8} C ${hoopCx - 6} ${hoopCy - 24}, ${hoopCx + 12} ${hoopCy - 20}, ${hoopCx + 24} ${hoopCy + 6}"/>
    </g>
    <rect x="${hoopCx - 3}" y="${hoopCy + hoopR - 6}" width="6" height="14" rx="1.2" fill="#c9a15e" stroke="${woodEdge}" stroke-width="0.4"/>
    <circle cx="${hoopCx}" cy="${hoopCy + hoopR + 9}" r="2.1" fill="#8d8d8d" stroke="#5c5c5c" stroke-width="0.35"/>
  </g>
</svg>
`;
}

function previewHtml(one, pack) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hoop display base — Cyndy P Stitch Craft</title>
  <style>
    :root { --ink: #2c2418; --muted: #6d6254; --paper: #f6f1e8; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: var(--paper); color: var(--ink); }
    header { padding: 28px 24px 8px; max-width: 980px; margin: 0 auto; }
    header p.kicker { letter-spacing: 0.22em; text-transform: uppercase; font-size: 11px; color: var(--muted); margin: 0 0 6px; }
    h1 { font-family: "Snell Roundhand", "Apple Chancery", cursive; font-size: 42px; font-weight: 400; margin: 0; }
    .lead { max-width: 980px; margin: 0 auto; padding: 8px 24px 18px; color: var(--muted); line-height: 1.5; }
    .hero { max-width: 420px; margin: 0 auto; padding: 0 16px 24px; }
    .hero img { width: 100%; background: #f4efe6; border-radius: 12px; }
    .cut { max-width: 980px; margin: 0 auto 32px; padding: 0 24px; }
    .how { max-width: 980px; margin: 0 auto 32px; padding: 0 24px; }
    .how ol { line-height: 1.55; }
    .swatch { display: inline-block; width: 11px; height: 11px; border-radius: 2px; vertical-align: -1px; margin-right: 4px; }
    table { border-collapse: collapse; width: 100%; background: #fff; border-radius: 10px; overflow: hidden; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #efe6d8; font-size: 14px; }
    th { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
    .file { font-family: ui-monospace, Menlo, monospace; color: #7a5a2a; }
    @media (max-width: 720px) { h1 { font-size: 32px; } }
  </style>
</head>
<body>
  <header>
    <p class="kicker">Cyndy P Stitch Craft · LightBurn</p>
    <h1>Hoop display base</h1>
  </header>
  <p class="lead">The same idea as the little birch display from Amazon: one rounded square, about 3″ × 2¾″, with a keyhole for the hoop screw. One size holds hoops up to 10″. Glue six layers of 1/8″ plywood so it stands about ¾″ thick.</p>
  <div class="hero">
    <img src="circle-hoop-stand-assembled.svg" alt="Hoop standing on the wooden display base">
  </div>
  <section class="cut">
    <h2>LightBurn — Sculpfun S30 Pro Max 20W</h2>
    <table>
      <tr><th>Color</th><th>Layer</th><th>Mode</th><th>Speed</th><th>Power</th><th>Passes</th><th>Air</th></tr>
      <tr><td><span class="swatch" style="background:#0000FF"></span> Blue</td><td>CUT — outline and keyhole</td><td>Line, through</td><td>600 mm/min</td><td>90%</td><td>2</td><td>On</td></tr>
      <tr><td><span class="swatch" style="background:#FF00FF"></span> Magenta</td><td>NAME — CyndyP / STITCH CRAFT on the front face</td><td>Line, engrave</td><td>3000 mm/min</td><td>14%</td><td>1</td><td>Off</td></tr>
    </table>
    <p class="lead" style="padding:12px 0 0">Set both layers to <strong>Line</strong>. Convert the name to paths. Do not use Fill. <strong>Six squares = one stand</strong> (${(LAYERS * STOCK).toFixed(1)} mm thick, same as the Amazon base). The CyndyP piece is the front. Files are in Downloads as <code>CyndyP-hoop-display-base.svg</code> (1 stand) and <code>CyndyP-hoop-display-base-2pack.svg</code> (2 stands).</p>
    <h3 style="margin:22px 0 8px">One stand (6 layers)</h3>
    <object data="hoop-display-base.svg" type="image/svg+xml" style="width:100%; min-height:240px; background:#fff; border:1px solid #e4d8c4; border-radius:10px">one stand</object>
  </section>
  <section class="how">
    <h2>Assembly</h2>
    <ol>
      <li>Cut 6 layers. The piece with CyndyP is the front.</li>
      <li>Glue them in a stack, keyholes lined up. Clamp until dry.</li>
      <li>Loosen the hoop screw, put it at the bottom of the hoop, tighten.</li>
      <li>Slide the screw through the wide hole and into the slot. The hardware hides in the base.</li>
    </ol>
  </section>
</body>
</html>
`;
}

function readmeText(one, pack) {
    return `Cyndy P Stitch Craft — hoop display base (LightBurn)

Same idea as the birch Amazon display: a rounded square about 3 × 2.76 in
with a keyhole for the hoop screw. One size fits hoops 10 in and smaller.

Glue ${LAYERS} layers of 1/8 in plywood → ~${(LAYERS * STOCK).toFixed(1)} mm thick
(the store stand is about 20 mm / 0.79 in).

Files
- hoop-display-base.svg          one stand, ${LAYERS} squares, ${one.sheetW} × ${one.sheetH} mm
- hoop-display-base-2pack.svg    two stands, ${pack.pieces.length} squares, ${pack.sheetW} × ${pack.sheetH} mm
- /Users/cyndyp/Downloads/CyndyP-hoop-display-base.svg
- /Users/cyndyp/Downloads/CyndyP-hoop-display-base-2pack.svg
- /Users/cyndyp/Downloads/CyndyP-circle-hoop-stand-assembled.svg
- /Users/cyndyp/Downloads/CyndyP-circle-hoop-stand-README.txt

Material
- 1/8 in ≈ 3.2 mm plywood
- Kerf assumed ${KERF} mm

LightBurn — Sculpfun S30 Pro Max 20W
- Blue     #0000FF  CUT     Line, 600 mm/min, 90%, 2 passes, air on
- Magenta  #FF00FF  NAME    Line engrave, 3000 mm/min, 14%, 1 pass, air off
  Convert the name to paths. Do not use Fill.

Assembly
1. The CyndyP piece is the front. Glue ${LAYERS} layers, keyholes aligned
2. Loosen the hoop screw, move it to the bottom of the hoop, tighten
3. Slide the screw into the wide hole, then down into the slot

The diorama / shadow-box stand is a separate file (hoop-stand-lightburn.svg).
`;
}

function main() {
    const one = standBlocks(1);
    const pack = standBlocks(2);
    one.svg = lightburnSvg(one, '1 stand / 6 layers');
    pack.svg = lightburnSvg(pack, '2 stands / 12 layers');

    if (pack.sheetW > LASER.bed || pack.sheetH > LASER.bed) {
        console.warn('4PACK OVER BED', pack.sheetW, pack.sheetH);
    }

    const assembled = assembledSvg();
    const html = previewHtml(one, pack);

    const publicDir = '/Users/cyndyp/Desktop/Projects/Embroidery/public/logos';
    const downloads = '/Users/cyndyp/Downloads';
    fs.mkdirSync(publicDir, { recursive: true });

    const stale = [
        'hoop-display-base-3pack.svg',
        'circle-hoop-stand-3in.svg',
        'circle-hoop-stand-4in.svg',
        'circle-hoop-stand-6in.svg',
        'circle-hoop-stand-8in.svg',
        'square-hoop-stand-3in.svg',
        'square-hoop-stand-4in.svg',
        'square-hoop-stand-6in.svg',
        'square-hoop-stand-8in.svg',
        'circle-hoop-stand-3in-x4.svg',
        'circle-hoop-stand-4in-x2.svg',
        'circle-hoop-stand-4in-x2-3in.svg'
    ];
    stale.forEach((name) => {
        [path.join(publicDir, name), path.join(downloads, `CyndyP-${name}`)].forEach((p) => {
            if (fs.existsSync(p)) fs.unlinkSync(p);
        });
    });

    const writes = [
        [path.join(publicDir, 'hoop-display-base.svg'), one.svg],
        [path.join(downloads, 'CyndyP-hoop-display-base.svg'), one.svg],
        [path.join(publicDir, 'hoop-display-base-2pack.svg'), pack.svg],
        [path.join(downloads, 'CyndyP-hoop-display-base-2pack.svg'), pack.svg],
        [path.join(publicDir, 'circle-hoop-stand-assembled.svg'), assembled],
        [path.join(downloads, 'CyndyP-circle-hoop-stand-assembled.svg'), assembled],
        [path.join(publicDir, 'circle-hoop-stand-preview.html'), html],
        [path.join(downloads, 'CyndyP-circle-hoop-stand-README.txt'), readmeText(one, pack)]
    ];
    writes.forEach(([dest, body]) => fs.writeFileSync(dest, body));
    console.log('one stand', one.sheetW + 'x' + one.sheetH, 'mm', one.pieces.length, 'layers');
    console.log('2 pack', pack.sheetW + 'x' + pack.sheetH, 'mm', pack.pieces.length, 'layers');
    console.log('wrote', writes.length, 'files');
}

main();

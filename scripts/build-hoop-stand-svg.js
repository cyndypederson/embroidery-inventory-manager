#!/usr/bin/env node
/**
 * LightBurn diorama / shadow-box hoop stand — Cyndy P Stitch Craft
 * Blue  #0000FF = CUT (Line)
 * Red   #FF0000 = ENGRAVE (Fill)
 * Green #00FF00 = MAGNET POCKET (Fill, ~2 mm, do not through-cut)
 * Units: mm. Parts are spread out — nothing stacked.
 */

const fs = require('fs');
const QRCode = require('qrcode');

const QR_URL = 'https://www.facebook.com/cyndypstitchcraft';
const CUT = '#0000FF';
const ENG = '#FF0000';
const POCKET = '#00FF00';

const IN = 25.4;
const STOCK = 3.2;
const KERF = 0.18;
const SLOT_32 = +(STOCK - KERF).toFixed(2); // 3.02 — finished ~3.2 after kerf
const TAB_32 = +(STOCK + KERF).toFixed(2);  // 3.38
const MAGNET_MM = 8;
const POCKET_D = 8.2; // 0.2 mm oversize
const POCKET_R = POCKET_D / 2;
const OPENING_CLEAR = 0.8;
const RING_FLANGE = 18;
const BOX_DEPTH = 32; // wall strip height = diorama depth
const MAG_RING = [45, 135, 225, 315];
const MAG_STACK = [50, 130, 230, 310];

function circlePath(cx, cy, r) {
    return `M ${(cx + r).toFixed(3)} ${cy.toFixed(3)} A ${r} ${r} 0 1 1 ${(cx - r).toFixed(3)} ${cy.toFixed(3)} A ${r} ${r} 0 1 1 ${(cx + r).toFixed(3)} ${cy.toFixed(3)} Z`;
}

function magnetCenters(cx, cy, radius, angles) {
    return angles.map((deg) => {
        const a = (deg * Math.PI) / 180;
        return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
    });
}

function pocketCircles(centers) {
    return centers.map(([x, y]) => `<path d="${circlePath(x, y, POCKET_R)}"/>`).join('\n      ');
}

function rectPath(x, y, w, h) {
    return `M ${x.toFixed(2)} ${y.toFixed(2)} H ${(x + w).toFixed(2)} V ${(y + h).toFixed(2)} H ${x.toFixed(2)} Z`;
}

function archFrame(x, y, w, h, rx, ry, shoulder) {
    return [
        `M ${x} ${y + h}`,
        `L ${x} ${y + shoulder}`,
        `A ${rx} ${ry} 0 0 1 ${x + w} ${y + shoulder}`,
        `L ${x + w} ${y + h}`,
        'Z'
    ].join(' ');
}

function screwSlot(cx, cy, holeR, width = 9, depth = 7) {
    const x0 = cx - width / 2;
    const y0 = cy - holeR - depth;
    return `M ${x0.toFixed(2)} ${(cy - holeR).toFixed(2)} L ${x0.toFixed(2)} ${y0.toFixed(2)} L ${(x0 + width).toFixed(2)} ${y0.toFixed(2)} L ${(x0 + width).toFixed(2)} ${(cy - holeR).toFixed(2)}`;
}

function leaf(x, y, length, angleDeg, girth) {
    const a = (angleDeg * Math.PI) / 180;
    const g = girth == null ? length * 0.34 : girth;
    const tx = x + length * Math.cos(a);
    const ty = y + length * Math.sin(a);
    const px = -Math.sin(a) * g;
    const py = Math.cos(a) * g;
    const mx = x + 0.48 * length * Math.cos(a);
    const my = y + 0.48 * length * Math.sin(a);
    return `<path d="M ${x.toFixed(2)} ${y.toFixed(2)} Q ${(mx + px).toFixed(2)} ${(my + py).toFixed(2)} ${tx.toFixed(2)} ${ty.toFixed(2)} Q ${(mx - px).toFixed(2)} ${(my - py).toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} Z"/>`;
}

function stem(d) {
    return `<path d="${d}" fill="none" stroke="${ENG}" stroke-width="0.55" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function vineBranch(sx, sy, ex, ey, leaves, flip) {
    const parts = [stem(`M ${sx.toFixed(2)} ${sy.toFixed(2)} C ${((sx + ex) / 2).toFixed(2)} ${sy.toFixed(2)}, ${((sx + ex) / 2).toFixed(2)} ${ey.toFixed(2)}, ${ex.toFixed(2)} ${ey.toFixed(2)}`)];
    const dx = ex - sx;
    const dy = ey - sy;
    const nlen = Math.hypot(-dy, dx) || 1;
    leaves.forEach(([t, length, side, extraAngle]) => {
        const px = sx + dx * t;
        const py = sy + dy * t;
        const baseAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const s = (flip ? -1 : 1) * side;
        parts.push(leaf(px + (-dy / nlen) * s * 0.4, py + (dx / nlen) * s * 0.4, length, baseAngle + s * (58 + (extraAngle || 0))));
    });
    return parts.join('\n      ');
}

function crescent(cx, cy, r, cut) {
    const ox = cx + cut;
    return `<path fill-rule="evenodd" d="M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z M ${ox - r + 1.6} ${cy} A ${r - 1.6} ${r - 1.6} 0 1 0 ${ox + r - 1.6} ${cy} A ${r - 1.6} ${r - 1.6} 0 1 0 ${ox - r + 1.6} ${cy} Z"/>`;
}

function star(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
        const ang = (-90 + i * 36) * Math.PI / 180;
        const rad = i % 2 === 0 ? r : r * 0.4;
        pts.push(`${(cx + rad * Math.cos(ang)).toFixed(2)},${(cy + rad * Math.sin(ang)).toFixed(2)}`);
    }
    return `<polygon points="${pts.join(' ')}"/>`;
}

function qrRects(x, y, sizeMm, modules) {
    const n = modules.size;
    const cell = sizeMm / n;
    const rects = [];
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (modules.get(c, r)) {
                rects.push(`<rect x="${(x + c * cell).toFixed(3)}" y="${(y + r * cell).toFixed(3)}" width="${cell.toFixed(3)}" height="${cell.toFixed(3)}"/>`);
            }
        }
    }
    return rects.join('\n      ');
}

function hoopOpening(inches) {
    return inches * IN + OPENING_CLEAR;
}

/** Plant silhouette as a closed cut shape attached conceptually to a layer. */
function plantSilhouette(x, y, h, flip) {
    const s = flip ? -1 : 1;
    const x1 = x + s * 4;
    const x2 = x + s * 14;
    const x3 = x + s * 22;
    return [
        `<path d="M ${x.toFixed(1)} ${(y + h).toFixed(1)} L ${x.toFixed(1)} ${y.toFixed(1)} L ${(x + s * 3).toFixed(1)} ${y.toFixed(1)} L ${(x + s * 3).toFixed(1)} ${(y + h).toFixed(1)} Z"/>`,
        leaf(x1, y + h * 0.18, 16, flip ? 200 : -20, 5),
        leaf(x2, y + h * 0.38, 14, flip ? 210 : -30, 4.5),
        leaf(x1, y + h * 0.55, 15, flip ? 195 : -15, 5),
        leaf(x3, y + h * 0.72, 13, flip ? 215 : -35, 4)
    ].join('\n      ');
}

function wallStrip(x, y, length, depth, label) {
    const tab = 10;
    const tabW = TAB_32;
    const body = rectPath(x, y, length, depth);
    const tabL = rectPath(x - tab, y + (depth - tabW) / 2, tab, tabW);
    const tabR = rectPath(x + length, y + (depth - tabW) / 2, tab, tabW);
    return { body, tabL, tabR, labelX: x + length / 2, labelY: y + depth / 2 + 2, label };
}

function slotOnPanel(cx, cy, alongX) {
    const w = SLOT_32;
    const len = 10;
    if (alongX) return rectPath(cx - len / 2, cy - w / 2, len, w);
    return rectPath(cx - w / 2, cy - len / 2, w, len);
}

function main() {
    const qr = QRCode.create(QR_URL, { errorCorrectionLevel: 'M' });

    const opening8 = hoopOpening(8);
    const hoopR = opening8 / 2;
    const ringOd = opening8 + RING_FLANGE * 2;
    const ringOR = ringOd / 2;
    const magRingR = hoopR + RING_FLANGE / 2;
    const magStackR = hoopR + 28;

    // ---- Front frame ----
    const fx = 16;
    const fy = 16;
    const fw = 300;
    const fh = 300;
    const cx = fx + fw / 2;
    const cy = fy + 44 + hoopR;
    const shoulder = 54;
    const frontOuter = archFrame(fx, fy, fw, fh, fw / 2, 54, shoulder);
    const frontHole = circlePath(cx, cy, hoopR);
    const frontSlot = screwSlot(cx, cy, hoopR);
    const frontRingMags = magnetCenters(cx, cy, magRingR, MAG_RING);
    const frontStackMags = magnetCenters(cx, cy, magStackR, MAG_STACK);
    const frontNameMags = [
        [fx + fw * 0.28, fy + fh - 8],
        [fx + fw * 0.72, fy + fh - 8]
    ];
    const frontShelfMags = [
        [cx - 16, cy - hoopR - 14],
        [cx + 16, cy - hoopR - 14]
    ];

    const vines = [
        vineBranch(cx - 30, fy + 18, fx + 16, cy - 24, [
            [0.08, 12, 1, 10], [0.22, 11, -1, 6], [0.36, 13, 1, 8],
            [0.50, 12, -1, 2], [0.64, 13, 1, 10], [0.78, 11, -1, 4], [0.90, 10, 1, 8]
        ], false),
        vineBranch(cx + 30, fy + 18, fx + fw - 16, cy - 24, [
            [0.08, 12, 1, 10], [0.22, 11, -1, 6], [0.36, 13, 1, 8],
            [0.50, 12, -1, 2], [0.64, 13, 1, 10], [0.78, 11, -1, 4], [0.90, 10, 1, 8]
        ], true),
        vineBranch(fx + 14, cy + 8, fx + 20, fy + fh - 16, [
            [0.15, 11, 1, 12], [0.38, 12, -1, 6], [0.60, 11, 1, 4], [0.82, 10, -1, 8]
        ], false),
        vineBranch(fx + fw - 14, cy + 6, fx + fw - 12, fy + fh - 16, [
            [0.12, 12, 1, 16], [0.30, 13, -1, 8], [0.48, 12, 1, 4],
            [0.66, 14, -1, 10], [0.84, 12, 1, 2]
        ], true)
    ];

    // ---- Inner diorama (same hole, plants cut, stars engraved) ----
    const ix = fx + fw + 24;
    const iy = fy;
    const iw = fw;
    const ih = fh;
    const icx = ix + iw / 2;
    const icy = iy + 44 + hoopR;
    const innerOuter = archFrame(ix, iy, iw, ih, iw / 2, 54, shoulder);
    const innerHole = circlePath(icx, icy, hoopR);
    const innerSlot = screwSlot(icx, icy, hoopR);
    const innerStackMags = magnetCenters(icx, icy, magStackR, MAG_STACK);
    const plants = [
        plantSilhouette(ix + 22, icy - 70, 130, false),
        plantSilhouette(ix + iw - 22, icy - 70, 130, true),
        plantSilhouette(ix + 40, icy + 20, 90, false),
        plantSilhouette(ix + iw - 40, icy + 10, 100, true)
    ];
    const stars = [
        star(icx - 40, iy + 36, 2.4),
        star(icx + 36, iy + 42, 1.8),
        star(icx - 18, iy + 28, 1.5),
        star(icx + 12, iy + 34, 2.1),
        star(icx + 48, iy + 58, 1.6),
        star(icx - 52, iy + 62, 1.4)
    ];

    // ---- Spacer frames (2) — create box depth, large inner void ----
    const spacerHoleR = hoopR + 6;
    const spacers = [0, 1].map((n) => {
        const sx = fx + (fw + 24) * (n + 2);
        const sy = fy;
        const scx = sx + fw / 2;
        const scy = sy + 44 + hoopR;
        return {
            n: n + 1,
            outer: archFrame(sx, sy, fw, ih, fw / 2, 54, shoulder),
            hole: circlePath(scx, scy, spacerHoleR),
            mags: magnetCenters(scx, scy, magStackR, MAG_STACK),
            labelX: scx,
            labelY: sy + ih - 14,
            // wall-tab slots: left, right, bottom (and top chord)
            slots: [
                slotOnPanel(sx + 10, scy, false),
                slotOnPanel(sx + fw - 10, scy, false),
                slotOnPanel(scx, sy + ih - 10, true),
                slotOnPanel(scx, sy + shoulder + 8, true)
            ]
        };
    });

    // ---- Back panel (solid backdrop) ----
    const bx = fx;
    const by = fy + fh + 24;
    const backOuter = archFrame(bx, by, fw, fh, fw / 2, 54, shoulder);
    const bcx = bx + fw / 2;
    const bcy = by + 44 + hoopR;
    const backStackMags = magnetCenters(bcx, bcy, magStackR, MAG_STACK);
    const backSlots = [
        slotOnPanel(bx + 10, bcy, false),
        slotOnPanel(bx + fw - 10, bcy, false),
        slotOnPanel(bcx, by + fh - 10, true),
        slotOnPanel(bcx, by + shoulder + 8, true)
    ];

    // ---- Wall strips (diorama depth) ----
    const wallY = by;
    const wallX0 = bx + fw + 24;
    const innerW = fw - 20;
    const innerH = fh - shoulder - 16;
    const walls = [
        wallStrip(wallX0, wallY, innerH, BOX_DEPTH, 'LEFT WALL'),
        wallStrip(wallX0, wallY + BOX_DEPTH + 16, innerH, BOX_DEPTH, 'RIGHT WALL'),
        wallStrip(wallX0 + innerH + 36, wallY, innerW, BOX_DEPTH, 'BOTTOM WALL'),
        wallStrip(wallX0 + innerH + 36, wallY + BOX_DEPTH + 16, innerW, BOX_DEPTH, 'TOP WALL')
    ];

    // ---- Nameplate ----
    const nx = bx;
    const ny = by + fh + 24;
    const nw = 320;
    const nh = 50;
    const nameplateCut = `M ${nx} ${ny + 16} Q ${nx + nw / 2} ${ny - 2} ${nx + nw} ${ny + 16} L ${nx + nw} ${ny + nh} L ${nx} ${ny + nh} Z`;
    const nameTopMags = [
        [fx + fw * 0.28, ny + 10],
        [fx + fw * 0.72, ny + 10]
    ];
    const nameBotMags = [
        [nx + nw * 0.32, ny + nh - 8],
        [nx + nw * 0.68, ny + nh - 8]
    ];

    // ---- Base ----
    const basex = nx;
    const basey = ny + nh + 20;
    const basew = 360;
    const baseh = 36;
    const baseCut = rectPath(basex, basey, basew, baseh);
    const baseMags = [
        [nx + nw * 0.32, basey + 8],
        [nx + nw * 0.68, basey + 8]
    ];

    // ---- Hidden hoop-screw shelf ----
    const hx = basex + basew + 20;
    const hy = basey;
    const hw = 56;
    const hh = 24;
    const shelfCut = rectPath(hx, hy, hw, hh);
    const shelfSlot = rectPath(hx + hw / 2 - 6, hy, 12, 9);
    const shelfMags = [
        [hx + 12, hy + hh / 2],
        [hx + hw - 12, hy + hh / 2]
    ];

    // ---- QR signpost ----
    const qx = hx;
    const qy = hy + hh + 18;
    const qs = 40;
    const plaqueCut = rectPath(qx, qy, qs, qs);
    const post = rectPath(qx + qs / 2 - 5, qy + qs, 10, 16);
    const qrArt = qrRects(qx + 3.4, qy + 3.4, qs - 6.8, qr.modules);

    // ---- Adapter rings 7–3 ----
    const ringInches = [7, 6, 5, 4, 3];
    const ringGap = 18;
    const ringStartX = ix;
    const ringStartY = iy + ih + 24;
    const colW = ringOd + ringGap;
    const rowH = ringOd + ringGap + 6;
    const rings = ringInches.map((inches, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const ox = ringStartX + col * colW;
        const oy = ringStartY + row * rowH;
        const rcx = ox + ringOR;
        const rcy = oy + ringOR;
        const innerR = hoopOpening(inches) / 2;
        return {
            inches,
            outer: circlePath(rcx, rcy, ringOR),
            inner: circlePath(rcx, rcy, innerR),
            slot: screwSlot(rcx, rcy, innerR),
            mags: magnetCenters(rcx, rcy, magRingR, MAG_RING),
            labelX: rcx,
            labelY: rcy + (innerR + ringOR) / 2 + 2
        };
    });

    const sheetW = Math.ceil(Math.max(
        spacers[1] ? fx + (fw + 24) * 4 + 8 : 0,
        ringStartX + 2 * colW + 8,
        wallX0 + innerH + 36 + innerW + 20
    ));
    const sheetH = Math.ceil(Math.max(
        qy + qs + 20,
        ringStartY + 3 * rowH + 8
    ));

    const spacerCuts = spacers.map((s) =>
        `    <!-- Spacer frame ${s.n} -->\n    <path d="${s.outer}"/>\n    <path d="${s.hole}"/>\n${s.slots.map((p) => `    <path d="${p}"/>`).join('\n')}`
    ).join('\n');

    const wallCuts = walls.map((w) =>
        `    <!-- ${w.label} -->\n    <path d="${w.body}"/>\n    <path d="${w.tabL}"/>\n    <path d="${w.tabR}"/>`
    ).join('\n');

    const ringCuts = rings.map((r) =>
        `    <!-- ${r.inches} in adapter -->\n    <path d="${r.outer}"/>\n    <path d="${r.inner}"/>\n    <path d="${r.slot}"/>`
    ).join('\n');

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}mm" height="${sheetH}mm" viewBox="0 0 ${sheetW} ${sheetH}">
  <!-- Cyndy P Stitch Craft DIORAMA hoop stand for LightBurn.
       Blue #0000FF = CUT. Red #FF0000 = ENGRAVE. Green #00FF00 = MAGNET POCKET.
       8 mm discs, 8.2 mm pockets. Stock 3.2 mm. Kerf ${KERF} mm.
       Pocket ~2 mm from the BACK — do not through-cut.
       Parts are spread out; nothing is stacked. -->

  <g id="cut" fill="none" stroke="${CUT}" stroke-width="0.15">
    <!-- 1 Front arched frame, 8 in opening -->
    <path d="${frontOuter}"/>
    <path d="${frontHole}"/>
    <path d="${frontSlot}"/>
    <!-- 2 Inner diorama layer -->
    <path d="${innerOuter}"/>
    <path d="${innerHole}"/>
    <path d="${innerSlot}"/>
    ${plants.join('\n    ')}
    <!-- 3–4 Spacer frames (box depth) -->
${spacerCuts}
    <!-- 5 Back panel -->
    <path d="${backOuter}"/>
    ${backSlots.map((p) => `<path d="${p}"/>`).join('\n    ')}
    <!-- 6–9 Box walls -->
${wallCuts}
    <!-- Nameplate, base, shelf, QR post -->
    <path d="${nameplateCut}"/>
    <path d="${baseCut}"/>
    <path d="${shelfCut}"/>
    <path d="${shelfSlot}"/>
    <path d="${plaqueCut}"/>
    <path d="${post}"/>
${ringCuts}
  </g>

  <g id="magnet-pocket" fill="${POCKET}" stroke="none">
      <!-- Front: rings + stack + nameplate + shelf -->
      ${pocketCircles(frontRingMags)}
      ${pocketCircles(frontStackMags)}
      ${pocketCircles(frontNameMags)}
      ${pocketCircles(frontShelfMags)}
      <!-- Inner diorama stack -->
      ${pocketCircles(innerStackMags)}
      <!-- Spacers -->
      ${spacers.map((s) => pocketCircles(s.mags)).join('\n      ')}
      <!-- Back stack -->
      ${pocketCircles(backStackMags)}
      <!-- Nameplate + base -->
      ${pocketCircles(nameTopMags)}
      ${pocketCircles(nameBotMags)}
      ${pocketCircles(baseMags)}
      ${pocketCircles(shelfMags)}
      <!-- Adapter rings -->
      ${rings.map((r) => pocketCircles(r.mags)).join('\n      ')}
  </g>

  <g id="engrave-fill" fill="${ENG}" stroke="none">
    ${crescent(cx, fy + 24, 8.2, 3.2)}
    ${vines.join('\n    ')}
    ${stars.join('\n    ')}
    ${qrArt}
  </g>

  <g id="engrave-line" fill="none" stroke="${ENG}" stroke-width="0.45" stroke-linecap="round">
    <line x1="${nx + 72}" y1="${ny + 28}" x2="${nx + nw - 72}" y2="${ny + 28}"/>
    <line x1="${nx + 72}" y1="${ny + 41.5}" x2="${nx + nw - 72}" y2="${ny + 41.5}"/>
  </g>

  <g id="engrave-text" fill="${ENG}" stroke="none" font-family="Georgia, Times New Roman, serif">
    <text x="${nx + nw / 2}" y="${ny + 22}" text-anchor="middle" font-family="Snell Roundhand, Apple Chancery, cursive" font-size="14">CyndyP</text>
    <text x="${nx + nw / 2}" y="${ny + 38.5}" text-anchor="middle" font-size="7.4" letter-spacing="2.6">STITCH CRAFT</text>
    <text x="${cx}" y="${cy + hoopR + 12}" text-anchor="middle" font-size="6" letter-spacing="1">8 IN OPENING</text>
    <text x="${icx}" y="${iy + ih - 12}" text-anchor="middle" font-size="5.5" letter-spacing="0.8">INNER DIORAMA</text>
    ${spacers.map((s) => `<text x="${s.labelX}" y="${s.labelY}" text-anchor="middle" font-size="5.5" letter-spacing="0.8">SPACER ${s.n}</text>`).join('\n    ')}
    <text x="${bcx}" y="${by + fh - 12}" text-anchor="middle" font-size="5.5" letter-spacing="0.8">BACK PANEL</text>
    ${walls.map((w) => `<text x="${w.labelX}" y="${w.labelY}" text-anchor="middle" font-size="4.5" letter-spacing="0.6">${w.label}</text>`).join('\n    ')}
    ${rings.map((r) => `<text x="${r.labelX.toFixed(1)}" y="${r.labelY.toFixed(1)}" text-anchor="middle" font-size="7" letter-spacing="1.2">${r.inches} IN RING</text>`).join('\n    ')}
    <text x="${hx + hw / 2}" y="${hy + hh + 10}" text-anchor="middle" font-size="4.2">HOOP SHELF</text>
  </g>
</svg>
`;

    const dests = [
        '/Users/cyndyp/Downloads/CyndyP-hoop-stand-lightburn.svg',
        '/Users/cyndyp/Desktop/Projects/Embroidery/public/logos/hoop-stand-lightburn.svg'
    ];
    dests.forEach((dest) => {
        fs.mkdirSync(require('path').dirname(dest), { recursive: true });
        fs.writeFileSync(dest, svg);
    });

    const readme = `Cyndy P Stitch Craft — DIORAMA / shadow-box hoop stand (LightBurn)

Files
- /Users/cyndyp/Downloads/CyndyP-hoop-stand-lightburn.svg
- /Users/cyndyp/Downloads/CyndyP-hoop-stand-README.txt

This is a layered box, not a flat plaque. The hoop sits in a recessed opening
in front of an inner scene (plants + stars) and a solid back.

Material
- Designed for 1/8 in ≈ 3.2 mm plywood
- Also usable with 3 mm or 4 mm stock — see slots below
- Kerf assumed 0.18 mm (typical diode/CO2 is ~0.15–0.20 mm)

Slots / tabs (kerf ${KERF} mm)
- File is cut for 3.2 mm stock:
  slot cut width ${SLOT_32} mm  → finishes ~3.2 mm after kerf
  tab  cut width ${TAB_32} mm  → finishes ~3.2 mm after kerf
- If you use 3.0 mm plywood: scale only the GREEN-free blue slots/tabs,
  or recut slots at 3.0 − 0.18 = 2.82 mm and tabs at 3.0 + 0.18 = 3.18 mm
- If you use 4.0 mm plywood: slots 4.0 − 0.18 = 3.82 mm, tabs 4.0 + 0.18 = 4.18 mm

Magnet spec
- Disc: 8 mm diameter × ~2 mm thick
- Pocket: 8.2 mm circle (0.2 mm oversize), closed path
- Pocket from the BACK of each part
- LightBurn GREEN layer = Fill, depth ~2.0–2.1 mm in 3.2 mm stock
  (leave ~1 mm of wood). NEVER set green to Line / through-cut
  or the magnet falls out.
- Flip the part face-down for the pocket pass, or pocket first then flip
- Match polarity so layers attract

LightBurn layers
- Blue  #0000FF  CUT      → Line. Through-cut outlines, holes, wall tabs, plant silhouettes
- Red   #FF0000  ENGRAVE  → Fill for moon, vines, QR, stars. Convert text to paths if needed
- Green #00FF00  POCKET   → Fill only. Magnet recesses

How to stack the diorama (front → back)
1. Adapter ring (only if hoop is 3–7 in) clicks onto the FRONT of the frame
2. Front arched frame (engraved moon + vines, 8 in opening, screw notch)
3. Hidden hoop shelf magnets behind the top notch (hoop can sit flipped)
4. Box walls (left / right / top / bottom) — 32 mm deep. Tabs slot into
   the spacer frames and the back panel. Glue the front edge of the walls
   to the back of the front frame (no slots on the pretty face)
5. Spacer 1 (clicks to front with 4 stack magnets)
6. Inner diorama layer (plant silhouettes are CUT; tiny stars ENGRAVE)
7. Spacer 2
8. Back panel (solid backdrop)
9. Curved nameplate on the front bottom; flat base under that

The walls + two spacers are what make the shadow box. Without them it is
just stacked flats. Target depth ≈ 32 mm walls + 3.2 mm × 2 spacers.

3–8 in hoop system
Hoop size = inner diameter. The hoop itself is bought, not cut.
- 8 in: no ring. Seat the hoop in the 204.0 mm frame opening (8 in + 0.8 mm)
- 7 / 6 / 5 / 4 / 3 in: use the matching labeled ring. Every ring has the
  same outer size and sits on the 8 in opening. Four magnets line up
  (NE/SE/SW/NW — not at the screw notch). One ring at a time; do not nest.

Pieces on the sheet (spread, not stacked)
- Front arched frame
- Inner diorama layer (plants + stars)
- Spacer 1 and Spacer 2
- Back panel
- Left, right, top, bottom walls (32 mm depth)
- Hidden hoop-screw shelf
- QR signpost (https://www.facebook.com/cyndypstitchcraft)
- Curved nameplate (CyndyP / STITCH CRAFT)
- Flat base
- Adapter rings: 7, 6, 5, 4, 3 in

Magnet pairs
- Front ↔ each adapter ring (4)
- Front ↔ spacer 1 ↔ inner ↔ spacer 2 ↔ back (4 stack magnets, same pattern)
- Front bottom ↔ nameplate top (2)
- Nameplate bottom ↔ base (2)
- Front (above opening) ↔ hidden shelf (2)

Assembly order
1. Pocket magnets from the back; epoxy flush
2. Cut / engrave fronts
3. Slot walls into spacers + back; glue wall fronts to the front frame
4. Click the inner scene between the two spacers
5. Magnet nameplate and base
6. Magnet or glue the QR post at the lower-right of the opening
7. Drop in an 8 in hoop, or click on a ring for a smaller hoop
`;

    fs.writeFileSync('/Users/cyndyp/Downloads/CyndyP-hoop-stand-README.txt', readme);
    console.log('wrote', dests[0]);
    console.log('sheet', sheetW, 'x', sheetH, 'mm');
    console.log('opening8', opening8.toFixed(2), 'depth', BOX_DEPTH, 'kerf', KERF, 'slot', SLOT_32, 'tab', TAB_32);
}

main();

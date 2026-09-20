'use strict';

const { VENDOR_ID, getDefaultShopCommissionPercent } = require('./config');

const SKIP_LINE = /total\s+sales|commission|vendor\s+fee|total\s+check|venmo|warm\s+regards|hello\s+cyndy|junk\s+&\s+makers|owner,?\s+flippin|payments\s+can\s+be|remaining\s+balance|please\s+note|thank\s+you|if\s+you\s+have\s+any/i;
const MONTH_NAMES = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
};

function parseMoney(value) {
    if (value == null) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const negative = /^\(.*\)$/.test(raw) || /[()]/.test(raw);
    const n = parseFloat(raw.replace(/[$,()\s]/g, ''));
    if (!Number.isFinite(n)) return null;
    return negative ? -Math.abs(n) : n;
}

function decodeEntities(html) {
    return String(html || '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>');
}

function stripTags(html) {
    return decodeEntities(String(html || '').replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
}

function classifyKind(subject = '') {
    const s = String(subject).toLowerCase();
    if (s.includes('monthly')) return 'monthly';
    if (/\bsales\b/.test(s) || /\d{1,2}\s*[-–]\s*\d{1,2}/.test(s)) return 'weekly';
    return 'unknown';
}

function lastDayOfMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function isoDate(year, month, day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function yearFromEmailDate(emailDate) {
    const d = emailDate ? new Date(emailDate) : new Date();
    return Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
}

function parseSaleDateFromSubject(subject, emailDate) {
    const text = String(subject || '');
    const yearHint = yearFromEmailDate(emailDate);

    const monthly = text.match(/monthly[^]*?\b([A-Za-z]+)\s+(\d{4})\b/i);
    if (monthly) {
        const month = MONTH_NAMES[monthly[1].toLowerCase()];
        const year = Number(monthly[2]);
        if (month && year) return isoDate(year, month, lastDayOfMonth(year, month));
    }

    const range = text.match(/\b([A-Za-z]+)\s+(\d{1,2})\s*[-–]\s*(\d{1,2})(?:\s*,?\s*(\d{4}))?/i);
    if (range) {
        const month = MONTH_NAMES[range[1].toLowerCase()];
        const endDay = Number(range[3]);
        const year = range[4] ? Number(range[4]) : yearHint;
        if (month && endDay) return isoDate(year, month, endDay);
    }

    const d = emailDate ? new Date(emailDate) : null;
    if (d && !Number.isNaN(d.getTime())) {
        return isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }
    return null;
}

function parseCommissionPercent(text) {
    const match = String(text || '').match(/commission[^\d%]{0,40}(\d+(?:\.\d+)?)\s*%/i);
    if (!match) return null;
    const n = parseFloat(match[1]);
    return Number.isFinite(n) ? n : null;
}

function parseVendorFee(text) {
    const match = String(text || '').match(/vendor\s+fee[^\d$]{0,20}\$?\s*([\d.]+)/i);
    return match ? parseMoney(match[1]) : null;
}

function looksLikeVendorId(value) {
    return String(value || '').trim() === VENDOR_ID;
}

function looksLikeCode(value) {
    return /^[A-Z]{1,3}$/.test(String(value || '').trim());
}

function looksLikeQty(value) {
    const n = Number(String(value || '').trim());
    return Number.isInteger(n) && n > 0 && n < 100;
}

function isFooterOrNoise(text) {
    return !text || SKIP_LINE.test(text) || /^vendor\s*(id|#)?$/i.test(text);
}

function rowFromCells(cells) {
    const cleaned = cells.map(c => stripTags(c)).filter(c => c !== '');
    if (cleaned.length < 4) return null;

    let vendor = null;
    let offset = 0;
    if (looksLikeVendorId(cleaned[0])) {
        vendor = VENDOR_ID;
        offset = 1;
    } else if (cleaned.length >= 5 && looksLikeVendorId(cleaned[cleaned.length - 1])) {
        vendor = VENDOR_ID;
    }

    const rest = cleaned.slice(offset);
    if (rest.length >= 4 && looksLikeCode(rest[0]) && !parseMoney(rest[0])) {
        rest.shift();
    }

    if (rest.length < 4) return null;
    const total = parseMoney(rest[rest.length - 1]);
    const qtyRaw = rest[rest.length - 2];
    const price = parseMoney(rest[rest.length - 3]);
    const description = rest.slice(0, rest.length - 3).join(' ').trim();

    if (!description || isFooterOrNoise(description) || price == null || total == null || !looksLikeQty(qtyRaw)) {
        return null;
    }

    return {
        vendorId: vendor || (looksLikeVendorId(cleaned[0]) ? VENDOR_ID : null),
        description,
        price,
        qty: Number(qtyRaw),
        total
    };
}

function extractHtmlTables(html) {
    const tables = [];
    const tableRe = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch;
    while ((tableMatch = tableRe.exec(html))) {
        const rows = [];
        const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch;
        while ((rowMatch = rowRe.exec(tableMatch[1]))) {
            const cells = [];
            const cellRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
            let cellMatch;
            while ((cellMatch = cellRe.exec(rowMatch[1]))) {
                cells.push(cellMatch[1]);
            }
            if (cells.length) rows.push(cells);
        }
        if (rows.length) tables.push(rows);
    }
    return tables;
}

function parseHtmlTables(html) {
    const lines = [];
    for (const rows of extractHtmlTables(html)) {
        for (const cells of rows) {
            const row = rowFromCells(cells);
            if (row) lines.push(row);
        }
    }
    return lines;
}

function parseLooseText(text, { requireVendor = false } = {}) {
    const lines = [];
    const normalized = decodeEntities(text).replace(/\r/g, '\n');
    const chunks = normalized.split(/\r?\n|(?:\s\/\s)|\|/);

    const vendorLine = /(?:^|\s)73\s+(?:[A-Z]{1,3}\s+)?(.+?)\s+(\d+\.\d{2})\s+(\d{1,2})\s+(\d+\.\d{2})(?:\s|$)/;
    const noVendorLine = /([A-Za-z0-9][A-Za-z0-9 "'/&.,°-]{2,}?)\s+(\d+\.\d{2})\s+(\d{1,2})\s+(\d+\.\d{2})(?:\s|$)/;

    for (const chunk of chunks) {
        const piece = chunk.replace(/\s+/g, ' ').trim();
        if (!piece || isFooterOrNoise(piece)) continue;

        let match = piece.match(vendorLine);
        if (match) {
            lines.push({
                vendorId: VENDOR_ID,
                description: match[1].replace(/^KS\s+/i, '').trim(),
                price: parseMoney(match[2]),
                qty: Number(match[3]),
                total: parseMoney(match[4])
            });
            continue;
        }

        if (requireVendor) continue;
        match = piece.match(noVendorLine);
        if (!match) continue;
        const description = match[1].replace(/^KS\s+/i, '').trim();
        if (isFooterOrNoise(description) || /^(ds|qty|price|total)$/i.test(description)) continue;
        lines.push({
            vendorId: VENDOR_ID,
            description,
            price: parseMoney(match[2]),
            qty: Number(match[3]),
            total: parseMoney(match[4])
        });
    }
    return lines.filter(line => line.description && line.price != null);
}

function parseXlsxBuffer(buffer) {
    if (!buffer) return [];
    let XLSX;
    try {
        XLSX = require('xlsx');
    } catch (_) {
        return [];
    }
    const workbook = XLSX.read(buffer, { type: Buffer.isBuffer(buffer) ? 'buffer' : 'array' });
    const lines = [];
    for (const name of workbook.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: '' });
        for (const row of rows) {
            const parsed = rowFromCells((row || []).map(String));
            if (parsed) lines.push(parsed);
        }
    }
    return lines;
}

function expandQty(lines) {
    const expanded = [];
    for (const line of lines) {
        const qty = Math.max(1, Number(line.qty) || 1);
        for (let i = 0; i < qty; i += 1) {
            expanded.push({ ...line, qty: 1, unitIndex: i + 1, originalQty: qty });
        }
    }
    return expanded;
}

function dedupeLines(lines) {
    const seen = new Set();
    const out = [];
    for (const line of lines) {
        const key = `${line.description}|${line.price}|${line.qty}|${line.unitIndex || 1}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(line);
    }
    return out;
}

async function extractPdfTexts(attachments = []) {
    const texts = [];
    let PDFParse;
    try {
        ({ PDFParse } = require('pdf-parse'));
    } catch (_) {
        return texts;
    }
    for (const att of attachments) {
        const filename = String(att.filename || att.name || '').toLowerCase();
        const isPdf = filename.endsWith('.pdf') || att.contentType === 'application/pdf';
        if (!isPdf || !att.content) continue;
        const parser = new PDFParse({ data: att.content });
        try {
            const parsed = await parser.getText();
            if (parsed && parsed.text) texts.push(parsed.text);
        } catch (_) {
            /* ignore unreadable PDFs */
        } finally {
            try { await parser.destroy(); } catch (__) { /* ignore */ }
        }
    }
    return texts;
}

async function parseKeeraEmail(input = {}) {
    const subject = input.subject || '';
    let html = input.html || '';
    let text = input.text || stripTags(html);
    const emailDate = input.date || input.emailDate || null;
    const attachments = input.attachments || [];
    const pdfTexts = await extractPdfTexts(attachments);
    if (pdfTexts.length) {
        text = `${text}\n${pdfTexts.join('\n')}`;
        if (!/<table/i.test(html)) {
            html = `${html}\n<pre>${pdfTexts.join('\n')}</pre>`;
        }
    }

    const kind = classifyKind(subject);
    const dateSold = parseSaleDateFromSubject(subject, emailDate);
    const haystack = `${subject}\n${text}\n${stripTags(html)}`;
    let commissionPercent = parseCommissionPercent(haystack);
    const vendorFee = parseVendorFee(haystack);

    if (commissionPercent == null && dateSold) {
        const [year, month] = dateSold.split('-').map(Number);
        commissionPercent = getDefaultShopCommissionPercent(year, month);
    }

    let items = parseHtmlTables(html);
    if (!items.length) {
        items = parseLooseText(`${text}\n${stripTags(html)}`, { requireVendor: false });
    }

    if (!items.length && attachments.length) {
        for (const att of attachments) {
            const filename = String(att.filename || att.name || '').toLowerCase();
            const isXlsx = filename.endsWith('.xlsx') || filename.endsWith('.xls')
                || att.contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            if (!isXlsx) continue;
            items = parseXlsxBuffer(att.content || att.buffer);
            if (items.length) break;
        }
    }

    items = items
        .map(item => ({
            ...item,
            vendorId: item.vendorId || VENDOR_ID,
            description: String(item.description || '').replace(/^KS\s+/i, '').trim()
        }))
        .filter(item => String(item.vendorId) === VENDOR_ID && item.price != null && item.description);

    items = expandQty(dedupeLines(items));

    return {
        kind,
        subject,
        dateSold,
        commissionPercent,
        vendorFee,
        vendorId: VENDOR_ID,
        itemCount: items.length,
        items
    };
}

module.exports = {
    parseKeeraEmail,
    extractPdfTexts,
    parseMoney,
    classifyKind,
    parseSaleDateFromSubject,
    parseCommissionPercent,
    parseHtmlTables,
    parseLooseText,
    parseXlsxBuffer,
    stripTags
};

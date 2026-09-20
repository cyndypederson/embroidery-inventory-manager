'use strict';

const { parseKeeraEmail } = require('./parser');
const { matchParsedEmail } = require('./matcher');
const { buildSaleFromItem } = require('./sale-builder');

async function compareMessages(messages, inventory, sales) {
    const emails = [];
    const rows = [];

    for (const message of messages) {
        const parsed = await parseKeeraEmail(message);
        const matched = matchParsedEmail(parsed, inventory, sales);
        emails.push({
            subject: message.subject,
            date: message.date,
            messageId: message.messageId,
            kind: parsed.kind,
            dateSold: parsed.dateSold,
            commissionPercent: parsed.commissionPercent,
            vendorFee: parsed.vendorFee,
            itemCount: parsed.itemCount
        });

        for (const entry of matched) {
            const wouldSell = entry.match.outcome === 'unique_match'
                ? buildSaleFromItem({
                    ...entry.match.item,
                    price: entry.match.item.price,
                    customer: entry.match.item.customer,
                    description: entry.match.item.description,
                    name: entry.match.item.name
                }, {
                    dateSold: parsed.dateSold,
                    commissionPercent: parsed.commissionPercent,
                    messageId: message.messageId,
                    kind: parsed.kind
                })
                : null;

            rows.push({
                subject: message.subject,
                kind: parsed.kind,
                emailDateSold: parsed.dateSold,
                description: entry.line.description,
                price: entry.line.price,
                qty: entry.line.originalQty || entry.line.qty,
                outcome: entry.match.outcome,
                reason: entry.match.reason,
                websiteItem: entry.match.item
                    ? `${entry.match.item.description || entry.match.item.name} ($${Number(entry.match.item.price).toFixed(2)}, ${entry.match.item.status})`
                    : (entry.match.candidates[0]
                        ? `${entry.match.candidates[0].description || entry.match.candidates[0].name} ($${Number(entry.match.candidates[0].price || 0).toFixed(2)}, ${entry.match.candidates[0].status})`
                        : ''),
                existingSale: entry.match.existingSale
                    ? `${entry.match.existingSale.itemName} ${entry.match.existingSale.dateSold}`
                    : '',
                wouldMarkSold: entry.match.outcome === 'unique_match',
                wouldSale: wouldSell ? {
                    itemName: wouldSell.itemName,
                    dateSold: wouldSell.dateSold,
                    commission: wouldSell.commission,
                    netAmount: wouldSell.netAmount
                } : null,
                candidates: entry.match.candidates
            });
        }
    }

    const summary = {
        emails: emails.length,
        lines: rows.length,
        unique_match: rows.filter(row => row.outcome === 'unique_match').length,
        already_sold: rows.filter(row => row.outcome === 'already_sold').length,
        ambiguous: rows.filter(row => row.outcome === 'ambiguous').length,
        skipped_gift: rows.filter(row => row.outcome === 'skipped_gift').length,
        no_match: rows.filter(row => row.outcome === 'no_match').length
    };

    return { emails, rows, summary };
}

function formatComparisonTable(comparison) {
    const lines = [];
    lines.push('Keera email vs website (dry-run — nothing sold)');
    lines.push(`Emails: ${comparison.summary.emails}  Lines: ${comparison.summary.lines}  Unique: ${comparison.summary.unique_match}  Already sold: ${comparison.summary.already_sold}  Gifts: ${comparison.summary.skipped_gift || 0}  Review: ${comparison.summary.ambiguous}  Not in app: ${comparison.summary.no_match}`);
    lines.push('');
    const cols = [
        { key: 'kind', width: 8 },
        { key: 'description', width: 36 },
        { key: 'price', width: 8 },
        { key: 'outcome', width: 14 },
        { key: 'websiteItem', width: 42 },
        { key: 'subject', width: 28 }
    ];
    lines.push(cols.map(col => pad(col.key, col.width)).join('  '));
    lines.push(cols.map(col => '-'.repeat(col.width)).join('  '));
    for (const row of comparison.rows) {
        lines.push(cols.map(col => {
            let value = row[col.key];
            if (col.key === 'price' && value != null) value = Number(value).toFixed(2);
            return pad(value, col.width);
        }).join('  '));
    }
    return lines.join('\n');
}

function pad(value, width) {
    const text = String(value == null ? '' : value).replace(/\s+/g, ' ');
    if (text.length <= width) return text.padEnd(width, ' ');
    return `${text.slice(0, width - 1)}…`;
}

module.exports = {
    compareMessages,
    formatComparisonTable
};

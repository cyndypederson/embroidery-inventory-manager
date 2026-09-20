'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { isDryRun, isImapConfigured } = require('../lib/email-sales/config');
const { fetchKeeraMessages } = require('../lib/email-sales/imap');
const { loadShopData } = require('../lib/email-sales/poll');
const { compareMessages, formatComparisonTable } = require('../lib/email-sales/compare');
const { parseKeeraEmail } = require('../lib/email-sales/parser');

async function main() {
    if (!isImapConfigured()) {
        console.error('IMAP is not configured. Set IMAP_USER and IMAP_PASSWORD in .env');
        process.exit(1);
    }
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI is not set');
        process.exit(1);
    }

    console.log('Dry-run:', isDryRun() ? 'yes (will not mark sold)' : 'NO — writes enabled');
    console.log('Connecting to IMAP Sales mailbox...');

    const fetched = await fetchKeeraMessages({ limit: 50, mailbox: process.env.IMAP_MAILBOX || 'Sales' });
    console.log(`IMAP host: ${fetched.host}`);
    console.log(`Mailbox used: ${fetched.mailbox}`);
    console.log(`Folders seen: ${fetched.folders.slice(0, 20).join(', ')}${fetched.folders.length > 20 ? ' …' : ''}`);
    console.log(`Keera messages: ${fetched.messages.length}`);
    for (let index = 0; index < fetched.messages.length; index += 1) {
        const parsed = await parseKeeraEmail(fetched.messages[index]);
        console.log(`  ${index + 1}. [${parsed.kind}] ${fetched.messages[index].subject} — ${parsed.itemCount} line(s)`);
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const database = client.db(process.env.DB_NAME || 'embroidery_inventory');
    const vendorUpdate = await database.collection('customers').updateOne(
        { name: { $regex: /^Flippin/i } },
        { $set: { requiresVendorNumber: true, vendorNumber: '73' } }
    );
    console.log(`Flippin' Happy vendor #73: matched ${vendorUpdate.matchedCount}, updated ${vendorUpdate.modifiedCount}`);

    const { inventory, sales } = await loadShopData(database);
    const flippin = inventory.filter(item => String(item.customer || '').toLowerCase().includes('flippin'));
    console.log(`\nWebsite: ${inventory.length} inventory, ${sales.length} sales, ${flippin.length} Flippin' Happy items (${flippin.filter(item => item.status === 'sold').length} sold)`);

    const comparison = await compareMessages(fetched.messages, inventory, sales);
    console.log('');
    console.log(formatComparisonTable(comparison));

    const wouldMark = comparison.rows.filter(row => row.wouldMarkSold);
    const already = comparison.rows.filter(row => row.outcome === 'already_sold');
    const review = comparison.rows.filter(row => row.outcome === 'ambiguous');
    const gifts = comparison.rows.filter(row => row.outcome === 'skipped_gift');
    const missing = comparison.rows.filter(row => row.outcome === 'no_match');

    console.log('\nWould mark sold (unique name+price, unsold on website):');
    if (!wouldMark.length) console.log('  (none)');
    wouldMark.forEach(row => console.log(`  - ${row.description} $${Number(row.price).toFixed(2)} → ${row.websiteItem}`));

    console.log('\nAlready sold / already on Sales tab:');
    if (!already.length) console.log('  (none)');
    already.forEach(row => console.log(`  - ${row.description} $${Number(row.price).toFixed(2)} · ${row.websiteItem || row.existingSale}`));

    console.log('\nNeed review (ambiguous):');
    if (!review.length) console.log('  (none)');
    review.forEach(row => console.log(`  - ${row.description} $${Number(row.price).toFixed(2)} · ${row.candidates.length} candidates`));

    console.log('\nOn website but marked gift (will not auto-sell):');
    if (!gifts.length) console.log('  (none)');
    gifts.forEach(row => console.log(`  - ${row.description} $${Number(row.price).toFixed(2)} · ${row.websiteItem || (row.candidates[0] && (row.candidates[0].description || row.candidates[0].name))}`));

    console.log('\nNot in this embroidery inventory (skip is OK — shop-only goods):');
    if (!missing.length) console.log('  (none)');
    missing.forEach(row => console.log(`  - ${row.description} $${Number(row.price).toFixed(2)} (${row.subject})`));

    const reportDir = path.join(__dirname, '..', 'tmp');
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'keera-sales-trial-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        at: new Date().toISOString(),
        dryRun: true,
        host: fetched.host,
        mailbox: fetched.mailbox,
        folders: fetched.folders,
        subjects: fetched.messages.map(message => ({
            subject: message.subject,
            date: message.date,
            from: message.from
        })),
        summary: comparison.summary,
        rows: comparison.rows.map(row => ({
            subject: row.subject,
            kind: row.kind,
            description: row.description,
            price: row.price,
            outcome: row.outcome,
            reason: row.reason,
            websiteItem: row.websiteItem,
            existingSale: row.existingSale,
            wouldMarkSold: row.wouldMarkSold
        }))
    }, null, 2));
    console.log(`\nWrote local report: ${reportPath}`);
    console.log('No inventory or sales were changed.');

    await client.close();
}

main().catch(error => {
    console.error('Trial failed:', error.message);
    process.exit(1);
});

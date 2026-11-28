'use strict';

const { ObjectId } = require('mongodb');
const { isDryRun, isImapConfigured } = require('./config');
const { fetchKeeraMessages } = require('./imap');
const { compareMessages } = require('./compare');
const { buildSaleFromItem, inventorySoldPatch } = require('./sale-builder');

async function loadShopData(database) {
    const inventory = await database.collection('inventory').find({}).toArray();
    const sales = await database.collection('sales').find({}).toArray();
    const customers = await database.collection('customers').find({}).toArray();
    return { inventory, sales, customers };
}

async function applyUniqueMatches(database, comparison, options = {}) {
    if (isDryRun() || options.dryRun !== false) {
        return { applied: 0, dryRun: true };
    }

    let applied = 0;
    for (const row of comparison.rows) {
        if (row.outcome !== 'unique_match' || !row.candidates?.[0]?._id) continue;
        const id = row.candidates[0]._id;
        const item = await database.collection('inventory').findOne({
            _id: typeof id === 'string' && ObjectId.isValid(id) ? new ObjectId(id) : id
        });
        if (!item || item.status === 'sold' || item.isGift) continue;

        const sale = buildSaleFromItem(item, {
            dateSold: row.emailDateSold,
            commissionPercent: row.wouldSale?.commission,
            messageId: options.messageId,
            kind: row.kind
        });
        const patch = inventorySoldPatch(item, sale, row.emailDateSold);
        await database.collection('inventory').updateOne({ _id: item._id }, { $set: patch });
        await database.collection('sales').insertOne(sale);
        applied += 1;
    }
    return { applied, dryRun: false };
}

async function pollKeeraSales(database, options = {}) {
    if (!isImapConfigured()) {
        return { skipped: true, reason: 'IMAP is not configured' };
    }

    const fetched = await fetchKeeraMessages({
        limit: options.limit || 40,
        mailbox: options.mailbox
    });
    const { inventory, sales } = await loadShopData(database);
    const comparison = await compareMessages(fetched.messages, inventory, sales);
    const applyResult = await applyUniqueMatches(database, comparison, {
        dryRun: options.dryRun
    });

    if (database && fetched.messages.length) {
        await database.collection('emailSaleJobs').insertOne({
            at: new Date().toISOString(),
            host: fetched.host,
            mailbox: fetched.mailbox,
            subjects: fetched.messages.map(message => message.subject),
            summary: comparison.summary,
            dryRun: isDryRun() || options.dryRun !== false
        });
    }

    return {
        skipped: false,
        dryRun: isDryRun() || options.dryRun !== false,
        host: fetched.host,
        mailbox: fetched.mailbox,
        folders: fetched.folders,
        subjects: fetched.messages.map(message => message.subject),
        comparison,
        applyResult
    };
}

module.exports = {
    loadShopData,
    pollKeeraSales,
    applyUniqueMatches
};

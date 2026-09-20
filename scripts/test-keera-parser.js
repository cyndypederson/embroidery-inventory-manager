'use strict';

const fs = require('fs');
const path = require('path');
const { parseKeeraEmail, parseLooseText, classifyKind, parseSaleDateFromSubject } = require('../lib/email-sales/parser');
const { matchLine } = require('../lib/email-sales/matcher');

const fixtures = path.join(__dirname, '..', 'lib', 'email-sales', 'fixtures');
let failed = 0;

function assert(name, condition, detail) {
    if (condition) {
        console.log(`ok  ${name}`);
        return;
    }
    failed += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
const weekly = await parseKeeraEmail({
    subject: 'April 15-18 Sales',
    date: '2026-04-19T14:12:00Z',
    html: fs.readFileSync(path.join(fixtures, 'weekly-april.html'), 'utf8')
});
assert('weekly kind', weekly.kind === 'weekly');
assert('weekly date', weekly.dateSold === '2026-04-18');
assert('weekly one item', weekly.items.length === 1);
assert('weekly strips KS prefix', weekly.items[0].description === 'ME AND MY HUSBAND TALK SHIT');
assert('weekly price', weekly.items[0].price === 22.5);

const monthly = await parseKeeraEmail({
    subject: 'Monthly Sales Report - June 2026',
    date: '2026-06-30T20:47:00Z',
    html: fs.readFileSync(path.join(fixtures, 'monthly-june.html'), 'utf8')
});
assert('monthly kind', monthly.kind === 'monthly');
assert('monthly date', monthly.dateSold === '2026-06-30');
assert('monthly two items', monthly.items.length === 2);
assert('monthly commission 20', monthly.commissionPercent === 20);
assert('monthly vendor fee', monthly.vendorFee === 75);
assert('monthly watering can', monthly.items[0].description.includes('WATERING CAN'));
assert('monthly basket', monthly.items[1].description.includes('BASKET'));

const payment = await parseKeeraEmail({
    subject: 'Payment received',
    html: fs.readFileSync(path.join(fixtures, 'payment-only.html'), 'utf8')
});
assert('payment-only has no items', payment.items.length === 0);

const loose = parseLooseText('STAND 10.00 1 10.00 / FRAME 9.00 1 9.00');
assert('loose text two lines', loose.length === 2, JSON.stringify(loose));

assert('classify monthly', classifyKind('Monthly Sales Report - June 2026') === 'monthly');
assert('subject date weekly', parseSaleDateFromSubject('April 15-18 Sales', '2026-04-19') === '2026-04-18');

const unique = matchLine(
    { description: 'Hallelujah Tylenol', price: 22 },
    [{ name: 'Hallelujah Tylenol', description: 'Hallelujah Tylenol', price: 22, status: 'completed', customer: "Flippin' Happy" }]
);
assert('unique match', unique.outcome === 'unique_match');

const already = matchLine(
    { description: 'Snowflake Mittens', price: 12 },
    [{ name: 'Snowflake Mittens', description: 'Snowflake Mittens', price: 12, status: 'sold', customer: "Flippin' Happy" }]
);
assert('already sold', already.outcome === 'already_sold');

const missing = matchLine(
    { description: 'PPLE BASKET W/FRAME', price: 9 },
    [{ name: 'Hallelujah Tylenol', description: 'Hallelujah Tylenol', price: 22, status: 'completed', customer: "Flippin' Happy" }]
);
assert('no match for shop-only item', missing.outcome === 'no_match');

const gift = matchLine(
    { description: 'Home is Christmas edition', price: 22 },
    [{ name: 'Home is Christmas edition', description: 'Home is Christmas edition', price: 22, status: 'completed', customer: "Flippin' Happy", isGift: true, type: 'project' }]
);
assert('gift skipped', gift.outcome === 'skipped_gift');

if (failed) {
    console.error(`\n${failed} parser test(s) failed`);
    process.exit(1);
}
console.log('\nAll parser tests passed');
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});

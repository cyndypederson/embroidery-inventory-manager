#!/usr/bin/env node
'use strict';

const path = require('path');
const {
    SHOP_VENDOR_AUTO_COMMISSION_PERCENT,
    getDefaultShopCommissionPercent,
    getAutoCommissionPercentForShopCustomer
} = require(path.join(__dirname, '..', 'lib', 'shop-commission'));
const { getDefaultShopCommissionPercent: fromEmailConfig } = require('../lib/email-sales/config');
const { buildSaleFromItem } = require('../lib/email-sales/sale-builder');

let failed = 0;

function assert(condition, message) {
    if (!condition) {
        console.error('FAIL:', message);
        failed++;
    }
}

assert(SHOP_VENDOR_AUTO_COMMISSION_PERCENT === 10, 'rate is 10%');

const cases = [
    [2026, 5],
    [2026, 6],
    [2026, 7],
    [2025, 12],
    [2027, 1]
];
for (const [year, month] of cases) {
    assert(
        getDefaultShopCommissionPercent(year, month) === 10,
        `lib commission ${year}-${month}`
    );
    assert(fromEmailConfig(year, month) === 10, `email config ${year}-${month}`);
}

assert(
    getAutoCommissionPercentForShopCustomer("Flippin' Happy") === 10,
    'shop customer'
);
assert(getAutoCommissionPercentForShopCustomer('Jane Doe') === 0, 'non-shop');

const item = {
    type: 'project',
    price: 100,
    quantity: 1,
    customer: "Flippin' Happy",
    description: 'Test hoop'
};
const sale = buildSaleFromItem(item, { dateSold: '2026-06-15' });
assert(sale && sale.commission === 10, 'buildSaleFromItem commission %');
assert(sale && sale.commissionAmount === 10, 'buildSaleFromItem commission amount on $100');

if (failed) {
    console.error(`\n${failed} assertion(s) failed`);
    process.exit(1);
}
console.log('OK shop commission tests');
'use strict';

/**
 * Single source of truth for shop consignment commission (Node / email automation).
 * Browser UI uses the same rate in script.js: SHOP_VENDOR_AUTO_COMMISSION_PERCENT.
 */
const SHOP_VENDOR_AUTO_COMMISSION_PERCENT = 10;

function getDefaultShopCommissionPercent(_year, _month) {
    return SHOP_VENDOR_AUTO_COMMISSION_PERCENT;
}

function getAutoCommissionPercentForShopCustomer(customerRaw) {
    const n = String(customerRaw || '').toLowerCase();
    const isShop =
        n.includes('flippin') ||
        n.includes('first avenue') ||
        n.includes('shop') ||
        n.includes('vendor');
    return isShop ? SHOP_VENDOR_AUTO_COMMISSION_PERCENT : 0;
}

module.exports = {
    SHOP_VENDOR_AUTO_COMMISSION_PERCENT,
    getDefaultShopCommissionPercent,
    getAutoCommissionPercentForShopCustomer
};
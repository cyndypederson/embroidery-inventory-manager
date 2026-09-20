'use strict';

const {
    DEFAULT_SHOP_CUSTOMER,
    getDefaultShopCommissionPercent,
    isFlippinHappyCustomer
} = require('./config');

function generateSaleId() {
    return `sale-${Date.now()}-${Math.floor(Math.random() * 90000 + 10000)}`;
}

function buildSaleFromItem(item, options = {}) {
    if (!item || (item.type === 'project' && item.isGift)) return null;

    const listedPrice = Number(item.price || 0) * (Number(item.quantity || 1) || 1);
    const dateSold = options.dateSold || item.dateSold;
    const year = dateSold ? Number(String(dateSold).slice(0, 4)) : new Date().getFullYear();
    const month = dateSold ? Number(String(dateSold).slice(5, 7)) : (new Date().getMonth() + 1);
    const commissionPercent = options.commissionPercent != null
        ? Number(options.commissionPercent)
        : getDefaultShopCommissionPercent(year, month);

    const vendorDiscountPercent = 0;
    const vendorDiscountAmount = listedPrice * (vendorDiscountPercent / 100);
    const commissionBase = Math.max(0, listedPrice - vendorDiscountAmount);
    let commissionAmount = commissionBase * (commissionPercent / 100);
    if (commissionAmount < 0) commissionAmount = 0;
    const netAmount = Math.max(0, commissionBase - commissionAmount);
    const customer = item.customer || DEFAULT_SHOP_CUSTOMER;
    const isShopSale = isFlippinHappyCustomer(customer)
        || String(customer).toLowerCase().includes('first avenue')
        || String(customer).toLowerCase().includes('shop');

    const messageId = options.messageId || '';
    const kind = options.kind || 'email';

    return {
        id: item.saleId || generateSaleId(),
        saleSource: 'keera-email',
        itemId: item._id || null,
        saleType: 'inventory',
        itemName: item.description || item.name || 'Project Sale',
        customer,
        location: item.location || '',
        quantity: item.quantity || 1,
        listedPrice,
        salePrice: netAmount,
        netAmount,
        commission: commissionPercent,
        commissionAmount,
        vendorDiscount: vendorDiscountPercent,
        vendorDiscountAmount,
        discount: listedPrice - (netAmount + commissionAmount),
        discountPercent: listedPrice > 0
            ? (((listedPrice - (netAmount + commissionAmount)) / listedPrice) * 100).toFixed(1)
            : 0,
        amountPaid: commissionBase,
        saleChannel: isShopSale ? 'shop' : 'individual',
        dateSold,
        notes: `Auto-generated from Keera email ${messageId} (${kind}). Edit to adjust.`
    };
}

function inventorySoldPatch(item, sale, dateSold) {
    return {
        status: 'sold',
        dateSold,
        saleId: sale.id
    };
}

module.exports = {
    generateSaleId,
    buildSaleFromItem,
    inventorySoldPatch
};

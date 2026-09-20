'use strict';

const VENDOR_ID = String(process.env.IMAP_VENDOR_ID || '73');
const FROM_EMAIL = (process.env.IMAP_FROM || 'flippinhappyhomedecor@gmail.com').toLowerCase();
const DEFAULT_SHOP_CUSTOMER = "Flippin' Happy";
const PRICE_TOLERANCE = 0.01;
const SHOP_VENDOR_AUTO_COMMISSION_PERCENT = 30;

function isDryRun() {
    const raw = process.env.EMAIL_SALES_DRY_RUN;
    if (raw == null || raw === '') return true;
    return raw !== 'false' && raw !== '0';
}

function getImapConfig() {
    return {
        hosts: uniqueNonEmpty([
            process.env.IMAP_HOST,
            'imap.midco.net',
            'mail.midco.net',
            'pop.midco.net'
        ]),
        port: Number(process.env.IMAP_PORT || 993),
        user: process.env.IMAP_USER || 'capederson@midco.net',
        password: process.env.IMAP_PASSWORD || '',
        mailbox: process.env.IMAP_MAILBOX || 'Sales',
        from: FROM_EMAIL,
        pollMinutes: Number(process.env.IMAP_POLL_MINUTES || 15)
    };
}

function uniqueNonEmpty(values) {
    return [...new Set(values.filter(Boolean))];
}

function isImapConfigured() {
    const cfg = getImapConfig();
    return Boolean(cfg.user && cfg.password);
}

function getDefaultShopCommissionPercent(year, month) {
    if (Number(year) === 2026 && (month === 5 || month === 6 || month === 7)) {
        return 20;
    }
    return SHOP_VENDOR_AUTO_COMMISSION_PERCENT;
}

function isFlippinHappyCustomer(name) {
    return String(name || '').toLowerCase().includes('flippin');
}

module.exports = {
    VENDOR_ID,
    FROM_EMAIL,
    DEFAULT_SHOP_CUSTOMER,
    PRICE_TOLERANCE,
    SHOP_VENDOR_AUTO_COMMISSION_PERCENT,
    isDryRun,
    getImapConfig,
    isImapConfigured,
    getDefaultShopCommissionPercent,
    isFlippinHappyCustomer
};

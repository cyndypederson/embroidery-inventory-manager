'use strict';

const { PRICE_TOLERANCE, isFlippinHappyCustomer } = require('./config');

function cleanShopDescription(value) {
    return String(value || '')
        .replace(/^(ks|ds|bc|ns|mt|em)\s+/i, '')
        .replace(/\s+v2v\b/ig, ' ')
        .replace(/\bembroidery\b/ig, ' ')
        .trim();
}

function normalizeName(value) {
    return cleanShopDescription(value)
        .toLowerCase()
        .replace(/w\//g, 'with ')
        .replace(/&/g, ' and ')
        .replace(/spiderman/g, 'spider man')
        .replace(/gangsta/g, 'gangster')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokens(value) {
    const stop = new Set(['a', 'an', 'the', 'and', 'with', 'w', 'ks', 'ds', 'of', 'for']);
    return normalizeName(value).split(' ').filter(token => token.length > 1 && !stop.has(token));
}

function pricesMatch(a, b) {
    const left = Number(a);
    const right = Number(b);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    return Math.abs(left - right) <= PRICE_TOLERANCE;
}

function nameScore(shopDescription, item) {
    const shop = normalizeName(shopDescription);
    const name = normalizeName(item.name);
    const description = normalizeName(item.description);
    if (!shop) return 0;
    if (shop === name || shop === description) return 1;

    const shopTokens = tokens(shopDescription);
    const itemTokens = [...new Set([...tokens(item.name), ...tokens(item.description)])];
    if (!shopTokens.length || !itemTokens.length) return 0;

    const overlap = shopTokens.filter(token => itemTokens.includes(token));
    if (!overlap.length) return 0;

    const shopSubset = shopTokens.every(token => itemTokens.includes(token));
    const itemSubset = itemTokens.every(token => shopTokens.includes(token));
    const ratio = overlap.length / Math.min(shopTokens.length, itemTokens.length);

    if ((shopSubset || itemSubset) && ratio >= 0.6) return 0.9;
    if (ratio >= 0.75) return 0.8;
    if (overlap.length >= 2 && ratio >= 0.5) return 0.7;

    const longShop = shopTokens.filter(token => token.length >= 5);
    const longItem = itemTokens.filter(token => token.length >= 5);
    const contained = longShop.some(token => longItem.includes(token) || name.includes(token) || description.includes(token))
        || longItem.some(token => shop.includes(token));
    if (contained && pricesWouldLikelyAlign(shopTokens, itemTokens)) return 0.75;
    return 0;
}

function pricesWouldLikelyAlign(shopTokens, itemTokens) {
    return shopTokens.some(token => token.length >= 5 && itemTokens.includes(token));
}

function itemLabel(item) {
    return item.description || item.name || 'Untitled';
}

function isGift(item) {
    return !!(item && item.isGift);
}

function candidateFromItem(item, score) {
    return {
        _id: item._id,
        name: item.name || '',
        description: item.description || '',
        price: item.price,
        status: item.status,
        customer: item.customer,
        dateSold: item.dateSold || '',
        saleId: item.saleId || '',
        score
    };
}

function findExistingSale(sales, line) {
    return (sales || []).find(sale => {
        if (!pricesMatch(sale.listedPrice ?? sale.salePrice ?? sale.price, line.price)
            && !pricesMatch(sale.listedPrice, line.price)) {
            const salePrice = sale.listedPrice ?? sale.amountPaid ?? sale.price;
            if (!pricesMatch(salePrice, line.price)) return false;
        }
        const score = nameScore(line.description, { name: sale.itemName, description: sale.itemName });
        return score >= 0.7 && isFlippinHappyCustomer(sale.customer);
    }) || null;
}

function matchLine(line, inventory = [], sales = []) {
    const shopItems = (inventory || []).filter(item => isFlippinHappyCustomer(item.customer));
    const scored = shopItems
        .map(item => ({ item, score: nameScore(line.description, item) }))
        .filter(entry => entry.score >= 0.7 && pricesMatch(entry.item.price, line.price))
        .sort((a, b) => b.score - a.score);
    const giftMatches = scored.filter(entry => isGift(entry.item));
    const usable = scored.filter(entry => !isGift(entry.item));

    const soldMatches = usable.filter(entry => entry.item.status === 'sold');
    const unsoldMatches = usable.filter(entry => entry.item.status !== 'sold');
    const existingSale = findExistingSale(sales, line);

    if (soldMatches.length || existingSale) {
        return {
            outcome: 'already_sold',
            reason: soldMatches.length ? 'inventory-sold' : 'sale-record',
            candidates: soldMatches.map(entry => candidateFromItem(entry.item, entry.score)),
            existingSale: existingSale ? {
                id: existingSale.id,
                itemName: existingSale.itemName,
                dateSold: existingSale.dateSold,
                listedPrice: existingSale.listedPrice,
                commission: existingSale.commission
            } : null
        };
    }

    if (unsoldMatches.length === 1) {
        return {
            outcome: 'unique_match',
            reason: 'name-price',
            item: candidateFromItem(unsoldMatches[0].item, unsoldMatches[0].score),
            candidates: unsoldMatches.map(entry => candidateFromItem(entry.item, entry.score))
        };
    }

    if (unsoldMatches.length > 1) {
        return {
            outcome: 'ambiguous',
            reason: 'multiple-unsold',
            candidates: unsoldMatches.map(entry => candidateFromItem(entry.item, entry.score))
        };
    }

    if (giftMatches.length) {
        return {
            outcome: 'skipped_gift',
            reason: 'website-item-is-gift',
            candidates: giftMatches.map(entry => candidateFromItem(entry.item, entry.score))
        };
    }

    return {
        outcome: 'no_match',
        reason: 'not-in-embroidery-inventory',
        candidates: []
    };
}

function matchParsedEmail(parsed, inventory, sales) {
    return (parsed.items || []).map(line => ({
        line,
        match: matchLine(line, inventory, sales)
    }));
}

module.exports = {
    normalizeName,
    nameScore,
    pricesMatch,
    matchLine,
    matchParsedEmail,
    itemLabel
};

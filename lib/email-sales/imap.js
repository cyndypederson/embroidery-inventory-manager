'use strict';

const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { getImapConfig, FROM_EMAIL } = require('./config');

function looksLikeSalesMailbox(box) {
    const pathName = String(box.path || box.name || '').toLowerCase();
    return pathName === 'sales' || pathName.endsWith('/sales') || pathName.endsWith('.sales') || pathName.includes('sales');
}

async function tryConnect(host, cfg) {
    const client = new ImapFlow({
        host,
        port: cfg.port,
        secure: true,
        auth: {
            user: cfg.user,
            pass: cfg.password
        },
        logger: false
    });
    await client.connect();
    return client;
}

async function connectImap() {
    const cfg = getImapConfig();
    if (!cfg.password) {
        throw new Error('IMAP_PASSWORD is not set');
    }

    let lastError;
    for (const host of cfg.hosts) {
        try {
            const client = await tryConnect(host, cfg);
            return { client, host, cfg };
        } catch (error) {
            lastError = error;
        }
    }
    throw new Error(`IMAP connect failed: ${lastError ? lastError.message : 'unknown error'}`);
}

async function resolveMailbox(client, preferred) {
    const boxes = await client.list();
    const names = boxes.map(box => box.path);
    const candidates = [
        preferred,
        'Sales',
        'INBOX/Sales',
        'INBOX.Sales',
        '[Gmail]/Sales'
    ];

    for (const name of candidates) {
        if (name && names.includes(name)) return name;
    }

    const salesBox = boxes.find(looksLikeSalesMailbox);
    if (salesBox) return salesBox.path;
    if (names.includes('INBOX')) {
        console.log('IMAP mailbox "Sales" not found; falling back to INBOX. Available:', names.join(', '));
        return 'INBOX';
    }
    return names[0] || 'INBOX';
}

function fromMatches(parsed, fromAddress) {
    const fromText = [
        parsed.from?.text,
        ...(parsed.from?.value || []).map(entry => entry.address),
        ...(parsed.from?.value || []).map(entry => entry.name)
    ].filter(Boolean).join(' ').toLowerCase();
    return fromText.includes(fromAddress) || fromText.includes('keera') || fromText.includes('flippin');
}

async function fetchKeeraMessages(options = {}) {
    const limit = options.limit || 40;
    const { client, host, cfg } = await connectImap();
    const result = {
        host,
        mailbox: null,
        folders: [],
        messages: []
    };

    try {
        const boxes = await client.list();
        result.folders = boxes.map(box => box.path);
        const mailbox = await resolveMailbox(client, options.mailbox || cfg.mailbox);
        result.mailbox = mailbox;
        await client.mailboxOpen(mailbox);

        const uids = await client.search({ from: cfg.from }, { uid: true });
        const recent = (uids || []).slice(-limit);

        if (!recent.length) {
            // Some servers ignore FROM search; scan recent UIDs.
            const all = await client.search({ all: true }, { uid: true });
            const scan = (all || []).slice(-Math.max(limit * 3, 80));
            for await (const msg of client.fetch(scan, { source: true, envelope: true, uid: true }, { uid: true })) {
                const parsed = await simpleParser(msg.source);
                if (!fromMatches(parsed, FROM_EMAIL)) continue;
                result.messages.push(normalizeMessage(parsed, msg, mailbox));
                if (result.messages.length >= limit) break;
            }
            return result;
        }

        for await (const msg of client.fetch(recent, { source: true, envelope: true, uid: true }, { uid: true })) {
            const parsed = await simpleParser(msg.source);
            if (!fromMatches(parsed, FROM_EMAIL) && options.strictFrom !== false) {
                continue;
            }
            result.messages.push(normalizeMessage(parsed, msg, mailbox));
        }
        return result;
    } finally {
        try {
            await client.logout();
        } catch (_) {
            try { client.close(); } catch (__) { /* ignore */ }
        }
    }
}

function normalizeMessage(parsed, msg, mailbox) {
    return {
        uid: msg.uid,
        mailbox,
        messageId: parsed.messageId || `uid-${msg.uid}`,
        subject: parsed.subject || msg.envelope?.subject || '',
        date: parsed.date || msg.envelope?.date || null,
        from: parsed.from?.text || '',
        html: typeof parsed.html === 'string' ? parsed.html : '',
        text: parsed.text || '',
        attachments: (parsed.attachments || []).map(att => ({
            filename: att.filename,
            contentType: att.contentType,
            content: att.content
        }))
    };
}

module.exports = {
    connectImap,
    resolveMailbox,
    fetchKeeraMessages
};

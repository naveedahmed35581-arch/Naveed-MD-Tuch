// 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 — fixed newsletter (channel) context attached to every outgoing message.
const settings = require('../settings');
const { sanitizeContent } = require('./branding');

const CHANNEL_NAME = settings.newsletterName || settings.botName;
const CHANNEL_LINK = settings.channelLink || '';
const CHANNEL_JID = settings.newsletterJid;

const STATE = {
  name: CHANNEL_NAME,
  link: CHANNEL_LINK,
  jid: CHANNEL_JID,
  metadataName: CHANNEL_NAME
};
global.__naveedChannelState = STATE;

// Kept async for backward compatibility with callers; the JID is fixed, nothing to resolve.
async function resolveOfficialChannel() {
  global.__naveedChannelState = STATE;
  return STATE;
}

function buildChannelContext(existing = {}) {
  return {
    ...existing,
    forwardingScore: existing.forwardingScore ?? 1,
    isForwarded: existing.isForwarded ?? true,
    forwardedNewsletterMessageInfo: {
      ...(existing.forwardedNewsletterMessageInfo || {}),
      newsletterJid: STATE.jid,
      newsletterName: STATE.metadataName || STATE.name,
      serverMessageId: existing.forwardedNewsletterMessageInfo?.serverMessageId ?? 1
    }
  };
}

function installChannelContext(sock) {
  if (!sock || sock.__naveedChannelContextInstalled) return sock;
  const originalSendMessage = sock.sendMessage.bind(sock);

  sock.sendMessage = async (chatId, content, options) => {
    if (content && typeof content === 'object' && !(content instanceof Uint8Array) && !Buffer.isBuffer(content)) {
      const next = sanitizeContent({ ...content });
      next.contextInfo = buildChannelContext(next.contextInfo || {});
      return originalSendMessage(chatId, next, options);
    }
    return originalSendMessage(chatId, content, options);
  };

  sock.__naveedChannelContextInstalled = true;
  return sock;
}

module.exports = {
  CHANNEL_NAME,
  CHANNEL_LINK,
  CHANNEL_JID,
  resolveOfficialChannel,
  buildChannelContext,
  installChannelContext
};

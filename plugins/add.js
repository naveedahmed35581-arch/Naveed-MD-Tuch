'use strict';
const isAdmin = require('../lib/isAdmin');

function numberFromText(text) {
  return String(text || '').replace(/[^0-9]/g, '');
}

async function resolveTarget(sock, chatId, message, rawArg) {
  const ctx = message.message?.extendedTextMessage?.contextInfo || {};
  const mentioned = ctx.mentionedJid || [];
  if (mentioned.length) return [...mentioned];
  if (ctx.participant) return [ctx.participant];

  const number = numberFromText(rawArg);
  if (!number) return [];

  try {
    const results = await sock.onWhatsApp(number);
    if (Array.isArray(results) && results[0]?.jid) return [results[0].jid];
  } catch (_) {}
  return [`${number}@s.whatsapp.net`];
}

async function addCommand(sock, chatId, senderId, message, rawArg = '') {
  if (!chatId?.endsWith('@g.us')) {
    return sock.sendMessage(chatId, { text: '❌ .add can only be used in a group.' }, { quoted: message });
  }

  const status = await isAdmin(sock, chatId, senderId);
  if (!status.isBotAdmin) return sock.sendMessage(chatId, { text: '❌ Bot must be an admin to add members.' }, { quoted: message });
  if (!status.isSenderAdmin && !message.key.fromMe) return sock.sendMessage(chatId, { text: '❌ Only group admins can use .add.' }, { quoted: message });

  const targets = await resolveTarget(sock, chatId, message, rawArg);
  if (!targets.length) return sock.sendMessage(chatId, { text: 'Usage: .add 919XXXXXXXXX, or mention/reply to a user.' }, { quoted: message });

  try {
    const result = await sock.groupParticipantsUpdate(chatId, targets, 'add');
    const ok = result?.filter?.(r => String(r?.status || '200') === '200')?.length || 0;
    await sock.sendMessage(chatId, {
      text: ok ? `✅ Add request sent for ${ok} member${ok === 1 ? '' : 's'}.` : '⚠️ WhatsApp did not add the requested member(s). They may have privacy/join restrictions.'
    }, { quoted: message });
  } catch (error) {
    console.error('[ADD]', error?.stack || error);
    await sock.sendMessage(chatId, { text: '❌ Failed to add the member. Check bot admin permissions and the number/privacy settings.' }, { quoted: message });
  }
}

module.exports = addCommand;

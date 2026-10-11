'use strict';

const isAdmin = require('../lib/isAdmin');

function participantMentionJid(participant) {
  // Baileys v7 prefers the participant's `id`. For LID groups this is an
  // @lid JID, which is the identifier WhatsApp expects for mentions.
  return participant?.id || participant?.lid || participant?.phoneNumber || null;
}

function mentionLabel(jid) {
  return String(jid || '').split('@')[0].split(':')[0];
}

async function tagAllCommand(sock, chatId, senderId, message) {
  try {
    if (!chatId?.endsWith('@g.us')) {
      await sock.sendMessage(chatId, { text: '❌ .tagall can only be used in a group.' }, { quoted: message });
      return;
    }

    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
    if (!isBotAdmin) {
      await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.' }, { quoted: message });
      return;
    }
    if (!isSenderAdmin) {
      await sock.sendMessage(chatId, { text: 'Only group admins can use the .tagall command.' }, { quoted: message });
      return;
    }

    const groupMetadata = await sock.groupMetadata(chatId);
    const participants = Array.isArray(groupMetadata?.participants) ? groupMetadata.participants : [];
    const mentionJids = [...new Set(participants.map(participantMentionJid).filter(Boolean))];

    if (!mentionJids.length) {
      await sock.sendMessage(chatId, { text: 'No participants found in the group.' }, { quoted: message });
      return;
    }

    const lines = mentionJids.map(jid => `@${mentionLabel(jid)}`);
    const text = `🔊 *Attention Everybody*

${lines.join('\n')}`;

    await sock.sendMessage(chatId, {
      text,
      mentions: mentionJids
    }, { quoted: message });
  } catch (error) {
    console.error('[TAGALL] Error:', error?.stack || error);
    await sock.sendMessage(chatId, { text: '❌ Failed to tag all members.' }, { quoted: message });
  }
}

module.exports = tagAllCommand;

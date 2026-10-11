'use strict';
const isAdmin = require('../lib/isAdmin');

async function leaveCommand(sock, chatId, senderId, message) {
  if (!chatId?.endsWith('@g.us')) {
    return sock.sendMessage(chatId, { text: '❌ .leave can only be used in a group.' }, { quoted: message });
  }

  if (!message.key.fromMe) {
    const status = await isAdmin(sock, chatId, senderId);
    if (!status.isSenderAdmin) {
      return sock.sendMessage(chatId, { text: '❌ Only a group admin or bot owner can use .leave.' }, { quoted: message });
    }
  }

  try {
    await sock.groupLeave(chatId);
  } catch (error) {
    console.error('[LEAVE]', error?.stack || error);
    await sock.sendMessage(chatId, { text: '❌ Failed to leave this group.' }, { quoted: message });
  }
}

module.exports = leaveCommand;

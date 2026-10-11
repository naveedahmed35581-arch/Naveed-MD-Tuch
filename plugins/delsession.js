'use strict';
const fs = require('fs');
const path = require('path');
const ownerCheck = require('../lib/isOwner');

module.exports = async function deleteActiveSession(sock, chatId, message) {
  const sender = message?.key?.participant || message?.key?.remoteJid || '';
  const allowed = message?.key?.fromMe || await ownerCheck(sender, sock, chatId);
  if (!allowed) {
    return sock.sendMessage(chatId, { text: '❌ Only the bot owner can delete the active WhatsApp session.' }, { quoted: message });
  }
  const sessionDir = path.resolve(process.cwd(), 'session');
  if (!fs.existsSync(sessionDir)) {
    return sock.sendMessage(chatId, { text: 'ℹ️ No active session folder was found.' }, { quoted: message });
  }
  await sock.sendMessage(chatId, { text: '⚠️ Active 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 session will be deleted. The bot must restart and be paired again.' }, { quoted: message });
  fs.rmSync(sessionDir, { recursive: true, force: true });
  try { sock.end(new Error('Active session deleted by owner')); } catch {}
  return true;
};

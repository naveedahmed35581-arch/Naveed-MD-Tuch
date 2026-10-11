'use strict';
const sessionManager = require('../lib/pairSessionManager');

async function pairCommand(sock, chatId, message, q) {
  const number = sessionManager.normalizeNumber(q);
  if (!number) {
    return sock.sendMessage(chatId, { text: '🔐 Usage: .pair 919XXXXXXXXX\n\nThis creates a completely separate 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 bot session for that WhatsApp number.' }, { quoted: message });
  }
  if (!/^\d{8,15}$/.test(number) || number.startsWith('0')) {
    return sock.sendMessage(chatId, { text: '❌ Invalid international number. Example: .pair 919XXXXXXXXX' }, { quoted: message });
  }
  try {
    const result = await sessionManager.pair(number);
    return sock.sendMessage(chatId, {
      text: `╭━━━〔 🔗 NAVEED SOUL LINK 〕━━━╮\n┃ 👑 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 • ULTRA LEGEND\n┣━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n┃ 📱 TARGET : +${result.number}\n┃ 🔐 CODE   : *${result.code}*\n┃ 🌀 TYPE   : SEPARATE SESSION\n┣━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n┃ 1️⃣ WhatsApp → Settings\n┃ 2️⃣ Linked Devices → Link Device\n┃ 3️⃣ Choose *Link with phone number*\n┃ 4️⃣ Enter the code above\n┣━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n┃ ⚔️ This number gets its OWN bot socket.\n┃ 📁 sessions/${result.number}\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
    }, { quoted: message });
  } catch (error) {
    console.error('[PAIR]', error?.stack || error);
    return sock.sendMessage(chatId, { text: `❌ Pairing failed: ${error?.message || 'unknown error'}` }, { quoted: message });
  }
}
module.exports = pairCommand;

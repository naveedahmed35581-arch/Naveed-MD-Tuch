const settings = require('../settings');

// Bot info card (no external repository lookup).
async function githubCommand(sock, chatId, message) {
  try {
    const txt =
      `*👑 ${settings.botName} 👑*\n\n` +
      `👤 *Owner* : ${settings.ownerName}\n` +
      `📞 *Contact* : wa.me/${String(settings.ownerNumber).replace(/\D/g, '')}\n` +
      `🔖 *Version* : v${settings.version}\n` +
      `🌐 *Mode* : ${settings.commandMode}\n` +
      (settings.repoLink ? `🔗 *Repo* : ${settings.repoLink}\n` : '') +
      (settings.channelLink ? `📢 *Channel* : ${settings.channelLink}\n` : '') +
      `\n` +
      `${settings.poweredBy}`;

    await sock.sendMessage(chatId, { image: { url: settings.imageUrl }, caption: txt }, { quoted: message });
  } catch (error) {
    await sock.sendMessage(chatId, { text: '❌ Error fetching bot information.' }, { quoted: message });
  }
}

module.exports = githubCommand;

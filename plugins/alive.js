const settings = require("../settings");

async function aliveCommand(sock, chatId, message) {
    const caption =
        `*👑 ${settings.botName} is Active!* ✅\n\n` +
        `*Version:* ${settings.version}\n` +
        `*Status:* Online\n` +
        `*Mode:* Public\n` +
        `*Owner:* ${settings.ownerName}\n\n` +
        `*✨ Features:*\n` +
        `🛡️ Group Management\n` +
        `🔗 Antilink Protection\n` +
        `🎮 Fun Commands\n` +
        `🚀 And more!\n\n` +
        `Type *.menu* for full command list\n\n` +
        `${settings.poweredBy}`;
    try {
        await sock.sendMessage(chatId, {
            image: { url: settings.imageUrl },
            caption,
            mimetype: 'image/jpeg',
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true
            }
        }, { quoted: message });
    } catch (error) {
        console.error('Error in alive command:', error);
        await sock.sendMessage(chatId, { text: caption }, { quoted: message });
    }
}

module.exports = aliveCommand;

const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');
const { call } = require('../lib/adeelApi');
const { pickUrl, downloadBuffer } = require('../lib/mediaFallback');

async function ttsCommand(sock, chatId, text, message, language = 'en') {
    if (!text) {
        await sock.sendMessage(chatId, { text: 'Please provide the text for TTS conversion.' }, { quoted: message });
        return;
    }

    // KnightBot PRIMARY.
    try {
        const result = await call('tts', text, { lang: language });
        if (result.kind === 'binary') {
            return sock.sendMessage(chatId, { audio: result.buffer, mimetype: result.contentType || 'audio/mpeg', ptt: false }, { quoted: message });
        }
        const url = pickUrl(result.data, 'audio');
        if (url) {
            const media = await downloadBuffer(url);
            return sock.sendMessage(chatId, { audio: media.buffer, mimetype: media.contentType || 'audio/mpeg', ptt: false }, { quoted: message });
        }
    } catch (e) {
        console.log('[TTS] KnightBot/Adeel provider failed, using gTTS fallback:', e.message);
    }

    // gTTS fallback.
    const fileName = `tts-${Date.now()}.mp3`;
    const filePath = path.join(__dirname, '..', 'assets', fileName);
    await new Promise((resolve, reject) => {
        const gtts = new gTTS(text, language);
        gtts.save(filePath, err => err ? reject(err) : resolve());
    });
    try {
        await sock.sendMessage(chatId, { audio: { url: filePath }, mimetype: 'audio/mpeg', ptt: false }, { quoted: message });
    } finally {
        fs.unlink(filePath, () => {});
    }
}
module.exports = ttsCommand;

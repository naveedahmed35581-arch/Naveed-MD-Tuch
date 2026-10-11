'use strict';
const { getYoutubeAudio, safeName } = require('../lib/youtubeAudio');

async function songCommand(sock, chatId, message) {
  try {
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const query = text.replace(/^\.(?:song|play|music|mp3|ytmp3)\s*/i, '').trim();
    if (!query) {
      return sock.sendMessage(chatId, { text: '🎧 *SONG*\n\nUse: `.song <song name or YouTube link>`' }, { quoted: message });
    }

    await sock.sendMessage(chatId, { react: { text: '🎧', key: message.key } }).catch(() => {});

    const media = await getYoutubeAudio(query);
    if (!media?.buffer) throw new Error('No audio was received from the download service');

    const title = safeName(media.title || query);
    const mimetype = /^audio\//i.test(media.contentType || '') ? media.contentType.split(';')[0] : 'audio/mpeg';

    await sock.sendMessage(chatId, {
      audio: media.buffer,
      mimetype,
      fileName: `${title}.mp3`,
      ptt: false
    }, { quoted: message });

    await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } }).catch(() => {});
  } catch (error) {
    console.error('[SONG]', error);
    await sock.sendMessage(chatId, {
      text: `❌ *SONG DOWNLOAD FAILED*\n\n${error.message || 'Unable to download this song right now.'}`
    }, { quoted: message });
    await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }).catch(() => {});
  }
}

module.exports = songCommand;

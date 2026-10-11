const fetch = require('node-fetch');
const { call } = require('../lib/adeelApi');
const { pickUrl, downloadBuffer } = require('../lib/mediaFallback');

async function handleSsCommand(sock, chatId, message, match) {
    if (!match) {
        await sock.sendMessage(chatId, {
            text: `*SCREENSHOT TOOL*\n\n*.ss <url>*\n*.ssweb <url>*\n*.screenshot <url>*\n\nTake a screenshot of any website\n\nExample:\n.ss https://google.com\n.ssweb https://google.com\n.screenshot https://google.com`,
            quoted: message
        });
        return;
    }

    try {
        // Show typing indicator
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);

        // Extract URL from command
        const url = match.trim();
        
        // Validate URL
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return sock.sendMessage(chatId, {
                text: '❌ Please provide a valid URL starting with http:// or https://',
                quoted: message
            });
        }

        // KnightBot PRIMARY (through unified provider router).
        try {
            const result = await call('ssweb', url);
            if (result.kind === 'binary') {
                return sock.sendMessage(chatId, { image: result.buffer }, { quoted: message });
            }
            const mediaUrl = pickUrl(result.data, 'image');
            if (mediaUrl) {
                const media = await downloadBuffer(mediaUrl);
                return sock.sendMessage(chatId, { image: media.buffer }, { quoted: message });
            }
        } catch (knightError) {
            console.log('[SS] KnightBot/Adeel provider failed, using Siputzx fallback:', knightError.message);
        }

        // Existing provider fallback.
        const apiUrl = `https://api.siputzx.my.id/api/tools/ssweb?url=${encodeURIComponent(url)}&theme=light&device=desktop`;
        const response = await fetch(apiUrl, { headers: { 'accept': '*/*' } });
        if (!response.ok) throw new Error(`API responded with status: ${response.status}`);
        const imageBuffer = await response.buffer();
        await sock.sendMessage(chatId, { image: imageBuffer }, { quoted: message });

    } catch (error) {
        console.error('❌ Error in ss command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to take screenshot. Please try again in a few minutes.\n\nPossible reasons:\n• Invalid URL\n• Website is blocking screenshots\n• Website is down\n• API service is temporarily unavailable',
            quoted: message
        });
    }
}

module.exports = {
    handleSsCommand
}; 
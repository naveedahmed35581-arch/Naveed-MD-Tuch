const fetch = require('node-fetch');
const { call } = require('../lib/adeelApi');

function extractLyrics(data) {
    if (!data) return null;
    if (typeof data === 'string') return data.trim() || null;
    const candidates = [
        data.plainLyrics, data.syncedLyrics,
        data.lyrics, data.result?.lyrics, data.data?.lyrics,
        data.result?.text, data.text, data.answer, data.message
    ];
    for (const value of candidates) if (typeof value === 'string' && value.trim()) return value.trim();
    return null;
}

async function getJson(url, headers = {}) {
    const res = await fetch(url, { headers, timeout: 15000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function lrclibLyrics(query) {
    const headers = { 'User-Agent': 'NaveedTuch/7.1 (lyrics command)' };
    // LRCLIB exposes a no-key search API and returns plainLyrics/syncedLyrics.
    const data = await getJson(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, headers);
    const rows = Array.isArray(data) ? data : [];
    const best = rows.find(x => !x.instrumental && (x.plainLyrics || x.syncedLyrics));
    return best ? extractLyrics(best) : null;
}

async function lyricsOvh(query) {
    // When the user supplied "artist - title", use the dedicated lyrics.ovh route.
    const parts = query.split(/\s+-\s+/, 2);
    if (parts.length !== 2) return null;
    const [artist, title] = parts;
    const data = await getJson(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    return extractLyrics(data);
}

async function lyricsCommand(sock, chatId, songTitle, message) {
    if (!songTitle) {
        await sock.sendMessage(chatId, { text: '🔍 Please enter the song name to get the lyrics! Usage: *.lyrics <song name>*' }, { quoted: message });
        return;
    }
    const query = String(songTitle).trim();
    const providers = [
        async () => { const result = await call('lyrics', query); return result.kind === 'binary' ? null : extractLyrics(result.data); },
        async () => await lrclibLyrics(query),
        async () => await lyricsOvh(query),
        async () => { const data = await getJson(`https://lyricsapi.fly.dev/api/lyrics?q=${encodeURIComponent(query)}`); return extractLyrics(data); }
    ];
    for (const provider of providers) {
        try {
            const lyrics = await provider();
            if (lyrics) {
                const clean = lyrics.replace(/\r/g, '').trim();
                return sock.sendMessage(chatId, { text: `🎧 *${query}*\n\n${clean.slice(0, 4000)}` }, { quoted: message });
            }
        } catch (e) { console.log('[LYRICS] provider failed:', e.message); }
    }
    await sock.sendMessage(chatId, { text: `❌ Sorry, I couldn't find lyrics for "${query}".` }, { quoted: message });
}
module.exports = { lyricsCommand };

'use strict';

const axios = require('axios');
const yts = require('yt-search');
const { adeelMedia, downloadBuffer, pickUrl } = require('./mediaFallback');
const { call: knightCall } = require('./knightApi');

const UA = 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36';
const ADEEL = 'https://adeel-xtech-apis.vercel.app/api';

function isYoutubeUrl(value) {
  return /^https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)[^\s]+/i.test(String(value || ''));
}

function youtubeId(value) {
  const s = String(value || '').trim();
  const m = s.match(/(?:v=|youtu\.be\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/i);
  return m?.[1] || null;
}

function safeName(value) {
  return String(value || 'song')
    .replace(/[\\/:*?"<>|\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90) || 'song';
}

function validAudioBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 1000) return false;
  const head = buffer.subarray(0, 16);
  const ascii = head.toString('ascii');
  const utf8 = head.toString('utf8').toLowerCase();
  if (utf8.startsWith('<!do') || utf8.startsWith('<html') || utf8.startsWith('{"error') || utf8.startsWith('{"message')) return false;
  if (ascii.startsWith('ID3')) return true;
  if (head[0] === 0xff && (head[1] & 0xe0) === 0xe0) return true;
  if (ascii.slice(4, 8) === 'ftyp') return true;
  if (ascii.startsWith('OggS') || ascii.startsWith('RIFF')) return true;
  return buffer.length > 4096;
}

async function downloadUrl(url) {
  const r = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 90000,
    maxContentLength: 150 * 1024 * 1024,
    maxBodyLength: 150 * 1024 * 1024,
    decompress: true,
    validateStatus: s => s >= 200 && s < 400,
    headers: { 'User-Agent': UA, Accept: 'audio/mpeg,audio/*,*/*;q=0.8', 'Accept-Encoding': 'identity' }
  });
  const buffer = Buffer.from(r.data);
  if (!validAudioBuffer(buffer)) throw new Error(`Provider returned non-audio data (HTTP ${r.status})`);
  return { buffer, contentType: r.headers?.['content-type'] || 'audio/mpeg' };
}

function extractMediaUrl(data) {
  if (!data) return null;
  const candidates = [
    data?.result?.download,
    data?.result?.download_url,
    data?.result?.downloadUrl,
    data?.result?.audio,
    data?.result?.audioUrl,
    data?.result?.url,
    data?.download,
    data?.download_url,
    data?.downloadUrl,
    data?.audio,
    data?.audioUrl,
    data?.url,
    data?.link,
    data?.data?.download,
    data?.data?.download_url,
    data?.data?.downloadUrl,
    data?.data?.audio,
    data?.data?.url
  ];
  const direct = candidates.find(v => typeof v === 'string' && /^https?:\/\//i.test(v));
  return direct || pickUrl(data, 'audio');
}

async function adeelRequest(endpoint, param, value) {
  const url = `${ADEEL}/${endpoint}?${param}=${encodeURIComponent(String(value))}`;
  const r = await axios.get(url, {
    timeout: 60000,
    maxContentLength: 20 * 1024 * 1024,
    headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*' },
    validateStatus: s => s >= 200 && s < 500
  });
  if (r.status >= 400) throw new Error(`Adeel ${endpoint} HTTP ${r.status}`);
  const ct = String(r.headers?.['content-type'] || '').toLowerCase();
  if (/^audio\//.test(ct)) {
    const buffer = Buffer.from(r.data);
    if (!validAudioBuffer(buffer)) throw new Error(`Adeel ${endpoint} returned invalid audio`);
    return { buffer, contentType: ct };
  }
  if (typeof r.data === 'string') {
    if (/^https?:\/\//i.test(r.data.trim())) return { url: r.data.trim() };
    throw new Error(`Adeel ${endpoint} returned text instead of media JSON`);
  }
  if (r.data?.success === false || r.data?.status === false || r.data?.error) {
    throw new Error(r.data?.message || r.data?.error || `Adeel ${endpoint} failed`);
  }
  const mediaUrl = extractMediaUrl(r.data);
  if (!mediaUrl) throw new Error(`Adeel ${endpoint} returned no download URL`);
  return { ...(await downloadUrl(mediaUrl)), url: mediaUrl, raw: r.data };
}

async function resolveWithAdeelSearch(query) {
  const r = await adeelRequest('ytsearch', 'q', query);
  const d = r.raw;
  const list = Array.isArray(d) ? d : (d?.result || d?.results || d?.data || []);
  const first = Array.isArray(list) ? list[0] : list;
  const url = first?.url || first?.videoUrl || first?.video_url || first?.link || first?.youtubeUrl || first?.youtube_url;
  if (!url || !isYoutubeUrl(url)) throw new Error('Adeel ytsearch returned no YouTube URL');
  return { url, title: first?.title || first?.name || query, author: first?.author || first?.channel || 'YouTube', thumbnail: first?.thumbnail || null, duration: first?.duration || '' };
}

async function resolveVideo(query) {
  if (isYoutubeUrl(query)) return { url: String(query).trim(), title: 'YouTube Song', author: 'YouTube', thumbnail: null, duration: '' };

  // Use the user's dedicated Adeel-XTech search API first; local yt-search is the fallback.
  try { return await resolveWithAdeelSearch(query); } catch (_) {}
  const result = await yts(String(query).trim());
  const video = result?.videos?.[0];
  if (!video?.url) throw new Error('No YouTube result found for that song');
  return video;
}

async function fromAdeelDirect(videoUrl) {
  return adeelRequest('ytmp3', 'url', videoUrl);
}

async function fromKnight(videoUrl) {
  const result = await knightCall('ytaudio', videoUrl, {});
  if (result.kind === 'binary') {
    if (!validAudioBuffer(result.buffer)) throw new Error('KnightBot returned invalid audio');
    return result;
  }
  const mediaUrl = extractMediaUrl(result.data);
  if (!mediaUrl) throw new Error('KnightBot returned no audio URL');
  return { ...(await downloadUrl(mediaUrl)), url: mediaUrl };
}

async function fromLegacy(url) {
  const providers = [
    `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(url)}&format=mp3`,
    `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(url)}`,
    `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(url)}`,
    `https://apis-keith.vercel.app/download/dlmp3?url=${encodeURIComponent(url)}`
  ];
  let last;
  for (const endpoint of providers) {
    try {
      const r = await axios.get(endpoint, { timeout: 60000, headers: { 'User-Agent': UA, Accept: '*/*' } });
      const direct = extractMediaUrl(r.data);
      if (direct) return { ...(await downloadUrl(direct)), url: direct };
      throw new Error('No audio URL in provider response');
    } catch (e) { last = e; }
  }
  throw last || new Error('Legacy audio providers failed');
}

async function getYoutubeAudio(query) {
  const input = String(query || '').trim();
  if (!input) throw new Error('Please provide a song name or YouTube link');
  const video = await resolveVideo(input);
  const errors = [];

  // IMPORTANT: Adeel-XTech's dedicated /ytmp3 endpoint is used with a resolved
  // YouTube URL. This avoids the old KnightBot search path that was returning 500.
  try {
    const media = await fromAdeelDirect(video.url);
    return { ...media, ...video, title: media.title || video.title, source: 'Adeel-XTech /ytmp3' };
  } catch (e) { errors.push(`Adeel: ${e.message}`); }

  try {
    const media = await fromKnight(video.url);
    return { ...media, ...video, title: media.title || video.title, source: 'KnightBot ytaudio' };
  } catch (e) { errors.push(`Knight: ${e.message}`); }

  try {
    const media = await fromLegacy(video.url);
    return { ...media, ...video, title: media.title || video.title, source: 'legacy fallback' };
  } catch (e) { errors.push(`Legacy: ${e.message}`); }

  throw new Error(`All song providers failed: ${errors.join(' | ')}`);
}

module.exports = { getYoutubeAudio, resolveVideo, isYoutubeUrl, youtubeId, safeName };

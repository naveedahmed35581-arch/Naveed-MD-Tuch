'use strict';

const settings = require('../settings');
const BRAND = String(settings.botName || '𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑');

const SMALL_CAPS = {
  'ᴀ':'A','ʙ':'B','ᴄ':'C','ᴅ':'D','ᴇ':'E','ꜰ':'F','ɢ':'G','ʜ':'H','ɪ':'I','ᴊ':'J','ᴋ':'K','ʟ':'L','ᴍ':'M','ɴ':'N','ᴏ':'O','ᴘ':'P','ǫ':'Q','ʀ':'R','ꜱ':'S','ᴛ':'T','ᴜ':'U','ᴠ':'V','ᴡ':'W','ʏ':'Y','ᴢ':'Z',
  'ᵃ':'a','ᵇ':'b','ᶜ':'c','ᵈ':'d','ᵉ':'e','ᶠ':'f','ᵍ':'g','ʰ':'h','ⁱ':'i','ʲ':'j','ᵏ':'k','ˡ':'l','ᵐ':'m','ⁿ':'n','ᵒ':'o','ᵖ':'p','ʳ':'r','ˢ':'s','ᵗ':'t','ᵘ':'u','ᵛ':'v','ʷ':'w','ˣ':'x','ʸ':'y','ᶻ':'z'
};

function normalizeVisibleText(value) {
  let out;
  try { out = String(value).normalize('NFKC'); } catch { out = String(value); }
  return [...out].map(ch => SMALL_CAPS[ch] || ch).join('');
}

// Only user-visible third-party branding is replaced. URLs are protected so
// functional links/API endpoints are never corrupted by white-label cleanup.
const replacements = [
  [/KNIGHT[- ]?BOT/gi, BRAND],
  [/ADEEL[- ]?MD(?:\s+TEAM)?/gi, BRAND],
  [/ADEEL\s*X[- ]?TECH/gi, BRAND],
  [/Powered\s+by\s+FantoX(?:001)?/gi, `Powered by ${BRAND}`],
  [/Made\s+by\s+FantoX(?:001)?/gi, `Made by ${BRAND}`],
  [/Powered\s+by\s+Keith\s+MD/gi, `Powered by ${BRAND}`],
  [/Credits\s+to\s+Keith\s+MD/gi, `Credits to ${BRAND}`],
  [/Downloaded\s+by\s+KNIGHT[- ]?BOT/gi, `Downloaded by ${BRAND}`],
  [/Powered\s+by\s+ADEEL[- ]?MD/gi, `Powered by ${BRAND}`],
];

const PROTECTED_BRANDS = [settings.poweredBy, settings.ownerName, settings.botName].filter(Boolean);

function cleanText(value) {
  const brands = [];
  let raw = String(value);
  for (const b of PROTECTED_BRANDS) {
    if (!raw.includes(b)) continue;
    const idx = brands.push(b) - 1;
    raw = raw.split(b).join(`__NAVEED_BRAND_${idx}__`);
  }
  const normalized = normalizeVisibleText(raw);
  const urls = [];
  const protectedText = normalized.replace(/https?:\/\/[^\s<>]+/gi, (url) => {
    const token = `__NAVEED_URL_${urls.length}__`;
    urls.push(url);
    return token;
  });
  let out = protectedText;
  for (const [re, replacement] of replacements) out = out.replace(re, replacement);
  out = out.replace(/__NAVEED_URL_(\d+)__/g, (_, i) => urls[Number(i)] || '');
  return out.replace(/__NAVEED_BRAND_(\d+)__/g, (_, i) => brands[Number(i)] || '');
}

function sanitizeContent(value) {
  if (typeof value === 'string') return cleanText(value);
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return value.map(sanitizeContent);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (/^(url|directPath|mediaKey|fileSha256|fileEncSha256|thumbnailDirectPath|jpegThumbnail|stream|data)$/i.test(key)) {
      out[key] = child;
    } else {
      out[key] = sanitizeContent(child);
    }
  }
  return out;
}

module.exports = { BRAND, cleanText, sanitizeContent, normalizeVisibleText };

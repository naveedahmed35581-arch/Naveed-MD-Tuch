'use strict';
const fetch = require('node-fetch');
const BASE = 'https://knightbotapi.stream';
const APIKEY = process.env.KNIGHTBOT_APIKEY || 'knight';
const TIMEOUT = 60000;

// Every documented KnightBot endpoint has its own named transport. Nothing is
// silently reused across unrelated commands.
const SPECS = {
  download: ['api/download', 'url', { type: 'mp4' }],
  ytaudio: ['api/download/ytaudio', 'url', { format: '128kbps' }],
  ytaudioSearch: ['api/download/ytaudio', 'query'],
  ytmp3: ['api/ytmp3', 'query'],
  ytmp3simple: ['api/ytmp3', 'query'],
  ytmp4: ['api/download/ytmp4', 'url', { format: '720p' }],
  ytmp4Search: ['api/download/ytmp4', 'query'],
  ytmp4simple: ['api/ytmp4', 'query'],
  twitter: ['api/download/twitter', 'url'],
  facebook: ['api/download/facebook', 'url'],
  tiktok: ['api/download/tiktok', 'url'],
  tiktokdl: ['api/download/tiktokdl', 'url'],
  instagram: ['api/download/instagram', 'url'],
  instagramdl: ['api/download/instagramdl', 'url'],
  pinterest: ['api/download/pinterest', 'url'],
  lyrics: ['api/lyrics', 'query'],
  ssweb: ['api/ssweb', 'url'],
  tts: ['api/tts', 'text', { lang: 'en' }],
  qr: ['api/qr', 'text'],
};

function buildUrl(name, arg, extra = {}) {
  const spec = SPECS[name];
  if (!spec) throw new Error(`Unsupported KnightBot API command: ${name}`);
  const [apiPath, param, defaults = {}] = spec;
  const params = new URLSearchParams({ apikey: APIKEY, ...defaults, ...extra, [param]: String(arg ?? '') });
  return `${BASE}/${apiPath}?${params.toString()}`;
}

function hasMediaReference(value) {
  if (value == null) return false;
  if (typeof value === 'string') return /^https?:\/\//i.test(value) || /^\/files\//i.test(value);
  if (Array.isArray(value)) return value.some(hasMediaReference);
  if (typeof value === 'object') return Object.entries(value).some(([k,v]) => /download|media|audio|video|image|file|url|link|src|result|data/i.test(k) && hasMediaReference(v));
  return false;
}

async function pollProgress(id) {
  const progressUrl = `${BASE}/api/progress/${encodeURIComponent(id)}`;
  for (let i = 0; i < 20; i++) {
    const r = await fetch(progressUrl, { headers: { 'user-agent': 'NaveedTuch/2.1', accept: 'application/json,*/*' } });
    if (!r.ok) throw new Error(`Progress HTTP ${r.status}`);
    const raw = await r.text();
    let data; try { data = JSON.parse(raw); } catch { data = raw; }
    if (hasMediaReference(data)) return data;
    const status = String(data?.status || data?.result?.status || '').toLowerCase();
    if (['failed','error','cancelled','canceled'].includes(status) || data?.success === false) {
      throw new Error(data?.message || data?.error || 'KnightBot job failed');
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error('KnightBot download job timed out');
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { ...options, redirect: 'follow', headers: { 'user-agent': 'NaveedTuch/2.1', accept: '*/*', ...(options.headers || {}) }, signal: controller.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const ct = (r.headers.get('content-type') || '').toLowerCase().split(';')[0];
    if (/^(image|audio|video)\//.test(ct)) {
      const buffer = await r.buffer();
      if (!buffer.length) throw new Error('Empty media response');
      return { kind: 'binary', buffer, contentType: ct, url: r.url };
    }
    const raw = await r.text();
    let data; try { data = JSON.parse(raw); } catch { data = raw; }
    if (data && typeof data === 'object' && !hasMediaReference(data)) {
      const jobId = data.id || data.jobId || data.job_id || data.taskId || data.task_id || data.result?.id || data.result?.jobId;
      if (jobId) {
        data = await pollProgress(jobId);
      }
    }
    if (data && typeof data === 'object' && (data.success === false || data.status === false || data.error)) {
      throw new Error(data.message || data.error || 'KnightBot returned failure');
    }
    return { kind: 'json', data, url: r.url };
  } finally { clearTimeout(timer); }
}

async function call(name, arg, extra = {}) { return request(buildUrl(name, arg, extra)); }
module.exports = { BASE, APIKEY, SPECS, buildUrl, request, call };

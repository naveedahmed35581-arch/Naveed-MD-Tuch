// 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 — ONE central place for every on/off setting.
// File: bot-settings/toggles.json  (edit it by hand or use the chat commands; both work)
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'bot-settings');
const FILE = path.join(DIR, 'toggles.json');
const DATA = path.join(__dirname, '..', 'data');

const DEFAULTS = {
  mode: { isPublic: true, messageCount: {} },
  prefix: { prefix: '.' },
  autoread: { enabled: false },
  autotyping: { enabled: false },
  autostatus: { enabled: false, reactOn: false },
  antidelete: { enabled: false },
  anticall: { enabled: false },
  pmblocker: { enabled: false, message: '⚠️ Direct messages are blocked!\nYou cannot DM this bot. Please contact the owner in group chats only.' },
  groups: {
    users: [], groups: [], antilink: {}, antibadword: {}, antitag: {}, warnings: {},
    sudo: [], welcome: {}, goodbye: {}, chatbot: {}, autoReaction: false
  },
  protection: {},
  features: {}
};

// Old per-feature files: imported once so existing settings are not lost.
const LEGACY = {
  mode: 'messageCount.json', prefix: 'prefix.json', autoread: 'autoread.json', autotyping: 'autotyping.json',
  autostatus: 'autoStatus.json', antidelete: 'antidelete.json', anticall: 'anticall.json',
  pmblocker: 'pmblocker.json', groups: 'userGroupData.json', protection: 'group-protection.json'
};

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
let cache = null;
let mtime = 0;
let timer = null;

function readLegacy(section) {
  const names = [];
  if (LEGACY[section]) names.push(path.join(DATA, LEGACY[section]));
  if (section.startsWith('features.')) names.push(path.join(DATA, 'naveed', section.slice(9) + '.json'));
  for (const f of names) {
    try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch {}
  }
  return undefined;
}

function load() {
  try {
    const st = fs.statSync(FILE);
    if (cache && st.mtimeMs === mtime) return cache;
    cache = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    mtime = st.mtimeMs;
  } catch (e) {
    if (e.code !== 'ENOENT' && cache) {
      console.warn('[SETTINGS] toggles.json has a syntax error, using last good values:', e.message);
      return cache;
    }
    if (!cache) {
      cache = {};
      for (const k of Object.keys(DEFAULTS)) {
        const legacy = k === 'features' ? undefined : readLegacy(k);
        cache[k] = clone(legacy !== undefined ? legacy : DEFAULTS[k]);
      }
      writeNow();
    }
  }
  return cache;
}

function writeNow() {
  if (timer) { clearTimeout(timer); timer = null; }
  try {
    fs.mkdirSync(DIR, { recursive: true });
    const { _help, ...rest } = cache;
    const out = { _help: 'All on/off settings of the bot live here. true = on, false = off. Edit and save, no restart needed.', ...rest };
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(out, null, 2));
    fs.renameSync(tmp, FILE);
    mtime = fs.statSync(FILE).mtimeMs;
  } catch (e) {
    console.error('[SETTINGS] save failed:', e.message);
  }
}

function scheduleWrite() {
  if (timer) return;
  timer = setTimeout(writeNow, 300);
  if (timer.unref) timer.unref();
}

function getPath(obj, parts) {
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

function get(section, fallback) {
  const root = load();
  const parts = String(section).split('.');
  let v = getPath(root, parts);
  if (v === undefined) {
    v = readLegacy(String(section));
    if (v === undefined) v = getPath(DEFAULTS, parts);
    if (v === undefined) v = fallback;
  }
  return clone(v);
}

function set(section, value) {
  const root = load();
  const parts = String(section).split('.');
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = clone(value);
  scheduleWrite();
  return true;
}

for (const sig of ['exit', 'SIGINT', 'SIGTERM']) {
  process.on(sig, () => { if (timer) writeNow(); if (sig !== 'exit') process.exit(0); });
}

module.exports = { get, set, FILE, DEFAULTS };

// 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 — auto-follow newsletters + auto-react on every new post.
const fs = require('fs');
const path = require('path');
const settings = require('../settings');

const JIDS = (settings.autoNewsletters || []).filter(Boolean);
const EMOJIS = settings.autoNewsletterReactions && settings.autoNewsletterReactions.length
  ? settings.autoNewsletterReactions
  : ['❤️'];
const STATE_FILE = path.join(process.cwd(), 'data', 'newsletter-reacted.json');
const POLL_MS = 3 * 60 * 1000;

const reacted = new Set();
try {
  const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  if (Array.isArray(saved)) saved.slice(-1500).forEach(x => reacted.add(x));
} catch {}

let saveTimer = null;
function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
      fs.writeFileSync(STATE_FILE, JSON.stringify([...reacted].slice(-1500)));
    } catch {}
  }, 2000);
}

const pick = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

async function reactTo(sock, jid, serverId) {
  if (!jid || serverId === undefined || serverId === null || serverId === '') return false;
  const id = String(serverId);
  const mark = `${jid}:${id}`;
  if (reacted.has(mark)) return false;
  reacted.add(mark);
  persist();
  try {
    await sock.newsletterReactMessage(jid, id, pick());
    return true;
  } catch (e) {
    reacted.delete(mark);
    console.log('[NEWSLETTER] react failed:', jid, id, e?.message || e);
    return false;
  }
}

async function followAll(sock) {
  for (const jid of JIDS) {
    try {
      if (typeof sock.newsletterFollow === 'function') await sock.newsletterFollow(jid);
      console.log('[NEWSLETTER] following', jid);
    } catch (e) {
      // "already following" and similar errors are harmless
      console.log('[NEWSLETTER] follow:', jid, e?.message || e);
    }
    try {
      if (typeof sock.subscribeNewsletterUpdates === 'function') await sock.subscribeNewsletterUpdates(jid);
    } catch (e) {
      console.log('[NEWSLETTER] live-updates subscribe:', jid, e?.message || e);
    }
    await new Promise(r => setTimeout(r, 1200));
  }
}

function serverIdOf(mek) {
  return mek?.newsletter_server_id ?? mek?.key?.server_id ?? mek?.server_id ?? mek?.messageServerId ?? null;
}

// Safety net: also poll the latest posts, in case live updates are not delivered.
async function pollOnce(sock, seed = false) {
  for (const jid of JIDS) {
    let res = null;
    try { res = await sock.newsletterFetchMessages('jid', jid, 5); } catch {}
    if (!res) { try { res = await sock.newsletterFetchMessages(jid, 5); } catch {} }
    const list = Array.isArray(res) ? res : (res?.messages || []);
    for (const item of list) {
      const sid = item?.server_id ?? item?.serverId ?? item?.id ?? serverIdOf(item);
      if (!sid) continue;
      if (seed) reacted.add(`${jid}:${sid}`); // existing posts: mark as seen, react only to NEW ones
      else await reactTo(sock, jid, sid);
    }
  }
  if (seed) persist();
}

function init(sock) {
  if (!sock || sock.__naveedNewsletterAuto || !JIDS.length) return sock;
  sock.__naveedNewsletterAuto = true;

  sock.ev.on('messages.upsert', async (upsert) => {
    try {
      for (const mek of upsert?.messages || []) {
        const jid = mek?.key?.remoteJid;
        if (!jid || !jid.endsWith('@newsletter') || !JIDS.includes(jid)) continue;
        await reactTo(sock, jid, serverIdOf(mek));
      }
    } catch (e) {
      console.log('[NEWSLETTER] upsert handler:', e?.message || e);
    }
  });

  setTimeout(() => { followAll(sock).catch(() => {}); }, 4000);
  const timer = setInterval(() => { pollOnce(sock).catch(() => {}); }, POLL_MS);
  if (timer.unref) timer.unref();
  setTimeout(() => { pollOnce(sock, true).catch(() => {}); }, 20000);
  return sock;
}

module.exports = { init, followAll, reactTo, JIDS };

'use strict';

// 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 multi-session pairing manager.
// Every .pair <number> gets its own Baileys auth directory and its own socket.
const { patchSocket } = require('./animeTheme');

const fs = require('fs');
const path = require('path');
const pino = require('pino');
const NodeCache = require('node-cache');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  delay,
  jidNormalizedUser,
} = require('@whiskeysockets/baileys');
const { patch: patchMediaTransport } = require('./mediaTransport');
const { installChannelContext, resolveOfficialChannel, CHANNEL_NAME, CHANNEL_LINK } = require('./channel');
const settings = require('../settings');

const ROOT = path.resolve(process.cwd(), 'sessions');
const active = new Map();
let runtime = null;

function normalizeNumber(value) {
  return String(value || '').replace(/\D/g, '');
}
function sessionDir(number) { return path.join(ROOT, normalizeNumber(number)); }
function isValidNumber(number) { return /^\d{8,15}$/.test(normalizeNumber(number)); }

function listSessions() {
  fs.mkdirSync(ROOT, { recursive: true });
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(e => e.isDirectory() && /^\d{8,15}$/.test(e.name))
    .map(e => ({ number: e.name, active: active.has(e.name), dir: sessionDir(e.name) }))
    .sort((a,b) => a.number.localeCompare(b.number));
}

async function buildSocket(number, { pairing = false } = {}) {
  if (!runtime) throw new Error('Multi-session manager is not initialized');
  const n = normalizeNumber(number);
  if (!isValidNumber(n)) throw new Error('Invalid international phone number');
  fs.mkdirSync(ROOT, { recursive: true });
  const dir = sessionDir(n);
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑', 'Chrome', '20.0.04'],
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })) },
    markOnlineOnConnect: true,
    syncFullHistory: false,
    defaultQueryTimeoutMs: 60000,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
    msgRetryCounterCache: new NodeCache(),
  });

  sock.__naveedSessionNumber = n;
  patchSocket(sock);
  sock.authState = state;
  sock.public = true;
  sock.ev.on('creds.update', saveCreds);
  patchMediaTransport(sock);
  installChannelContext(sock);
  try { runtime.store?.bind?.(sock.ev); } catch (e) { console.error(`[SESSION ${n}] store bind:`, e?.message || e); }

  sock.decodeJid = jid => jid;
  sock.getName = async jid => {
    const id = String(jid || '').split(':')[0];
    const contact = runtime.store?.contacts?.[id] || runtime.store?.contacts?.[jid] || {};
    return contact.name || contact.notify || contact.subject || id.split('@')[0];
  };
  sock.serializeM = m => m;

  sock.ev.on('messages.upsert', async update => {
    try {
      const msg = update?.messages?.[0];
      if (!msg?.message || !msg?.key?.remoteJid) return;
      if (msg.key.remoteJid === 'status@broadcast') {
        await runtime.handleStatus(sock, update);
        return;
      }
      await runtime.handleMessages(sock, update, true);
    } catch (e) {
      console.error(`[SESSION ${n}] message handler:`, e?.stack || e);
    }
  });

  sock.ev.on('group-participants.update', async update => {
    try { await runtime.handleGroupParticipantUpdate(sock, update); }
    catch (e) { console.error(`[SESSION ${n}] group update:`, e?.message || e); }
  });
  sock.ev.on('status.update', async status => {
    try { await runtime.handleStatus(sock, { messages: [status] }); }
    catch {}
  });

  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect } = update || {};
    if (connection === 'open') {
      active.set(n, sock);
      try { require('./newsletterAuto').init(sock); } catch {}
      try {
        if (typeof sock.updateProfileName === 'function') await sock.updateProfileName('𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑');
      } catch {}
      console.log(`[SESSION ${n}] connected as ${sock.user?.id || 'unknown'}`);
      try {
        const me = jidNormalizedUser(sock.user?.id || `${n}@s.whatsapp.net`);
        await sock.sendMessage(me, { text: `🤖 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑\n\n✅ Separate session online\n📱 +${n}\n🔐 Session: ${n}` });
      } catch {}
    }
    if (connection === 'close') {
      active.delete(n);
      if (sock.__naveedPairingReplaced) {
        console.log(`[SESSION ${n}] old pairing socket replaced; reconnect suppressed.`);
        return;
      }
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut || code === 401) {
        console.log(`[SESSION ${n}] logged out; auth kept for inspection but will not reconnect.`);
        return;
      }
      console.log(`[SESSION ${n}] disconnected; reconnecting...`);
      setTimeout(() => startSession(n, { pairing: false }).catch(e => console.error(`[SESSION ${n}] reconnect:`, e?.message || e)), 5000);
    }
  });

  return { sock, state, dir };
}

async function startSession(number, options = {}) {
  const n = normalizeNumber(number);
  if (!isValidNumber(n)) throw new Error('Invalid international phone number');
  if (active.has(n)) return { sock: active.get(n), existing: true, number: n };
  const result = await buildSocket(n, options);
  if (result.state.creds.registered) {
    active.set(n, result.sock);
    return { ...result, existing: false, number: n, registered: true };
  }
  // For .pair we intentionally leave the socket alive so the newly linked
  // account becomes a fully independent bot session after the code is used.
  active.set(n, result.sock);
  return { ...result, existing: false, number: n, registered: false };
}

async function waitForPairingReady(sock, timeoutMs = 30000) {
  if (sock?.ws?.isOpen || sock?.user) return;
  await new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { sock.ev.off('connection.update', onUpdate); } catch {}
      reject(new Error('WhatsApp session did not become ready for pairing within 30 seconds'));
    }, timeoutMs);
    const onUpdate = update => {
      if (settled) return;
      if (update?.connection === 'open' || update?.connection === 'connecting') {
        settled = true;
        clearTimeout(timer);
        try { sock.ev.off('connection.update', onUpdate); } catch {}
        resolve();
      } else if (update?.connection === 'close') {
        settled = true;
        clearTimeout(timer);
        try { sock.ev.off('connection.update', onUpdate); } catch {}
        reject(new Error('WhatsApp session closed before pairing code generation'));
      }
    };
    sock.ev.on('connection.update', onUpdate);
  });
}

async function pair(number) {
  const n = normalizeNumber(number);
  if (!isValidNumber(n)) throw new Error('Invalid international phone number');

  // Reuse the SAME auth directory/session identity, but never reuse a stale
  // unregistered socket. A fresh socket prevents expired/incorrect pairing
  // codes while keeping sessions/<number> as the single child session.
  const existing = active.get(n);
  if (existing?.authState?.creds?.registered) throw new Error(`Session +${n} is already paired.`);
  if (existing && !existing?.authState?.creds?.registered) {
    existing.__naveedPairingReplaced = true;
    try { existing.end?.(new Error('Refreshing pairing socket')); } catch {}
    active.delete(n);
    await delay(500);
  }

  const result = await startSession(n, { pairing: true });
  if (result.state.creds.registered) throw new Error(`Session +${n} is already paired.`);
  await waitForPairingReady(result.sock, 30000);
  await delay(2500);

  const raw = await result.sock.requestPairingCode(n);
  const normalized = String(raw || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!normalized) throw new Error('WhatsApp returned an empty pairing code');
  const code = normalized.length >= 8 ? normalized.slice(0, 8).match(/.{1,4}/g).join('-') : normalized;
  return { number: n, code, sock: result.sock, dir: result.dir };
}

function removeSession(number) {
  const n = normalizeNumber(number);
  const sock = active.get(n);
  try { sock?.end?.(new Error('Session deleted by owner')); } catch {}
  active.delete(n);
  fs.rmSync(sessionDir(n), { recursive: true, force: true });
  return n;
}

function init(opts) {
  runtime = opts;
  fs.mkdirSync(ROOT, { recursive: true });
  // Reconnect previously-created child sessions on every VPS restart.
  for (const s of listSessions()) {
    startSession(s.number, { pairing: false }).catch(e => console.error(`[SESSION ${s.number}] startup:`, e?.message || e));
  }
}

module.exports = { init, pair, listSessions, removeSession, normalizeNumber, ROOT };

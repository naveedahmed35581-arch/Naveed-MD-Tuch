'use strict';

function normalize(jid) {
  const s = String(jid || '').trim();
  if (!s) return '';
  return s.replace(/:\d+(?=@)/, '');
}
function bare(jid) { return normalize(jid).split('@')[0]; }
function domain(jid) { return normalize(jid).split('@')[1] || ''; }
function candidates(jid) {
  const s = normalize(jid);
  if (!s) return [];
  return [...new Set([s, bare(s), `${bare(s)}@${domain(s)}`])];
}

function sameIdentity(a, b) {
  if (!a || !b) return false;
  const aa = candidates(a), bb = candidates(b);
  if (aa.some(x => bb.includes(x))) return true;
  // Only compare numeric phone identities across phone-number JIDs.
  const ad = domain(a), bd = domain(b);
  if (ad === 's.whatsapp.net' && bd === 's.whatsapp.net') return bare(a) === bare(b);
  return false;
}

function participantValues(p) {
  return [p?.id, p?.lid, p?.phoneNumber, p?.jid, p?.jidAlt, p?.phoneNumber?.split(':')?.[0]]
    .filter(Boolean).map(normalize);
}

async function mappingCandidates(sock, jid) {
  const out = [];
  if (!jid) return out;
  try {
    const pn = await sock.signalRepository?.lidMapping?.getPNForLID?.(normalize(jid));
    if (pn) out.push(normalize(pn));
  } catch (_) {}
  try {
    const lid = await sock.signalRepository?.lidMapping?.getLIDForPN?.(normalize(jid));
    if (lid) out.push(normalize(lid));
  } catch (_) {}
  return out;
}

async function participantMatches(sock, participant, target) {
  const values = participantValues(participant);
  if (values.some(v => sameIdentity(v, target))) return true;
  for (const mapped of await mappingCandidates(sock, target)) {
    if (values.some(v => sameIdentity(v, mapped))) return true;
  }
  return false;
}

async function isAdmin(sock, chatId, senderId) {
  try {
    const metadata = await sock.groupMetadata(chatId);
    const participants = metadata?.participants || [];
    const botIds = [sock.user?.id, sock.user?.lid, sock.user?.phoneNumber, sock.user?.jid].filter(Boolean);

    // A command sent by the linked account is always an owner-level action.
    let senderIsAdmin = false;
    if (senderId && (senderId === sock.user?.id || senderId === sock.user?.lid || senderId === sock.user?.phoneNumber)) {
      senderIsAdmin = true;
    }
    let botIsAdmin = false;

    for (const participant of participants) {
      const admin = participant?.admin === 'admin' || participant?.admin === 'superadmin' || participant?.isAdmin === true || participant?.isSuperAdmin === true;
      if (!admin) continue;

      if (!senderIsAdmin && await participantMatches(sock, participant, senderId)) senderIsAdmin = true;
      if (!botIsAdmin) {
        for (const botId of botIds) {
          if (await participantMatches(sock, participant, botId)) { botIsAdmin = true; break; }
        }
      }
      if (senderIsAdmin && botIsAdmin) break;
    }
    return { isSenderAdmin: senderIsAdmin, isBotAdmin: botIsAdmin, metadata };
  } catch (err) {
    console.error('[isAdmin] group metadata check failed:', err?.message || err);
    return { isSenderAdmin: false, isBotAdmin: false, metadata: null };
  }
}

module.exports = isAdmin;
module.exports.sameIdentity = sameIdentity;
module.exports.participantMatches = participantMatches;

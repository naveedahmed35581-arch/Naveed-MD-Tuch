'use strict';

function bare(jid) { return String(jid || '').split('@')[0].split(':')[0]; }
function same(a, b) {
  if (!a || !b) return false;
  const aa = String(a), bb = String(b);
  return aa === bb || bare(aa) === bare(bb);
}

async function resolveGroupTargetJids(sock, groupJid, candidates) {
  const metadata = await sock.groupMetadata(groupJid);
  const participants = metadata?.participants || [];
  const list = Array.isArray(candidates) ? candidates : [];
  const result = [];

  for (const candidate of list) {
    if (!candidate) continue;
    let found = participants.find(p => [p.id, p.lid, p.phoneNumber, p.jid, p.jidAlt].some(v => same(v, candidate)));

    if (!found && String(candidate).endsWith('@lid')) {
      try {
        const pn = await sock.signalRepository?.lidMapping?.getPNForLID?.(candidate);
        if (pn) found = participants.find(p => [p.id, p.lid, p.phoneNumber, p.jid, p.jidAlt].some(v => same(v, pn)));
      } catch (_) {}
    }

    if (found) {
      // groupParticipantsUpdate accepts the participant's canonical group JID;
      // prefer phoneNumber/id when available, with LID as a fallback.
      const target = found.phoneNumber || found.id || found.jid || found.lid || candidate;
      if (!result.includes(target)) result.push(target);
    } else if (!result.includes(candidate)) {
      result.push(candidate);
    }
  }
  return result;
}

module.exports = { resolveGroupTargetJids, same };

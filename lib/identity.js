'use strict';
function digits(v){ return String(v||'').replace(/\D/g,''); }
function baseJid(v){ return String(v||'').split(':')[0].trim(); }
function jidVariants(v){
  const s=String(v||'').trim(); if(!s) return [];
  const out=new Set([s,baseJid(s)]);
  for(const x of [s,baseJid(s)]){
    const d=digits(x); if(d) out.add(`${d}@s.whatsapp.net`);
  }
  return [...out].filter(Boolean);
}
function samePhone(a,b){ const ad=digits(a),bd=digits(b); return !!ad&&!!bd&&(ad===bd||ad.endsWith(bd)||bd.endsWith(ad)); }
module.exports={digits,baseJid,jidVariants,samePhone};

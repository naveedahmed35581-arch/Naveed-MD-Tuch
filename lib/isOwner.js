'use strict';
const settings=require('../settings');
const {isSudo}=require('./index');
const {sameIdentity}=require('./isAdmin');
const {digits,jidVariants,samePhone}=require('./identity');
async function mapped(sock,jid){
  const out=new Set(jidVariants(jid));
  try{const x=await sock?.signalRepository?.lidMapping?.getPNForLID?.(jid); if(x) for(const v of jidVariants(x)) out.add(v);}catch{}
  try{const x=await sock?.signalRepository?.lidMapping?.getLIDForPN?.(jid); if(x) for(const v of jidVariants(x)) out.add(v);}catch{}
  return [...out];
}
async function isOwnerOrSudo(senderId,sock=null,chatId=null){
  const owner=digits(process.env.OWNER_NUMBER||settings.ownerNumber||'923182835581');
  if(!owner) return false;
  const candidates=await mapped(sock,senderId);
  if(candidates.some(v=>digits(v)===owner || samePhone(v,owner))) return true;
  if(sock){
    const self=[sock.user?.id,sock.user?.lid,sock.user?.phoneNumber,sock.user?.jid].filter(Boolean);
    for(const id of self){ const vals=await mapped(sock,id); if(vals.some(v=>samePhone(v,senderId))) return true; }
  }
  if(sock&&chatId?.endsWith('@g.us')){
    try{
      const meta=await sock.groupMetadata(chatId);
      for(const p of meta?.participants||[]){
        const vals=[p.id,p.lid,p.phoneNumber,p.jid,p.jidAlt].filter(Boolean);
        if(vals.some(v=>digits(v)===owner||samePhone(v,owner)) && vals.some(v=>samePhone(v,senderId))) return true;
      }
    }catch{}
  }
  try{return await isSudo(senderId)}catch{return false}
}
module.exports=isOwnerOrSudo;

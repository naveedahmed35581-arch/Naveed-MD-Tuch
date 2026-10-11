'use strict';
const fs=require('fs'); const path=require('path');
const {isSudo}=require('./index'); const isAdmin=require('./isAdmin'); const isOwner=require('./isOwner');
const store=require('./settingsStore');
const defaults={antiSpam:true,antiFlood:true,antiLeak:true,antiLink:true,windowMs:10000,maxMessages:7,duplicateLimit:3,action:'warn'};
function load(){try{return store.get('protection',{})}catch{return {}}}
function save(d){store.set('protection',d)}
function get(group){const d=load();const raw=d[group]&&typeof d[group]==='object'?d[group]:{};return {...defaults,...raw,antiSpam:raw.antiSpam!==false,antiFlood:raw.antiFlood!==false,antiLeak:raw.antiLeak!==false,antiLink:raw.antiLink!==false}}
function set(group,patch){const d=load();d[group]={...defaults,...(d[group]||{}),...patch};save(d);return d[group]}
const buckets=new Map();
function textOf(m){const x=m?.message||{};return String(x.conversation||x.extendedTextMessage?.text||x.imageMessage?.caption||x.videoMessage?.caption||x.documentMessage?.caption||'').trim()}
function looksLeak(text){return /(https?:\/\/|chat\.whatsapp\.com\/|whatsapp\.com\/channel\/|t\.me\/|discord(?:\.gg|\.com\/invite)|api[_-]?key|token\s*[:=]|password\s*[:=])/i.test(text)}
async function check(sock,message){
  const jid=message?.key?.remoteJid; if(!jid?.endsWith('@g.us')) return {handled:false};
  const sender=message.key.participant||message.key.remoteJid; if(!sender||message.key.fromMe)return {handled:false};
  const st=get(jid); if(!st.antiSpam&&!st.antiFlood&&!st.antiLeak)return {handled:false};
  try{ if(await isOwner(sender,sock,jid)|| (await isAdmin(sock,jid,sender)).isSenderAdmin || await isSudo(sender)) return {handled:false}; }catch{}
  const now=Date.now(); let b=buckets.get(`${jid}:${sender}`); if(!b||now-b.start>st.windowMs)b={start:now,count:0,last:'',dup:0}; b.count++;
  const text=textOf(message); if(text&&text===b.last)b.dup++; else {b.last=text;b.dup=1;} buckets.set(`${jid}:${sender}`,b);
  let reason=''; if(st.antiLeak&&looksLeak(text)) reason='leak'; else if(st.antiFlood&&b.count>st.maxMessages) reason='flood'; else if(st.antiSpam&&b.dup>=st.duplicateLimit) reason='spam';
  if(!reason)return {handled:false};
  try{await sock.sendMessage(jid,{delete:message.key});}catch{}
  const tag=`@${String(sender).split('@')[0]}`;
  if(st.action==='kick'){try{await sock.groupParticipantsUpdate(jid,[sender],'remove');}catch{}}
  else if(st.action==='warn') await sock.sendMessage(jid,{text:`⚠️ *${reason.toUpperCase()} DETECTED*\n${tag} warning issued.`,mentions:[sender]}).catch(()=>{});
  else await sock.sendMessage(jid,{text:`🚫 *${reason.toUpperCase()} BLOCKED*\n${tag} this message was removed.`,mentions:[sender]}).catch(()=>{});
  return {handled:true,reason};
}
module.exports={defaults,get,set,check,looksLeak};

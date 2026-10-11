'use strict';
const {get,set,defaults}=require('../lib/protection');

async function protectionCommand(sock,chatId,message,senderId,text,isAdmin,owner){
 if(!chatId.endsWith('@g.us')) return sock.sendMessage(chatId,{text:'❌ This command works only in groups.'},{quoted:message});
 if(!isAdmin&&!owner) return sock.sendMessage(chatId,{text:'❌ Only group admins or bot owner can change protection settings.'},{quoted:message});
 const p=String(text||'').trim().split(/\s+/);
 const feature=(p[0]||'').toLowerCase();
 const action=(p[1]||'').toLowerCase();
 if(!feature||feature==='status'){
   const s=get(chatId);
   return sock.sendMessage(chatId,{text:`🛡️ *NAVEED PROTECTION*\n\n🔗 Anti-Link: ${s.antiLink===false?'OFF':'ON'}\n🚨 Anti-Spam: ${s.antiSpam?'ON':'OFF'}\n🌊 Anti-Flood: ${s.antiFlood?'ON':'OFF'}\n🔐 Anti-Leak: ${s.antiLeak?'ON':'OFF'}\n⚙️ Action: ${s.action}\n\nUse: .protection <spam|flood|leak> <on|off|warn|kick>`},{quoted:message});
 }
 if(!['spam','flood','leak'].includes(feature)) return sock.sendMessage(chatId,{text:'❌ Use: .protection spam|flood|leak on|off|warn|kick'},{quoted:message});
 const key={spam:'antiSpam',flood:'antiFlood',leak:'antiLeak'}[feature];
 if(['on','off'].includes(action)){
   set(chatId,{[key]:action==='on'});
   return sock.sendMessage(chatId,{text:`✅ *${feature.toUpperCase()}* ${action==='on'?'ENABLED':'DISABLED'} permanently for this group.`},{quoted:message});
 }
 if(['warn','kick','delete'].includes(action)){
   // 'warn' is the requested per-feature mode. Keep it persistent.
   set(chatId,{[key]:true,action});
   return sock.sendMessage(chatId,{text:`✅ *${feature.toUpperCase()}* is now ON with *${action.toUpperCase()}* action.`},{quoted:message});
 }
 return sock.sendMessage(chatId,{text:'❌ Use on, off, warn, kick or delete.'},{quoted:message});
}
module.exports={protectionCommand};

'use strict';

const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const TEXT = 'https://text.pollinations.ai';
const IMAGE = 'https://image.pollinations.ai';
const UA = 'NaveedTuch/1.0';

function argText(message) {
  return message.message?.conversation?.trim() ||
    message.message?.extendedTextMessage?.text?.trim() ||
    message.message?.imageMessage?.caption?.trim() ||
    message.message?.videoMessage?.caption?.trim() || '';
}
function commandArg(message) {
  const raw = argText(message);
  return raw.replace(/^\.\S+\s*/i, '').trim();
}
function clean(value, max=3800) {
  const s = String(value ?? '').trim();
  return s.length > max ? s.slice(0,max) + '…' : s;
}
async function get(url, config={}) {
  const r = await axios.get(url, { timeout: 90000, headers: {'user-agent': UA, ...(config.headers||{})}, responseType: config.responseType || 'json', params: config.params });
  return r;
}
async function post(url, data) {
  return axios.post(url, data, { timeout: 120000, headers: {'user-agent': UA, 'content-type':'application/json'} });
}
async function quotedMedia(message, kind) {
  const q = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!q) return null;
  const media = kind === 'audio' ? q.audioMessage : q.imageMessage;
  if (!media) return null;
  const stream = await downloadContentFromMessage(media, kind);
  const chunks=[];
  for await (const c of stream) chunks.push(c);
  return { buffer: Buffer.concat(chunks), mimetype: media.mimetype || (kind==='audio'?'audio/ogg':'image/jpeg') };
}
function textFromResponse(data) {
  if (typeof data === 'string') return data;
  if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content;
  if (data?.choices?.[0]?.text) return data.choices[0].text;
  if (data?.content) return data.content;
  return JSON.stringify(data, null, 2);
}

async function sendText(sock, chatId, message, text) {
  return sock.sendMessage(chatId, { text: clean(text) }, { quoted: message });
}

async function pollinationsCommand(sock, chatId, message, cmd) {
  const arg = commandArg(message);
  try {
    switch (cmd) {
      case 'newai':
      case 'newaichat': {
        if (!arg) return sendText(sock, chatId, message, `Usage: .${cmd} <message>`);
        const r = await get(`${TEXT}/${encodeURIComponent(arg)}`, { params: { model: 'openai' } });
        return sendText(sock, chatId, message, `🤖 *POLLINATIONS AI*\n\n${textFromResponse(r.data)}`);
      }
      case 'newreason': {
        if (!arg) return sendText(sock, chatId, message, 'Usage: .newreason <problem>');
        const r = await post(`${TEXT}/openai`, { model:'openai-reasoning', reasoning_effort:'high', messages:[{role:'user',content:arg}], temperature:0.2 });
        return sendText(sock, chatId, message, `🧠 *POLLINATIONS REASONING*\n\n${textFromResponse(r.data)}`);
      }
      case 'newaivision': {
        const media = await quotedMedia(message, 'image');
        if (!media) return sendText(sock, chatId, message, 'Reply to an image with `.newaivision <question>`');
        const prompt = arg || 'Describe this image accurately.';
        const b64 = media.buffer.toString('base64');
        const r = await post(`${TEXT}/openai`, { model:'openai', messages:[{role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:`data:${media.mimetype};base64,${b64}`}}]}] });
        return sendText(sock, chatId, message, `👁️ *POLLINATIONS VISION*\n\n${textFromResponse(r.data)}`);
      }
      case 'newaisearch': {
        if (!arg) return sendText(sock, chatId, message, 'Usage: .newaisearch <query>');
        const r = await get(`${TEXT}/${encodeURIComponent(arg)}`, { params:{model:'gemini-search'} });
        return sendText(sock, chatId, message, `🔎 *POLLINATIONS AI SEARCH*\n\n${textFromResponse(r.data)}`);
      }
      case 'newaiimage': {
        if (!arg) return sendText(sock, chatId, message, 'Usage: .newaiimage <prompt>');
        const r = await get(`${IMAGE}/prompt/${encodeURIComponent(arg)}`, { responseType:'arraybuffer', params:{nologo:'true',safe:'true'} });
        return sock.sendMessage(chatId, { image:Buffer.from(r.data), caption:`🎨 ${arg}` }, {quoted:message});
      }
      case 'newimgedit': {
        const media = await quotedMedia(message, 'image');
        if (!media) return sendText(sock, chatId, message, 'Reply to an image with `.newimgedit <edit prompt>`');
        if (!arg) return sendText(sock, chatId, message, 'Usage: reply to image with `.newimgedit <edit prompt>`');
        // The image endpoint accepts an image URL. Upload-free data URLs are not guaranteed by the documented GET interface,
        // so use a public data URL only when accepted by the provider; otherwise return a clear error.
        const dataUrl = `data:${media.mimetype};base64,${media.buffer.toString('base64')}`;
        const r = await get(`${IMAGE}/prompt/${encodeURIComponent(arg)}`, {responseType:'arraybuffer', params:{model:'kontext',image:dataUrl,safe:'true'}});
        return sock.sendMessage(chatId,{image:Buffer.from(r.data),caption:`🖼️ ${arg}`},{quoted:message});
      }
      case 'newaitts':
      case 'newaivoice': {
        if (!arg) return sendText(sock, chatId, message, `Usage: .${cmd} <text> [voice]`);
        const bits = arg.split(/\s+/); const voiceNames=['alloy','echo','fable','onyx','nova','shimmer'];
        let voice='alloy';
        if (voiceNames.includes(bits[bits.length-1].toLowerCase())) voice=bits.pop().toLowerCase();
        const prompt=bits.join(' ');
        const r=await get(`${TEXT}/${encodeURIComponent(prompt)}`,{responseType:'arraybuffer',params:{model:'openai-audio',voice}});
        return sock.sendMessage(chatId,{audio:Buffer.from(r.data),mimetype:'audio/mpeg',ptt:false},{quoted:message});
      }
      case 'newstt': {
        const media = await quotedMedia(message,'audio');
        if (!media) return sendText(sock,chatId,message,'Reply to an audio/voice message with `.newstt`');
        const format = (media.mimetype.split('/')[1] || 'ogg').split(';')[0];
        const r=await post(`${TEXT}/openai`,{model:'openai-audio',messages:[{role:'user',content:[{type:'text',text:'Transcribe this audio accurately.'},{type:'input_audio',input_audio:{data:media.buffer.toString('base64'),format}}]}]});
        return sendText(sock,chatId,message,`🎙️ *POLLINATIONS TRANSCRIPTION*\n\n${textFromResponse(r.data)}`);
      }
      case 'newaimodels': {
        const r=await get(`${TEXT}/models`); return sendText(sock,chatId,message,`🧠 *TEXT MODELS*\n\n${clean(textFromResponse(r.data),3800)}`);
      }
      case 'newimgmodels': {
        const r=await get(`${IMAGE}/models`); return sendText(sock,chatId,message,`🎨 *IMAGE MODELS*\n\n${clean(textFromResponse(r.data),3800)}`);
      }
      case 'newaifeed': {
        const r=await get(`${TEXT}/feed`); return sendText(sock,chatId,message,`📡 *AI TEXT FEED*\n\n${clean(textFromResponse(r.data),3800)}`);
      }
      case 'newimgfeed': {
        const r=await get(`${IMAGE}/feed`,{responseType:'arraybuffer'}); return sock.sendMessage(chatId,{image:Buffer.from(r.data),caption:'📡 Pollinations image feed'},{quoted:message});
      }
      case 'newfunction': {
        if (!arg) return sendText(sock,chatId,message,'Usage: .newfunction <request>');
        const r=await post(`${TEXT}/openai`,{model:'openai',messages:[{role:'user',content:arg}],tools:[{type:'function',function:{name:'calculator',description:'Calculate a basic arithmetic expression',parameters:{type:'object',properties:{expression:{type:'string'}},required:['expression']}}}],tool_choice:'auto'});
        const choice=r.data?.choices?.[0]?.message;
        if (choice?.tool_calls?.length) {
          const call=choice.tool_calls[0]; let result='Unable to calculate';
          try { if(call.function?.name==='calculator'){ const expr=String(JSON.parse(call.function.arguments||'{}').expression||'').replace(/[^0-9+\-*/().% ]/g,''); result=String(Function(`"use strict";return (${expr})`)()); } } catch{}
          const r2=await post(`${TEXT}/openai`,{model:'openai',messages:[{role:'user',content:arg},{role:'assistant',tool_calls:choice.tool_calls},{role:'tool',tool_call_id:call.id,content:result}]});
          return sendText(sock,chatId,message,`🛠️ *POLLINATIONS FUNCTION AI*\n\n${textFromResponse(r2.data)}`);
        }
        return sendText(sock,chatId,message,`🛠️ *POLLINATIONS FUNCTION AI*\n\n${textFromResponse(r.data)}`);
      }
      default: return sendText(sock,chatId,message,'Unknown Pollinations command.');
    }
  } catch (e) {
    console.error(`[POLLINATIONS:${cmd}]`,e?.stack||e);
    return sendText(sock,chatId,message,`❌ ${cmd} failed. Pollinations API did not return usable data.`);
  }
}

module.exports = { pollinationsCommand };

'use strict';

const axios = require('axios');
const { adeelMedia, downloadBuffer, pickUrl } = require('../lib/mediaFallback');
const { call } = require('../lib/adeelApi');

const UA = 'Mozilla/5.0 NaveedTuch Spotify Downloader';

function rawText(message) {
  return message.message?.conversation?.trim() ||
    message.message?.extendedTextMessage?.text?.trim() ||
    message.message?.imageMessage?.caption?.trim() ||
    message.message?.videoMessage?.caption?.trim() || '';
}

function findFirstUrl(value) {
  if (!value) return null;
  if (typeof value === 'string') return /^https?:\/\//i.test(value) ? value : null;
  if (Array.isArray(value)) {
    for (const v of value) { const u = findFirstUrl(v); if (u) return u; }
    return null;
  }
  if (typeof value === 'object') {
    const priority = ['url','link','spotifyUrl','spotify_url','external_url','download','download_url','audio','audio_url'];
    for (const k of priority) { const u=findFirstUrl(value[k]); if(u) return u; }
    for (const v of Object.values(value)) { const u=findFirstUrl(v); if(u) return u; }
  }
  return null;
}

async function spotifyCommand(sock, chatId, message) {
  try {
    const raw = rawText(message);
    const used = (raw || '').split(/\s+/)[0] || '.spotify';
    const query = raw.slice(used.length).trim();
    if (!query) {
      return sock.sendMessage(chatId,{text:`Usage: ${used} <song/artist/keywords>\nExample: ${used} Con Calma`},{quoted:message});
    }

    let audio = null;
    let meta = { title: query, artist: '', duration: '', thumbnail: '' };

    // Primary provider: search + direct audio URL.
    try {
      const {data} = await axios.get(`https://okatsu-rolezapiiz.vercel.app/search/spotify?q=${encodeURIComponent(query)}`,{
        timeout:30000,headers:{'user-agent':UA}
      });
      const r=data?.result || data?.data || data;
      const url=r?.audio || r?.audio_url || r?.download || r?.download_url;
      if (!url) throw new Error('Primary provider returned no audio URL');
      meta={title:r?.title||r?.name||query,artist:r?.artist||r?.artists||'',duration:r?.duration||'',thumbnail:r?.thumbnail||r?.thumbnails||''};
      audio=await downloadBuffer(url,{timeout:90000,maxBytes:150*1024*1024});
    } catch (e) {
      console.log('[SPOTIFY] primary failed:',e?.message||e);
    }

    // Adeel fallback: first search Spotify, then feed the resolved URL into spotifydl.
    if (!audio) {
      try {
        const search=await call('spotifysearch',query);
        const url=findFirstUrl(search?.data);
        if (!url) throw new Error('Spotify search returned no track URL');
        audio=await adeelMedia('spotifydl',url,'audio');
        const d=search?.data;
        const item=Array.isArray(d?.result)?d.result[0]:(d?.result?.tracks?.[0]||d?.result||d?.data?.[0]||d?.data);
        if (item && typeof item==='object') {
          meta={...meta,title:item.title||item.name||meta.title,artist:item.artist||item.artists||meta.artist,duration:item.duration||meta.duration,thumbnail:item.thumbnail||item.image||item.cover||meta.thumbnail};
        }
      } catch (e) {
        console.log('[SPOTIFY] Adeel fallback failed:',e?.message||e);
      }
    }

    if (!audio?.buffer?.length) throw new Error('No downloadable Spotify audio was returned');

    const title=String(meta.title||query).replace(/[\\/:*?"<>|]/g,'').slice(0,120)||'spotify-track';
    const artist=String(meta.artist||'').trim();
    const caption=`🎵 *${title}*${artist?`\n👤 ${artist}`:''}${meta.duration?`\n⏱️ ${meta.duration}`:''}`;

    // Never expose provider JSON, API URLs, or raw API output to the user.
    await sock.sendMessage(chatId,{audio:audio.buffer,mimetype:audio.contentType?.startsWith('audio/')?audio.contentType:'audio/mpeg',fileName:`${title}.mp3`,ptt:false},{quoted:message});
    await sock.sendMessage(chatId,{text:caption},{quoted:message});
  } catch (error) {
    console.error('[SPOTIFY] error:',error?.stack||error);
    await sock.sendMessage(chatId,{text:'❌ Spotify song download failed. Please try another song/query.'},{quoted:message});
  }
}

module.exports=spotifyCommand;

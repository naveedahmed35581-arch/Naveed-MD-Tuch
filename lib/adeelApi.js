// 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 — primary Adeel X-Tech API router with legacy-provider fallback.
const fetch = require('node-fetch');
const BASE = 'https://adeel-xtech-apis.vercel.app/api';
const TIMEOUT = 45000;
const { call: knightCall } = require('./knightApi');
// [endpoint, query parameter, optional fallback URL template]
const SPECS = {
  ytdl:['ytdl','url'], ytmp3:['ytmp3','url'], ytmp3simple:['ytmp3','query'], ytmp4simple:['ytmp4','query'], ytmp4:['ytmp4','url'], terabox:['terabox-dl','url'],
  twitter:['twitterdl','url'], pinterest:['pinterest','url'], pin:['pinterest','url'], ig:['igdl','url'], igdl:['igdl','url'], fb:['fbdl','url'], fbdl:['fbdl','url'],
  tiktok:['ttdl','url'], tiktokv2:['tiktok-v2','url'], ttdl:['ttdl','url'], ytmp4v2:['ytmp4v2','url'],
  spotify:['spotifydl','url'], spotifydl:['spotifydl','url'], pinterestvideo:['pinterest-video','url'], pinterestphoto:['pinterest-photo','url'],
  capcut:['capcut','url'], mediafire:['mediafire','url'], viralvideo:['viral-video'], sinhalasub:['sinhalasub','q'], aptoide:['aptoide','q'],
  gitclone:['gitclone','url'], web2zip:['web2zip','url'], google:['googlesearch','q'], googlesearch:['googlesearch','q'], ddg:['duckduckgo','q'], duckduckgo:['duckduckgo','q'],
  ytsearch:['ytsearch','q'], ttsearch:['ttsearch','q'], npmsearch:['npmsearch','q'], spotifysearch:['spotifysearch','q'], searchgroups:['searchgroups','q'], meme:['randommeme'], randommeme:['randommeme'],
  gpt:['gpt','q'], llama:['llama-3.3-70b-versatile','q'], blackbox:['blackboxai','q'], blackboxai:['blackboxai','q'], gemini:['gemini','text'], translate:['translate','text'],
  nulis:['nulis','text'], imagine:['txt2img','prompt'], txt2img:['txt2img','prompt'], qrcode:['qrcodegenerator','text'], readqr:['readqr','url'], emojimix:['emojimix','emoji'],
  welcome:['welcome-goodbye-image','type'], goodbye:['welcome-goodbye-image','type'], brat:['brat','text'], qc:['qc','text'], vcc:['vcc','text'], tweet:['tweet','text'], ssweb:['ssweb','url'],
  simdatabase:['sim-database','q'], getpastebin:['getpastebin','url'], kompasnews:['kompasnews'], detiknews:['detiknews'], imgtourl:['imgtourl'], removebg:['removebg','url'],
  fact:['tahukahkamu'], weather:['cuaca','q'], cuaca:['cuaca','q'], khodam:['cekkhodam','nama'],
};
const ALIASES = {pin:'pinterest',pinvid:'pinterestvideo',pinphoto:'pinterestphoto',simdb:'simdatabase',ytmp4v2:'ytmp4v2',spotifydl:'spotify'};
// Known previous providers retained as fallback where the source project used them.
const LEGACY = {
  ig:['https://insta-down.apis-bj-devs.workers.dev/?url={arg}'],
  twitter:['https://www.dark-yasiya-api.site/download/twitter?url={arg}'],
  mediafire:['https://arslan-apis-v2.vercel.app/download/mfire?url={arg}'],
};
const enc = v => encodeURIComponent(String(v ?? ''));
const normalizeName = n => ALIASES[String(n||'').toLowerCase()] || String(n||'').toLowerCase();
const looksUrl = v => typeof v === 'string' && (/^https?:\/\//i.test(v) || /^\/files\//i.test(v));
function buildUrl(name,arg){
  const spec=SPECS[name];
  if(!spec) throw new Error(`Unsupported Adeel API command: ${name}`);
  const [ep,param]=spec;
  let u=`${BASE}/${ep}`;
  if(param){
    const value=(name==='welcome'||name==='goodbye')?name:arg;
    u+=`?${param}=${enc(value)}`;
  }
  return u;
}
async function request(url, options={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),TIMEOUT);
  try{
    const r=await fetch(url,{...options,headers:{'user-agent':'NaveedTuch/2.1','accept':'*/*',...(options.headers||{})},signal:controller.signal});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const ct=(r.headers.get('content-type')||'').toLowerCase();
    const rawType=ct.split(';')[0];
    if(/^(image|audio|video)\//.test(rawType)){
      const buffer=await r.buffer();
      if(!buffer.length) throw new Error('Empty media response');
      return {kind:'binary',buffer,contentType:rawType};
    }
    const raw=await r.text();
    let data;
    try{data=JSON.parse(raw)}catch{data=raw}
    if(data&&typeof data==='object'&&(data.success===false||data.status===false||data.error))
      throw new Error(data.message||data.error||'API returned failure');
    return {kind:'json',data};
  } finally {
    clearTimeout(timer);
  }
}
async function call(name,arg,extra={}){
  const key=normalizeName(name);
  if(!SPECS[key]) throw new Error(`Unsupported Adeel API command: ${key}`);
  // Adeel-XTech is the user's current MAIN API set. KnightBot is the same-feature fallback.
  // Search and URL forms are NEVER mixed between unrelated endpoints.
  const primary=buildUrl(key,arg);
  let primaryError;
  try { return await request(primary); }
  catch(e){ primaryError=e; }

  const knightName=({
    ytdl:'download', ytmp3:'ytaudio', ytmp3simple:'ytmp3', ytmp4:'ytmp4', ytmp4simple:'ytmp4simple',
    twitter:'twitter', ig:'instagram', igdl:'instagram', fb:'facebook', fbdl:'facebook',
    tiktok:'tiktok', tiktokv2:'tiktok', ttdl:'tiktok', pinterest:'pinterest', pin:'pinterest',
    pinterestvideo:'pinterest', pinterestphoto:'pinterest', ssweb:'ssweb', qrcode:'qr'
  })[key];
  let last=primaryError;
  if(knightName){
    try { return await knightCall(knightName,arg,extra); }
    catch(e){ last=e; }
  }
  for(const template of (LEGACY[key]||[])){
    try { return await request(template.replaceAll('{arg}',enc(arg))); }
    catch(e){ last=e; }
  }
  throw new Error(`All providers for ${key} failed: ${last?.message||'unknown error'}`);
}
function urlsIn(v,out=[]){if(!v)return out;if(typeof v==='string'){if(looksUrl(v))out.push(v);return out;}if(Array.isArray(v)){v.forEach(x=>urlsIn(x,out));return out;}if(typeof v==='object'){for(const [k,x] of Object.entries(v)){if(/url|download|media|audio|video|image|thumbnail|img|link|src/i.test(k)||typeof x==='object')urlsIn(x,out)}}return out;}
function bestUrl(d){
  // KnightBot Pinterest commonly returns { result: { download: "..." } }.
  // Resolve these direct media fields before generic recursive URL scanning.
  const direct = [
    d?.result?.download, d?.result?.download_url, d?.result?.downloadUrl,
    d?.result?.video, d?.result?.image, d?.download, d?.download_url, d?.downloadUrl
  ].find(v => typeof v === 'string' && looksUrl(v));
  if (direct) return direct;
  const found=[];
  function walk(v,k=''){
    if(v==null) return;
    if(typeof v==='string' && looksUrl(v)){
      const key=String(k||'').toLowerCase();
      let score=0;
      if(/(^|_)(download|downloadurl|download_url|media|mediaurl|media_url|audio|audio_url|video|video_url|image|image_url|file|file_url|src|url)$/.test(key)) score+=100;
      if(/thumbnail|thumb|sourceurl|source_url/.test(key)) score-=80;
      if(/\.(mp3|m4a|mp4|webm|jpg|jpeg|png|webp|gif)(\?|$)/i.test(v)) score+=25;
      found.push({url:v,score}); return;
    }
    if(Array.isArray(v)){v.forEach(x=>walk(x,k));return;}
    if(typeof v==='object'){Object.entries(v).forEach(([key,x])=>walk(x,key));}
  }
  walk(d);
  return [...new Map(found.sort((a,b)=>b.score-a.score).map(x=>[x.url,x])).values()][0]?.url;
}
function textOf(d){if(typeof d==='string')return d;for(const k of ['result','answer','message','text','response','data'])if(d?.[k]!=null)return typeof d[k]==='string'?d[k]:JSON.stringify(d[k],null,2);return JSON.stringify(d,null,2)}
async function downloadMedia(url, sourceUrl=''){
  if(/^\/files\//i.test(url)) url=`https://knightbotapi.stream${url}`;
  const candidates = [
    { url, headers: { 'user-agent':'Mozilla/5.0 NaveedTuch', 'accept':'*/*' } },
    { url, headers: { 'user-agent':'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36', 'accept':'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8', 'referer':'https://www.pinterest.com/', 'origin':'https://www.pinterest.com' } },
    { url, headers: { 'user-agent':'Mozilla/5.0 NaveedTuch', 'accept':'*/*', 'referer': sourceUrl || 'https://www.pinterest.com/' } }
  ];
  let lastError;
  for(const candidate of candidates){
    try{
      const r=await fetch(candidate.url,{headers:candidate.headers,redirect:'follow',timeout:60000});
      if(!r.ok) throw new Error(`Media download HTTP ${r.status}`);
      const ct=(r.headers.get('content-type')||'application/octet-stream').split(';')[0];
      const buffer=await r.buffer();
      if(!buffer.length) throw new Error('Downloaded media is empty');
      return {buffer,contentType:ct,url:r.url};
    }catch(e){ lastError=e; }
  }
  throw lastError || new Error('Media download failed');
}
async function send(sock,chatId,message,name,arg){const key=normalizeName(name);const res=await call(key,arg);const caption=`⚡ 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 👑\n${key}`;if(res.kind==='binary'){const ct=res.contentType;const payload=ct.includes('image/')?{image:res.buffer,caption}:ct.includes('audio/')?{audio:res.buffer,mimetype:ct,ptt:false}:ct.includes('video/')?{video:res.buffer,mimetype:ct,caption}:{document:res.buffer,mimetype:ct,fileName:`${key}-result`};return sock.sendMessage(chatId,payload,{quoted:message});}
 const d=res.data;const u=bestUrl(d);if(u){const media=await downloadMedia(u, d?.result?.sourceUrl || d?.sourceUrl || d?.result?.source || '');const ct=media.contentType;const payload=ct.startsWith('image/')?{image:media.buffer,caption}:ct.startsWith('audio/')?{audio:media.buffer,mimetype:ct,ptt:false}:ct.startsWith('video/')?{video:media.buffer,mimetype:ct,caption}:{document:media.buffer,mimetype:ct,fileName:`${key}-download`};return sock.sendMessage(chatId,payload,{quoted:message});}return sock.sendMessage(chatId,{text:`${caption}\n\n${textOf(d)}`},{quoted:message});}
module.exports={SPECS,ALIASES,LEGACY,call,send,normalizeName};

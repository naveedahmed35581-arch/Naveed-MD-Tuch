'use strict';

const BRAND = require('../settings').botName;

const CATEGORY = {
  ai:['ai','ask','gpt','gemini','chatbot','naveed','naveedai','newai','newaichat','newreason','newaivision','newaisearch','newaiimage','newimgedit','newaitts','newaivoice','newstt'],
  download:['ytdl','ytmp3','ytmp4','video','terabox','twitter','igdl','fbdl','tiktok','ttdl','pinterest','capcut','mediafire'],
  group:['add','kick','mute','unmute','promote','demote','tag','tagall','mention','antilink','antibadword','welcome','goodbye','warn','delete'],
  owner:['owner','sudo','settings','restart','shutdown','setprefix','prefix','setai','setmodel','broadcast','reload','sessions','delsession'],
  session:['pair','sessions','delsession','clearsession'],
  search:['google','googlesearch','duckduckgo','ddg','ytsearch','ttsearch','npmsearch','spotifysearch'],
  media:['sticker','s','simage','meme','take','emojimix','qc','brat','removebg'],
  audio:['tts','lyrics','play','song','spotify'],
  game:['tictactoe','hangman','trivia','truth','dare','8ball','eightball'],
  fun:['joke','quote','compliment','insult','flirt','shayari','goodnight','roseday','character','wasted','ship'],
  anime:['anime','waifu','neko']
};

function categoryForCommand(command){
  const n=String(command||'').replace(/^\./,'').toLowerCase();
  for(const [k,v] of Object.entries(CATEGORY)) if(v.includes(n)) return k;
  return 'result';
}

function commandFromQuoted(q){
  const m=q?.message||q;
  const t=m?.conversation||m?.extendedTextMessage?.text||m?.imageMessage?.caption||m?.videoMessage?.caption||'';
  const h=String(t).trim().match(/^[.!#/]\S+/);
  return h?h[0].slice(1).toLowerCase():'';
}

// WhatsApp cannot set arbitrary font families. Unicode bold is used only
// for the real answer so branding/category labels remain normal.
function unicodeBold(text){
  const normal='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bold='𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵';
  const normalChars=[...normal], boldChars=[...bold];
  const map=new Map(normalChars.map((c,i)=>[c,boldChars[i]]));
  return String(text).split('').map(c=>map.get(c)||c).join('');
}

function cleanMarkdown(s){
  return String(s).replace(/\*\*/g,'').replace(/\*/g,'').replace(/^\s*[┃│|]+\s*/,'').trim();
}

function stylizeAnswer(text){
  return String(text ?? '').trim().split('\n').map(line=>{
    const s=line.trim();
    if(!s) return '';
    if(/^https?:\/\//i.test(s)||/^```/.test(s)||/^\s*[$>]/.test(s)) return s;
    return unicodeBold(cleanMarkdown(s));
  }).filter(Boolean).join('\n');
}

function isProtectedText(original){
  const low=String(original).toLowerCase();
  return !String(original).trim() ||
    (String(original).includes(BRAND) && (low.includes('cmds') || low.includes('naveed core') || low.includes('commands'))) ||
    low.includes('official channel') ||
    low.includes('forwardednewslettermessageinfo') ||
    /^\s*[\[{]/.test(String(original));
}

function styleText(text, options={}){
  const original=String(text ?? '');
  if(isProtectedText(original)) return original;

  const command=commandFromQuoted(options.quoted);
  const cat=categoryForCommand(command);
  const icon={ai:'🧠',download:'⚡',group:'🥷',owner:'👑',session:'🔗',search:'🔎',media:'🎨',audio:'🎧',game:'🎮',fun:'😈',anime:'👑',result:'⚔️'}[cat];
  const low=original.trim().toLowerCase();
  const badge=/^(❌|⚠️)|error|failed|invalid|not found|unavailable|only /.test(low)
    ? '💢 ERROR'
    : /success|done|enabled|disabled|connected|updated|online|added|removed|changed/.test(low)
      ? '✨ SUCCESS'
      : '⚔️ RESULT';

  const header=command ? `${icon} ${command} • ${badge}` : `⚔️ NAVEED RESULT • ${badge}`;
  const answer=stylizeAnswer(original);
  return `${header}\n\n*${answer}*\n\n👑 ${BRAND}`;
}

function patchSocket(sock){
  if(!sock || sock.__naveedThemePatched) return sock;
  const original=sock.sendMessage.bind(sock);
  sock.__naveedThemeOriginalSendMessage=original;
  sock.sendMessage=async(jid,content={},options={})=>{
    try{
      if(content && typeof content==='object'){
        const next={...content};
        if(typeof next.text==='string') next.text=styleText(next.text,options);
        // Image/video/document captions are left alone; individual commands
        // control their media captions and menus must never be reformatted.
        return original(jid,next,options);
      }
    }catch(e){ console.warn('[NAVEED THEME]',e?.message||e); }
    return original(jid,content,options);
  };
  sock.__naveedThemePatched=true;
  return sock;
}

module.exports={BRAND,CATEGORY,categoryForCommand,styleText,patchSocket,unicodeBold};

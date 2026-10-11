'use strict';

const fs = require('fs');
const path = require('path');
const settings = require('../settings');

const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'unified-command-manifest.json'), 'utf8')
);

// 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 Naveed menu styling, sourcing commands from the unified manifest.
const NEWSLETTER_NAME = settings.newsletterName || settings.botName || '𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑';
const SERVER_MESSAGE_ID = 143;
const CAPTION_LIMIT = 4096;
let lastAudioName = null;

const SMALL_CAPS = {
  a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ғ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',
  n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'
};

function toSmallCaps(text) {
  return String(text || '').split('').map(ch => SMALL_CAPS[ch.toLowerCase()] || ch).join('');
}

function commandCategory(name) {
  const n = String(name || '').replace(/^\./, '').toLowerCase();
  const sets = {
    'SESSION': ['pair','sessions','delsession','clearsession'],
    '⚡ POLLINATIONS AI': ['newai','newaichat','newreason','newaivision','newaisearch','newaiimage','newimgedit','newaitts','newaivoice','newstt','newaimodels','newimgmodels','newaifeed','newimgfeed','newfunction'],
    '🧠 NAVEED AI': ['ai','gpt','gemini','chatbot','ask','naveed','naveedai','imagine','flux','dalle','sora','blackbox','blackboxai','llama','nulis','txt2img','translate','trt'],
    'AUDIO': ['tts','lyrics','play','song','music','mp3','ytmp3','spotify','spotifydl','ytmp3v2'],
    'DOWNLOADER': ['ytdl','ytmp4','ytmp4v2','video','terabox','twitter','twitterdl','ig','igdl','instagram','insta','fb','fbdl','facebook','tiktok','tt','ttdl','tiktokv2','pin','pinterest','pinterestvideo','pinvid','pinterestphoto','pinphoto','capcut','mediafire','viralvideo','sinhalasub','aptoide','gitclone','web2zip'],
    'SEARCH': ['google','googlesearch','duckduckgo','ddg','ytsearch','ttsearch','npmsearch','spotifysearch','searchgroups'],
    'IMAGE / MEDIA': ['sticker','s','simage','blur','removebg','remini','crop','tgsticker','meme','take','emojimix','qc','brat','vcc','tweet','imgtourl','readqr','heart','horny','circle','lgbt','lolice','its-so-stupid','namecard','oogway','ytcomment','comrade','gay','glass','jail','passed','triggered','metallic','ice','snow','impressive','matrix','light','neon','devil','purple','thunder','leaves','1917','arena','hacker','sand','glitch','fire'],
    'TOOLS': ['ss','ssweb','screenshot','weather','cuaca','fact','simdatabase','simdb','getpastebin','kompasnews','detiknews','cekkhodam','khodam','qrcode','qr'],
    'GAME': ['tictactoe','hangman','guess','trivia','answer','truth','dare','8ball','eightball','surrender'],
    'FUN': ['compliment','insult','flirt','shayari','shayri','goodnight','lovenight','gn','roseday','character','wasted','ship','simp','stupid','itssostupid','iss','joke','quote'],
    'GROUP': ['add','kick','mute','unmute','promote','demote','tag','tagall','tagnotadmin','hidetag','mention','antilink','antibadword','antispam','antiflood','antileak','protection','antitag','welcome','goodbye','resetlink','setgdesc','setgname','setgpp','clear','warnings','warn','delete','del'],
    'OWNER': ['owner','sudo','update','mode','setpp','settings','autostatus','antidelete','autoread','autotyping','autoreact','autoreaction','areact','pmblocker','cleartmp','prefix','setprefix'],
    'ANIME': ['anime','waifu','neko'],
    'TEXTMAKER': ['textmaker','blackpink']
  };
  for (const [category, names] of Object.entries(sets)) if (names.includes(n)) return category;
  return null;
}

function legacyCategory(value) {
  const s = String(value || '');
  if (/General Commands/i.test(s)) return 'GENERAL';
  if (/NEW POLLINATIONS/i.test(s)) return '⚡ POLLINATIONS AI';
  const map = [
    ['Fun Commands', 'FUN'], ['Textmaker', 'TEXTMAKER'], ['Downloader', 'DOWNLOADER'],
    ['MISC', 'MISC'], ['Admin Commands', 'ADMIN'], ['Owner Commands', 'OWNER'],
    ['Image/Sticker Commands', 'IMAGE / STICKER'], ['Pies Commands', 'PIES'],
    ['Game Commands', 'GAME'], ['AI Commands', '🧠 NAVEED AI'], ['ANIME', 'ANIME']
  ];
  for (const [needle, label] of map) {
    if (s.toLowerCase().includes(needle.toLowerCase())) return label;
  }
  return 'LEGACY / GENERAL';
}

function adeelCategory(value) {
  const map = {
    settings:'SETTINGS', audio:'AUDIO', download:'DOWNLOADER', group:'GROUP',
    moderation:'MODERATION', utility:'TOOLS', tools:'TOOLS', main:'GENERAL',
    owner:'OWNER', media:'IMAGE / MEDIA'
  };
  return map[String(value || '').toLowerCase()] || String(value || 'OTHER').toUpperCase();
}

function buildCommandSections() {
  const preferred = [
    'GENERAL', 'SESSION', 'IMAGE / STICKER', 'PIES', 'GAME', '🧠 NAVEED AI', '⚡ POLLINATIONS AI', 'FUN', 'TEXTMAKER',
    'DOWNLOADER', 'IMAGE / MEDIA', 'AUDIO', 'MISC', 'TOOLS', 'GROUP', 'ADMIN',
    'MODERATION', 'OWNER', 'SETTINGS', 'ANIME', 'LEGACY / GENERAL'
  ];

  const groups = Object.create(null);
  const discovered = [];
  const seen = new Set();

  for (const kind of ['legacy', 'adeel']) {
    for (const entry of (manifest[kind] || [])) {
      const explicit = commandCategory(entry.name);
      const category = explicit || (kind === 'legacy' ? legacyCategory(entry.category) : adeelCategory(entry.category));
      if (!groups[category]) {
        groups[category] = [];
        discovered.push(category);
      }

      const name = String(entry.name || '').trim().replace(/^\./, '');
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      groups[category].push(name);
    }
  }

  if (groups.OWNER && !groups.OWNER.includes('prefix')) groups.OWNER.push('prefix');

  const order = [
    ...preferred.filter(category => groups[category]),
    ...discovered.filter(category => !preferred.includes(category))
  ];

  return { groups, order, count: seen.size };
}

function categoryEmoji(category) {
  const key = String(category || '').toUpperCase();
  const map = {
    'GENERAL':'🌀','SESSION':'🔗','⚡ POLLINATIONS AI':'🌌','🧠 NAVEED AI':'🧠',
    'AUDIO':'🎧','DOWNLOADER':'⚡','SEARCH':'🔎','IMAGE / MEDIA':'🎨','IMAGE / STICKER':'🖼️',
    'TOOLS':'🛠️','GAME':'🎮','FUN':'😈','GROUP':'🥷','ADMIN':'🛡️','MODERATION':'🚨',
    'OWNER':'👑','SETTINGS':'⚙️','ANIME':'👑','TEXTMAKER':'✍️','PIES':'🥧','MISC':'🧰',
    'LEGACY / GENERAL':'📜'
  };
  return map[category] || '⚔️';
}

function commandEmoji(name, category) {
  const n = String(name || '').toLowerCase();
  if (/^(ai|ask|gpt|gemini|chatbot|naveed|naveedai|newai|newaichat|newreason|newaivision|newaisearch|newaiimage|newimgedit|newaitts|newaivoice|newstt|newaimodels|newimgmodels|newaifeed|newimgfeed|newfunction)$/.test(n)) return '🧠';
  if (/^(yt|ytmp|ytdl|video|terabox|twitter|ig|instagram|fb|facebook|tiktok|ttdl|pin|pinterest|capcut|mediafire|viralvideo|sinhalasub|aptoide|gitclone|web2zip)/.test(n)) return '⚡';
  if (/^(pair|sessions|delsession|clearsession|clearsesi)/.test(n)) return '🔗';
  if (/^(add|kick|mute|unmute|promote|demote|tag|hidetag|mention|antilink|antibadword|welcome|goodbye|warn|delete|group)/.test(n)) return '🥷';
  if (/^(owner|sudo|settings|restart|shutdown|setai|setmodel|vip|stats|logs|reload)/.test(n)) return '👑';
  if (/^(play|song|music|mp3|spotify|tts|lyrics)/.test(n)) return '🎧';
  if (/^(google|duckduckgo|ddg|ytsearch|ttsearch|npmsearch|spotifysearch|searchgroups)/.test(n)) return '🔎';
  if (/^(sticker|simage|blur|remini|crop|meme|take|emojimix|qc|brat|vcc|tweet|imgtourl|readqr)/.test(n)) return '🎨';
  if (/^(tictactoe|ttt|move|hangman|guess|trivia|truth|dare|8ball|eightball|surrender)/.test(n)) return '🎮';
  if (/^(joke|quote|compliment|insult|flirt|shayari|goodnight|character|wasted|ship|simp|stupid|iss)/.test(n)) return '😈';
  if (/^(anime|waifu|neko)/.test(n)) return '👑';
  return categoryEmoji(category);
}

function formatCategory(category, names, prefix) {
  if (!names.length) return '';
  const icon = categoryEmoji(category);
  const cleanCategory = String(category).replace(/^[^A-Za-z0-9]+[ ]*/, '').trim();
  const title = `╭─ ${icon} ${cleanCategory.toUpperCase()} ─╮`;
  const body = names.map(name => `│ ${prefix}${name}`).join('\n');
  return `${title}\n${body}\n╰─╯`;
}
function buildMenuText() {
  const { groups, order, count } = buildCommandSections();
  const prefix = (() => {
    try {
      const f = path.join(__dirname, '..', 'data', 'prefix.json');
      if (fs.existsSync(f)) {
        const d = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (d.prefix === '*') return '.';
        if (typeof d.prefix === 'string' && d.prefix.length <= 3 && !/[\s\\]/.test(d.prefix)) return d.prefix;
      }
    } catch {}
    return process.env.PREFIX || settings.prefix || '.';
  })();
  const owner = process.env.OWNER_NAME || settings.botOwner || 'Naveed Tuch';

  let text = `╭━━〔 👑 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 ⚔️ 〕━━╮\n`;
  text += `┃ ⚔️ NAVEED MD • V7.0\n`;
  text += `┃ 💎 PREMIUM+ • 🔒 PRIVATE\n`;
  text += `┃ 👑 ${owner} • ⚡ ${prefix} • 📜 ${count}+\n`;
  text += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

  for (const category of order) {
    if (!groups[category]?.length) continue;
    text += `\n\n${formatCategory(category, groups[category], prefix)}`;
  }

  text += `\n\n${settings.poweredBy}\n` +
           `⌁ ${settings.botName} ⌁`;
  return { text, count, groups, order };
}
function formatRuntime(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return days ? `${days}d ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
    : `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}

function chunkMenu(text, limit = CAPTION_LIMIT) {
  if (text.length <= limit) return [text];
  const chunks = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf('\n', limit);
    if (cut < 1000) cut = limit;
    chunks.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function getMenuImage() {
  return settings.imageUrl || settings.menuImage || null;
}

function getMenuAudio() {
  return null; // no voice note in this build
}

async function newsletterContext(sock, sender) {
  const info = {
    mentionedJid: sender ? [sender] : [],
    forwardingScore: 999,
    isForwarded: true
  };
  if (settings.newsletterJid) {
    info.forwardedNewsletterMessageInfo = {
      newsletterJid: settings.newsletterJid,
      newsletterName: settings.newsletterName || NEWSLETTER_NAME,
      serverMessageId: SERVER_MESSAGE_ID
    };
  }
  return info;
}

function getMenuImage() {
  return settings.imageUrl || settings.menuImage || null;
}

function getMenuAudio() {
  return null; // no voice note in this build
}

async function sendMenuAudio(sock, chatId, message) {
  const audioPath = getMenuAudio();
  if (!audioPath) return false;
  try {
    const audio = fs.readFileSync(audioPath);
    await sock.sendMessage(chatId, {
      audio,
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true
    }, { quoted: message });
    return true;
  } catch (error) {
    console.log('[MENU] voice send failed:', error?.message || error);
    return false;
  }
}

async function helpCommand(sock, chatId, message) {
  const { text, count } = buildMenuText();
  const imagePath = getMenuImage();

  // Exactly ONE menu message. The complete command list is compact enough to
  // stay inside WhatsApp's caption limit, so there is intentionally no chunk
  // loop and no continuation text message.
  try {
    if (imagePath) {
      await sock.sendMessage(chatId, {
        image: { url: imagePath },
        caption: text,
        mimetype: 'image/jpeg',
      }, { quoted: message });
    } else {
      await sock.sendMessage(chatId, { text }, { quoted: message });
    }
  } catch (error) {
    // One fallback only; never send a second menu plus the original.
    console.log('[MENU] menu media send failed:', error?.message || error);
    await sock.sendMessage(chatId, { text }, { quoted: message });
  }

  // Exactly ONE voice message after the menu.
  await sendMenuAudio(sock, chatId, message);

  console.log(`[MENU] sent ${count} commands in 1 menu message + 1 voice message`);
  return true;
}

module.exports = helpCommand;
module.exports.buildMenuText = buildMenuText;
module.exports.chunkMenu = chunkMenu;

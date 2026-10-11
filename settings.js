// ─────────────────────────────────────────────
//  𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 — central brand + bot settings
// ─────────────────────────────────────────────
const BOT_NAME = '𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑';
const OWNER_NAME = '𝐌𝐫 𝐍𝐚𝐯𝐞𝐞𝐝 𝐓𝐮𝐜𝐡 𝐌𝐝 👑';
const POWERED_BY = '⚡ 𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐛𝐲 𝐍𝐚𝐯𝐞𝐞𝐝 𝐓𝐮𝐜𝐡 𝐌𝐢𝐧𝐢 𝐁𝐨𝐭';
const IMAGE_URL = 'https://i.ibb.co/hRk7TTSK/03432ed6a7c9.jpg';

// The ONE newsletter that is attached to every outgoing message.
const MAIN_NEWSLETTER_JID = '120363365530973563@newsletter';

// These newsletters are auto-followed on connect and every new post gets an auto-react.
const AUTO_NEWSLETTERS = [
  '120363420163227139@newsletter',
  '120363407898199836@newsletter',
  '120363427355337487@newsletter',
];

const settings = {
  packname: BOT_NAME,
  author: 'Naveed Tuch',
  botName: BOT_NAME,
  botOwner: OWNER_NAME,
  ownerName: OWNER_NAME,
  poweredBy: POWERED_BY,
  ownerNumber: process.env.OWNER_NUMBER || '923182835581', // Country code + number, digits only
  giphyApiKey: 'qnl7ssQChTdPjsKta2Ax2LMaGXz303tq',
  commandMode: "public",
  prefix: process.env.PREFIX || '.',
  maxStoreMessages: 20,
  storeWriteInterval: 10000,
  description: `${BOT_NAME} — WhatsApp Mini Bot`,
  channelLink: process.env.CHANNEL_LINK || 'https://whatsapp.com/channel/0029Vawbj7e5kg7AFF5MuZ28',
  // GitHub repo link: put your link here (shown in .github / .script).
  repoLink: process.env.REPO_LINK || '',
  groupLink: process.env.GROUP_LINK || '',
  // One image for menu / alive / update / connected message (remote URL).
  imageUrl: IMAGE_URL,
  menuImage: IMAGE_URL,
  menuAudio: '',
  menuAudioUrl: '',
  newsletterJid: MAIN_NEWSLETTER_JID,
  newsletterName: BOT_NAME,
  autoNewsletters: AUTO_NEWSLETTERS,
  autoNewsletterReactions: ['❤️', '🔥', '👑', '⚡', '😍', '👍'],
  version: "3.1.0",
  updateZipUrl: "",
};

// Expose consistent brand/config globals for legacy ESM plugins.
global.botName = settings.botName;
global.botname = settings.botName;
global.ownerName = settings.ownerName;
global.poweredBy = settings.poweredBy;
global.ownerNumber = settings.ownerNumber;
global.botVersion = settings.version;
global.tenorApiKey = process.env.TENOR_API_KEY || '';
global.suppL = settings.groupLink || settings.channelLink;
global.channelLink = settings.channelLink;
global.repoLink = settings.repoLink;
global.groupLink = settings.groupLink;
global.packname = settings.packname;
global.author = settings.author;
global.botPhotoUrl = IMAGE_URL;
global.themeemoji = '👑';
global.animeTheme = true;

module.exports = settings;

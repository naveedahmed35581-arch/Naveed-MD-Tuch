'use strict';
const fs=require('fs'); const path=require('path');
const settings=require('../settings');
const help=require('../plugins/help');
const theme=require('../lib/animeTheme');
const errors=[];
function ok(name,cond,detail=''){ if(!cond) errors.push(`${name}: ${detail||'failed'}`); else console.log(`PASS ${name}`); }
ok('brand', settings.botName.includes('𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑'));
ok('owner', settings.ownerNumber==='923182835581');
ok('newsletter', settings.newsletterJid==='120363365530973563@newsletter');
ok('theme module', typeof theme.patchSocket==='function' && typeof theme.styleText==='function');
ok('image url', /^https:\/\/i\.ibb\.co\//.test(settings.imageUrl));
const menu=help.buildMenuText(); ok('menu command count', menu.count>=300, String(menu.count)); ok('menu caption limit', menu.text.length<=4096, String(menu.text.length)); ok('menu brand', menu.text.includes('𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑')); ok('pollinations section', menu.text.includes('POLLINATIONS AI'));
const knightText=fs.readFileSync(path.join(__dirname,'..','lib','knightApi.js'),'utf8');
ok('knight ytdl', knightText.includes("download: ['api/download'"));
ok('knight ytaudio', knightText.includes("ytaudio: ['api/download/ytaudio'"));
ok('knight ytmp4', knightText.includes("ytmp4: ['api/download/ytmp4'"));
ok('knight pinterest', knightText.includes("pinterest: ['api/download/pinterest'"));
ok('pollinations commands', ['newai','newaichat','newreason','newaivision','newaisearch','newaiimage','newimgedit','newaitts','newaivoice','newstt','newaimodels','newimgmodels','newaifeed','newimgfeed','newfunction'].every(n=>menu.text.includes('.'+n)));
const sample=theme.styleText('Pong!\nLatency: 12ms',{quoted:{message:{conversation:'.ping'}}}); ok('ping answer style', sample.includes('𝗣𝗼𝗻𝗴') && sample.includes('𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑'));
if(errors.length){console.error('\nFAILURES\n'+errors.join('\n')); process.exit(1)}
console.log(`\nAnime audit passed. Menu=${menu.count} commands, ${menu.text.length} chars.`);

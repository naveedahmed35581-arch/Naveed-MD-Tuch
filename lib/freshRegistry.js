'use strict';
const fs=require('fs'),path=require('path');
function discover(){const dir=path.join(__dirname,'..','plugins');const names=new Map();for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.js'))){try{const mod=require(path.join(dir,file));const base=file.replace(/\.js$/,'');const aliases=Array.isArray(mod.aliases)?mod.aliases:[];const list=[base,...aliases].map(x=>String(x).replace(/^\./,'').toLowerCase());for(const n of list)if(n)names.set(n,{name:n,file});}catch{}}
return names;}
module.exports={discover};

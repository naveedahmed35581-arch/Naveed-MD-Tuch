let mergedCommands = ["hotwheels","hw"];

export default {

name:"hotwheels",
alias:[...mergedCommands],
uniquecommands:[...mergedCommands],
description:"Get random Hot Wheels",

start: async (NaveedBot,m,{inputCMD})=>{

switch(inputCMD){

case "hotwheels":
case "hw":

try{

const res = await fetch("https://hot-wheels-rugs.onrender.com/api/random")
const data = await res.json()

const image = data.imgUrl

await NaveedBot.sendMessage(
m.from,
{
image:{url:image},
caption:`🏎 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 Hot Wheels

Name: ${data.name}
Model: ${data.model}
Series: ${data.series}
Year: ${data.year}`
},
{ quoted:m }
)

}catch(e){

await NaveedBot.sendMessage(
m.from,
{ text:"❌ 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 failed to fetch Hot Wheels."},
{ quoted:m }
)

}

break

default:
break

}

}

}
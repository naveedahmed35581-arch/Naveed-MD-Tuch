import fs from "fs";
import Collections from "./Collections.js";
const commands = new Collections();
commands.prefix = global.prefa;

async function readcommands() {
  commands.clear();
  const cmdfile = fs
    .readdirSync("./plugins")
    .filter((file) => file.endsWith(".mjs"));
  for (const file of cmdfile) {
    try {
      const module = await import(`../plugins/${file}`);
      const cmdfiles = module.default;
      if (!cmdfiles || !cmdfiles.name) {
        console.warn(`[ 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 ] Skipping ${file}: missing default export or name`);
        continue;
      }
      commands.set(cmdfiles.name, cmdfiles);
    } catch (err) {
      console.error(`[ EXCEPTION ] Failed to load plugin ${file}: ${err.message}`);
    }
  }
}

  export {readcommands, commands};
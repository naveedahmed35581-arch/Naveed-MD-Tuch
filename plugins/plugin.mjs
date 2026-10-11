import got from "got";
import fs from "fs";
import path from "path";
import { readcommands } from "../lib/features/ReadCommands.js";
import {
  pushPlugin,
  isPluginPresent,
  delPlugin,
  getAllPlugins,
  checkMod,
} from "../lib/features/LocalStore/LocalStore_Core.js";

const mergedCommands = ["install", "uninstall", "plugins", "pluginlist"];
export default {
  name: "plugininstaller",
  alias: [...mergedCommands],
  uniquecommands: ["install", "uninstall", "plugins", "pluginlist"],
  description: "Install, Uninstall, List plugins",
  start: async (
    NaveedBot,
    m,
    {
      text,
      args,
      pushName,
      prefix,
      inputCMD,
      isCreator,
      isintegrated,
      doReact,
    },
  ) => {
    switch (inputCMD) {
      case "install": {
        const chechSenderModStatus = await checkMod(m.sender);
        if (!chechSenderModStatus && !isCreator && !isintegrated()) {
          await doReact("❌");
          return NaveedBot.sendMessage(m.from, {
            text: `Sorry, only *Bot Moderators* can use this command !`,
            quoted: m,
          });
        }
        let parsedUrl;
        try {
          parsedUrl = new URL(text);
        } catch (e) {
          return await NaveedBot.sendMessage(
            m.from,
            { text: `Invalid URL !` },
            { quoted: m },
          );
        }

        let urlStr;
        if (parsedUrl.host === "gist.github.com") {
          parsedUrl.host = "gist.githubusercontent.com";
          urlStr = parsedUrl.toString() + "/raw";
        } else {
          urlStr = parsedUrl.toString();
        }

        const { body, statusCode } = await got(urlStr);
        if (statusCode == 200) {
          try {
            const folderName = "plugins";
            const fileName = path.basename(urlStr).replace(/\.js$/i, ".mjs");

            const plugin = await isPluginPresent(fileName);
            if (plugin) {
              return m.reply(`*${fileName}* plugin is already Installed !`);
            }

            if (fs.existsSync(`./plugins/${fileName}`)) {
              return m.reply(
                `*${fileName}* plugin is already Present Locally !`,
              );
            }

            const filePath = path.join(folderName, fileName);
            await fs.promises.writeFile(filePath, body);
            await m.reply(`Installing *${fileName}*... `);
            await readcommands();
            await pushPlugin(fileName, text);
            await m.reply(`*${fileName}* Installed Successfully !`);
          } catch (error) {
            console.error("[ EXCEPTION ] Plugin install error:", error.message);
            await m.reply(`Failed to install plugin: ${error.message}`);
          }
        }
        break;
      }

      case "plugins": {
        await doReact("🧩");
        const plugins = await getAllPlugins();
        if (!plugins.length) {
          await NaveedBot.sendMessage(
            m.from,
            { text: `No additional plugins installed !` },
            { quoted: m },
          );
        } else {
          let txt = "*『    Installed Plugins List    』*\n\n";
          for (let i = 0; i < plugins.length; i++) {
            txt += `🔖 *Plugin ${i + 1}*\n*🎀 Name:* ${plugins[i].plugin}\n*🧩 Url:* ${plugins[i].url}\n\n`;
          }
          txt += `⚜️ To uninstall a plugin type *uninstall* plugin-name or plugin-number !\n\nExample: *${prefix}uninstall* audioEdit.js\nor *${prefix}uninstall* 1`;
          await NaveedBot.sendMessage(m.from, { text: txt }, { quoted: m });
        }
        break;
      }

      case "uninstall": {
        const chechSenderModStatus = await checkMod(m.sender);
        if (!chechSenderModStatus && !isCreator && !isintegrated()) {
          await doReact("❌");
          return NaveedBot.sendMessage(m.from, {
            text: `Sorry, only *Bot Moderators* can use this command !`,
            quoted: m,
          });
        }
        if (!text) {
          return await m.reply(
            `Please provide a plugin name or index number !\n\nExample:\n*${prefix}uninstall* audioEdit.js\nOr:\n*${prefix}uninstall* 1\nOr:\n*${prefix}uninstall* all`,
          );
        }
        await doReact("🧩");

        let fileName = text.trim().replace(/\.js$/i, ".mjs");

        if (fileName.toLowerCase() === "all") {
          const pluginsList = await getAllPlugins();
          if (pluginsList.length === 0) {
            await doReact("❌");
            return await m.reply(`There are no additional plugins installed !`);
          }
          let deletedCount = 0;
          for (const p of pluginsList) {
            if (fs.existsSync(`./plugins/${p.plugin}`)) {
              fs.unlinkSync(`./plugins/${p.plugin}`);
            }
            await delPlugin(p.plugin);
            deletedCount++;
          }
          await readcommands();
          return await m.reply(
            `Successfully uninstalled ${deletedCount} plugin(s) !\n\nPlease restart the bot to clear cache !`,
          );
        }

        if (/^\d+$/.test(fileName)) {
          const parsedIndex = parseInt(fileName) - 1;
          const pluginsList = await getAllPlugins();

          if (parsedIndex >= 0 && parsedIndex < pluginsList.length) {
            fileName = pluginsList[parsedIndex].plugin;
          } else {
            await doReact("❌");
            return await m.reply(
              `Invalid plugin index ! Please provide a valid number from the *${prefix}plugins* list.`,
            );
          }
        }

        const plugin = await isPluginPresent(fileName);

        if (!plugin) {
          await doReact("❌");
          return await m.reply(`*${fileName}* plugin is not installed !`);
        }

        if (fs.existsSync(`./plugins/${fileName}`)) {
          fs.unlinkSync(`./plugins/${fileName}`);
          await delPlugin(fileName);
          await readcommands();
          await m.reply(
            `*${fileName}* plugin uninstalled successfully !\n\nPlease restart the bot to clear cache !`,
          );
        } else {
          await doReact("❌");
          return m.reply(`*${fileName}* plugin is not installed !`);
        }
        break;
      }

      case "pluginlist": {
        await doReact("🧩");
        const textssf = `*『    NAVEED INSTALLABLE PLUGINS    』*\n\n
*🎀 Name:* audioEdit.js\n🔖 *Commands:* 8\n🧩 *Source:* Naveed Tuch Plugin Registry\n\n
*🎀 Name:* text-to-speech.js\n🔖 *Commands:* 7\n🧩 *Source:* Naveed Tuch Plugin Registry\n\n
*🎀 Name:* image-edit.js\n🔖 *Commands:* 4\n🧩 *Source:* Naveed Tuch Plugin Registry\n\n
*🎀 Name:* logo-maker.js\n🔖 *Commands:* 40\n🧩 *Source:* Naveed Tuch Plugin Registry\n\n
*🎀 Name:* fun.js\n🔖 *Commands:* 17\n🧩 *Source:* Naveed Tuch Plugin Registry\n\n
*🎀 Name:* chat-GPT.js\n🔖 *Commands:* 2\n🧩 *Source:* Naveed Tuch Plugin Registry\n\n
*🎀 Name:* tiktokdl.js\n🔖 *Commands:* 4\n🧩 *Source:* Naveed Tuch Plugin Registry\n\n
*🎀 Name:* nsfw-image.js\n🔖 *Commands:* 1\n🧩 *Source:* Naveed Tuch Plugin Registry\n\n\n⚜️ To install a plugin type *install* _plugin-url_ !\n\nExample: *${prefix}install* https://example.com/plugin.js\n\n⚜️ To uninstall a plugin type *uninstall* _plugin-name_ !\n\nExample: *${prefix}uninstall* audioEdit.js\n`;
        await NaveedBot.sendMessage(
          m.from,
          { image: { url: botImage1 }, caption: textssf },
          { quoted: m },
        );
        break;
      }

      default:
        break;
    }
  },
};

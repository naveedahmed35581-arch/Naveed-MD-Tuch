const { sleep } = require('../lib/adeel/functions');
const config = require('../lib/adeel/config');
const { cmd, commands } = require('../lib/adeel/command');

cmd({
    pattern: "leave",
    alias: ["left", "leftgc", "leavegc"],
    desc: "Leave the group",
    react: "🎉",
    category: "owner",
    filename: __filename
},
async (conn, mek, m, {
    from, isGroup, isCreator, reply
}) => {
    try {
        if (!isGroup) return reply("❗ Only for groups.");
        if (!isCreator) return reply("❗ Only for owner.");

        await reply("👋 Bye everyone!");
        await sleep(1500);
        await conn.groupLeave(from);

    } catch (e) {
        console.error(e);
        reply(`❌ Error: ${e.message}`);
    }
});

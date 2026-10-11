// 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 — one command for every global on/off switch.
// All values are stored in bot-settings/toggles.json
const { cmd } = require('../lib/adeel/command');
const store = require('../lib/settingsStore');
const settings = require('../settings');

const flag = (section, key = 'enabled') => ({
  get: () => !!(store.get(section, {}) || {})[key],
  set: (v) => store.set(section, { ...(store.get(section, {}) || {}), [key]: v })
});

const SWITCHES = {
  autoread:    { label: 'Auto read messages', ...flag('autoread') },
  autotyping:  { label: 'Auto typing', ...flag('autotyping') },
  autostatus:  { label: 'Auto view status', ...flag('autostatus') },
  statusreact: { label: 'Auto react to status', ...flag('autostatus', 'reactOn') },
  antidelete:  { label: 'Anti delete', ...flag('antidelete') },
  anticall:    { label: 'Anti call', ...flag('anticall') },
  pmblocker:   { label: 'PM blocker', ...flag('pmblocker') },
  autoreact:   { label: 'Auto react on commands', get: () => !!store.get('groups.autoReaction', false), set: (v) => store.set('groups.autoReaction', v) },
  public:      { label: 'Public mode (off = private)', ...flag('mode', 'isPublic') }
};

const ON = ['on', 'enable', 'true', '1', 'yes'];
const OFF = ['off', 'disable', 'false', '0', 'no'];

cmd({
  pattern: 'toggle',
  alias: ['toggles', 'switches', 'onoff'],
  desc: 'Show / change all on-off settings',
  category: 'owner',
  filename: __filename
},
async (conn, mek, m, { reply, args, isOwner, prefix }) => {
  if (!isOwner) return reply('❌ Only the bot owner can use this command.');
  const name = String(args[0] || '').toLowerCase();
  const val = String(args[1] || '').toLowerCase();

  if (!name) {
    const lines = Object.entries(SWITCHES).map(([k, s]) => `${s.get() ? '✅' : '❌'} *${k}* — ${s.label}`);
    return reply(
      `*⚙️ ${settings.botName} — SWITCHES*\n\n${lines.join('\n')}\n\n` +
      `Use: *${prefix}toggle <name> on|off*\nExample: *${prefix}toggle autoread on*\n\n` +
      `📁 Saved in: bot-settings/toggles.json\n_Group switches (antilink, welcome, antibadword…) are per group; use their own commands inside the group._`
    );
  }

  const sw = SWITCHES[name];
  if (!sw) return reply(`❌ Unknown switch: *${name}*\nSend *${prefix}toggle* to see the list.`);

  let next;
  if (ON.includes(val)) next = true;
  else if (OFF.includes(val)) next = false;
  else if (!val) next = !sw.get();
  else return reply(`Use *${prefix}toggle ${name} on* or *${prefix}toggle ${name} off*`);

  sw.set(next);
  return reply(`${next ? '✅' : '❌'} *${sw.label}* is now *${next ? 'ON' : 'OFF'}*`);
});

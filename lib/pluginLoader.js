// 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 — loads EVERY file inside /plugins on startup.
//   *.mjs                    -> ESM feature plugins   (loaded by lib/featureBridge)
//   *.js using lib/adeel/cmd -> cmd()-style plugins   (loaded by lib/adeelBridge)
//   other *.js               -> classic command modules (required by main.js; verified here)
const fs = require('fs');
const path = require('path');

const PLUGIN_DIR = path.join(__dirname, '..', 'plugins');

function scan() {
  const out = { legacy: [], adeel: [], features: [] };
  for (const f of fs.readdirSync(PLUGIN_DIR).sort()) {
    const full = path.join(PLUGIN_DIR, f);
    if (!fs.statSync(full).isFile()) continue;
    if (f.endsWith('.mjs')) out.features.push(f);
    else if (f.endsWith('.js')) {
      const isAdeel = /lib\/adeel\/command/.test(fs.readFileSync(full, 'utf8'));
      (isAdeel ? out.adeel : out.legacy).push(f);
    }
  }
  return out;
}

async function loadAll() {
  const found = scan();
  const failed = [];

  const adeel = require('./adeelBridge').loadAll();
  failed.push(...adeel.failed);

  await require('./featureBridge').loadFeatures().catch((e) => failed.push(`features: ${e.message}`));

  for (const f of found.legacy) {
    try { require(path.join(PLUGIN_DIR, f)); }
    catch (e) { failed.push(f); console.warn(`[NAVEED PLUGINS] ${f} skipped: ${e.message}`); }
  }

  console.log(`[NAVEED PLUGINS] ${found.legacy.length} classic + ${found.adeel.length} cmd-style + ${found.features.length} feature files in /plugins` + (failed.length ? ` | failed: ${failed.join(', ')}` : ' | all loaded'));
  return { found, failed };
}

module.exports = { scan, loadAll, PLUGIN_DIR };

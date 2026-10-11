# 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 — WhatsApp Mini Bot

Owner: 𝐌𝐫 𝐍𝐚𝐯𝐞𝐞𝐝 𝐓𝐮𝐜𝐡 𝐌𝐝 👑 (+923182835581)

## Layout
- `index.js`, `main.js`, `settings.js`, `config.js` — core files
- `plugins/` — all commands (`plugins/adeel`, `plugins/features` = extra command packs)
- `lib/` — all helper libraries (`lib/adeel`, `lib/features`)
- `data/` — runtime JSON data, `assets/` — stickers

## On/off settings
Every on/off switch (autoread, autotyping, autostatus, antidelete, anticall, pmblocker, auto-react, public/private mode, prefix, plus per-group antilink / antibadword / welcome / goodbye / chatbot) is stored in ONE file: `bot-settings/toggles.json`. Edit it by hand or use chat commands, e.g. `.toggle` (list) and `.toggle autoread on`.

## Run
```
npm install
npm start
```
Pair with the number in `OWNER_NUMBER` (see `.env.example`). Brand, owner, newsletter JIDs and image URL are all in `settings.js`.

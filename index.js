/**
 * 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 - A WhatsApp Bot
 * 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑 custom build
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License.
 * 
 * Credits:
 * - Baileys Library by @adiwajshing
 * - Pair Code implementation inspired by original upstream contributors
 */
require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, await, sleep, reSize } = require('./lib/myfunc')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
// Using a lightweight persisted store instead of makeInMemoryStore (compat across versions)
const pino = require("pino")
const { parsePhoneNumber } = require("libphonenumber-js")
const { PHONENUMBER_MCC } = require('@whiskeysockets/baileys/lib/Utils/generics')
const { rmSync, existsSync } = require('fs')
const { join } = require('path')
const { patch: patchMediaTransport } = require('./lib/mediaTransport')
const pairSessionManager = require('./lib/pairSessionManager')
const { CHANNEL_NAME, CHANNEL_LINK, resolveOfficialChannel, installChannelContext } = require('./lib/channel')
const newsletterAuto = require('./lib/newsletterAuto')
// Load every file inside /plugins (classic, cmd-style and ESM feature plugins).
require('./lib/pluginLoader').loadAll().catch((e) => console.error('[PLUGINS] loader error:', e.message))
const { patchSocket } = require('./lib/animeTheme')

// Import lightweight store
const store = require('./lib/lightweight_store')

// Initialize store
store.readFromFile()
const settings = require('./settings')
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

// Memory optimization - Force garbage collection if available
setInterval(() => {
    if (global.gc) {
        global.gc()
        // Keep host panel console available for pairing and diagnostics
    }
}, 60_000) // every 1 minute

// Memory monitoring - Restart if RAM gets too high
setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 400) {
        console.log('⚠️ RAM too high (>400MB), restarting bot...')
        process.exit(1) // Panel will auto-restart
    }
}, 30_000) // check every 30 seconds

// Preconfigured number for non-interactive hosting panels (host panel, etc.).
let phoneNumber = String(process.env.OWNER_NUMBER || settings.ownerNumber || '').replace(/\D/g, '')
let owner = JSON.parse(fs.readFileSync('./data/owner.json'))

global.botname = "𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑"
global.themeemoji = "👑"

const pairingCode = true
const useMobile = process.argv.includes("--mobile")

// The hosting console supplies the WhatsApp number interactively at first startup.


async function startNaveedBot() {
    try {
        let { version, isLatest } = await fetchLatestBaileysVersion()
        const { state, saveCreds } = await useMultiFileAuthState(`./session`)
        const msgRetryCounterCache = new NodeCache()

        const NaveedBot = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !pairingCode,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            getMessage: async (key) => {
                let jid = jidNormalizedUser(key.remoteJid)
                let msg = await store.loadMessage(jid, key.id)
                return msg?.message || ""
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
        })

        // Expose auth state and a single pairing-code function to .pair.
        // Baileys pairing is only valid while this session is unregistered.
        patchSocket(NaveedBot)
        NaveedBot.authState = state
        NaveedBot.__naveedRequestPairingCode = async (targetNumber) => {
            const normalized = String(targetNumber || '').replace(/\D/g, '')
            if (!normalized) throw new Error('Invalid phone number')
            if (state.creds.registered) throw new Error('Session is already paired')
            const rawCode = await NaveedBot.requestPairingCode(normalized)
            return rawCode?.match(/.{1,4}/g)?.join('-') || rawCode
        }

        // Attach the fixed newsletter (channel) context to every outgoing message.
        // The newsletter JID is fixed in settings.js (newsletterJid).
        installChannelContext(NaveedBot)

        // Save credentials when they update
        NaveedBot.ev.on('creds.update', saveCreds)

        // Always download remote media on the bot side before sending.
        // This avoids WhatsApp-side CDN/region/legal blocking for provider URLs.
        patchMediaTransport(NaveedBot)

    store.bind(NaveedBot.ev)

    // Initialize/recover independent .pair sessions. Each phone number has
    // its own auth directory and Baileys socket; child sessions use the same
    // command engine but never share the primary auth state.
    pairSessionManager.init({ handleMessages, handleGroupParticipantUpdate, handleStatus, store })

    // Message handling
    NaveedBot.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = Array.isArray(chatUpdate?.messages) ? chatUpdate.messages[0] : null
            if (!mek?.message || !mek.key?.remoteJid) return
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
            if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                await handleStatus(NaveedBot, chatUpdate);
                return;
            }
            // In private mode, only block non-group messages (allow groups for moderation)
            // Note: NaveedBot.public is not synced, so we check mode in main.js instead
            // This check is kept for backward compatibility but mainly blocks DMs
            if (!NaveedBot.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                const isGroup = mek.key?.remoteJid?.endsWith('@g.us')
                if (!isGroup) return // Block DMs in private mode, but allow group messages
            }
            if (typeof mek.key.id === 'string' && mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return

            // Clear message retry cache to prevent memory bloat
            if (NaveedBot?.msgRetryCounterCache) {
                NaveedBot.msgRetryCounterCache.clear()
            }

            try {
                await handleMessages(NaveedBot, chatUpdate, true)
            } catch (err) {
                console.error("Error in handleMessages:", err)
                // Only try to send error message if we have a valid chatId
                if (mek.key && mek.key.remoteJid) {
                    await NaveedBot.sendMessage(mek.key.remoteJid, {
                        text: '❌ An error occurred while processing your message.',
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            
                        }
                    }).catch(console.error);
                }
            }
        } catch (err) {
            console.error("Error in messages.upsert:", err)
        }
    })

    // Add these event handlers for better functionality
    NaveedBot.decodeJid = (jid) => {
        if (!jid) return jid
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {}
            return decode.user && decode.server && decode.user + '@' + decode.server || jid
        } else return jid
    }

    NaveedBot.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = NaveedBot.decodeJid(contact.id)
            if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
        }
    })

    NaveedBot.getName = (jid, withoutContact = false) => {
        id = NaveedBot.decodeJid(jid)
        withoutContact = NaveedBot.withoutContact || withoutContact
        let v
        if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
            v = store.contacts[id] || {}
            if (!(v.name || v.subject)) v = NaveedBot.groupMetadata(id) || {}
            resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
        })
        else v = id === '0@s.whatsapp.net' ? {
            id,
            name: 'WhatsApp'
        } : id === NaveedBot.decodeJid(NaveedBot.user.id) ?
            NaveedBot.user :
            (store.contacts[id] || {})
        return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
    }

    NaveedBot.public = true

    NaveedBot.serializeM = (m) => smsg(NaveedBot, m, store)

    // Handle pairing code
    if (pairingCode && !NaveedBot.authState.creds.registered) {
        if (useMobile) throw new Error('Cannot use pairing code with mobile api')

        // Ask the hosting user for the WhatsApp number; never use the pack author's number.
        if (!phoneNumber) {
            const readline = require('node:readline/promises');
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            try {
                while (!phoneNumber) {
                    const answer = await rl.question('📱 Please enter your WhatsApp number with country code (example: 919XXXXXXXXX): ');
                    const candidate = String(answer || '').replace(/\D/g, '');
                    const pn = require('awesome-phonenumber');
                    if (candidate && pn('+' + candidate).isValid()) {
                        phoneNumber = candidate;
                        settings.ownerNumber = candidate;
                        console.log(chalk.green(`🔐 Pairing target: +${phoneNumber}`));
                    } else {
                        console.log(chalk.red('Invalid number. Include country code, digits only; try again.'));
                    }
                }
            } finally {
                rl.close();
            }
        }

        setTimeout(async () => {
            try {
                const code = await NaveedBot.__naveedRequestPairingCode(phoneNumber)
                console.log(chalk.black(chalk.bgGreen(`Your Pairing Code : `)), chalk.black(chalk.white(code)))
                console.log(chalk.yellow(`\nPlease enter this code in your WhatsApp app:\n1. Open WhatsApp\n2. Go to Settings > Linked Devices\n3. Tap "Link a Device"\n4. Enter the code shown above`))
            } catch (error) {
                console.error('Error requesting pairing code:', error)
                console.log(chalk.red('Failed to get pairing code. Please check your phone number and try again.'))
            }
        }, 3000)
    }

    // Connection handling
    NaveedBot.ev.on('connection.update', async (s) => {
        const { connection, lastDisconnect, qr } = s
        
        if (qr) {
            console.log(chalk.yellow('📱 QR Code generated. Please scan with WhatsApp.'))
        }
        
        if (connection === 'connecting') {
            console.log(chalk.yellow('🔄 Connecting to WhatsApp...'))
        }
        
        if (connection == "open") {
            console.log(chalk.magenta(` `))
            console.log(chalk.yellow(`🌿Connected to => ` + JSON.stringify(NaveedBot.user, null, 2)))

            try {
                const botNumber = NaveedBot.user.id.split(':')[0] + '@s.whatsapp.net';

                // Automatically set the connected WhatsApp account's display name.
                try {
                    if (typeof NaveedBot.updateProfileName === 'function') {
                        await NaveedBot.updateProfileName('𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑');
                        console.log(chalk.green('✅ WhatsApp display name set to 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑'));
                    }
                } catch (nameError) {
                    console.error('[PROFILE] Could not update display name:', nameError?.message || nameError);
                }

                const channelState = await resolveOfficialChannel(NaveedBot);
                console.log(chalk.green(`✅ Newsletter: ${channelState.name} (${channelState.jid})`));

                // Auto-follow the extra newsletters and auto-react to every new post.
                newsletterAuto.init(NaveedBot);

                const connectedCaption =
                    `🤖 *${settings.botName} CONNECTED!*\n\n` +
                    `⏰ Time: ${new Date().toLocaleString()}\n` +
                    `✅ Status: Online and Ready!\n\n` +
                    `👤 *Owner:* ${settings.ownerName}\n` +
                    `📞 *Contact:* wa.me/${String(settings.ownerNumber).replace(/\D/g, '')}\n` +
                    (settings.channelLink ? `\n📢 *Channel:* ${settings.channelLink}\n` : '') +
                    (settings.groupLink ? `\n💫 *Group:* ${settings.groupLink}\n` : '') +
                    `\n${settings.poweredBy}`;
                try {
                    await NaveedBot.sendMessage(botNumber, {
                        image: { url: settings.imageUrl },
                        caption: connectedCaption,
                        mimetype: 'image/jpeg'
                    });
                } catch (mediaError) {
                    console.error('[CONNECTED] Image send failed; sending text fallback:', mediaError?.message || mediaError);
                    await NaveedBot.sendMessage(botNumber, { text: connectedCaption });
                }
            } catch (error) {
                console.error('Error sending connection message:', error.message)
            }

            await delay(1999)
            console.log(chalk.yellow(`\n\n                  ${chalk.bold.blue(`[ ${global.botname || '𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑'} ]`)}\n\n`))
            console.log(chalk.cyan(`< ================================================== >`))
            console.log(chalk.magenta(`\n${global.themeemoji || '•'} CHANNEL: ${CHANNEL_NAME}`))
            console.log(chalk.magenta(`${global.themeemoji || '•'} WA NUMBER: ${owner}`))
            console.log(chalk.magenta(`${global.themeemoji || '•'} OWNER: ${settings.ownerName}`))
            console.log(chalk.green(`${global.themeemoji || '•'} 🤖 Bot Connected Successfully! ✅`))
            console.log(chalk.blue(`Bot Version: ${settings.version}`))
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
            const statusCode = lastDisconnect?.error?.output?.statusCode
            
            console.log(chalk.red(`Connection closed due to ${lastDisconnect?.error}, reconnecting ${shouldReconnect}`))
            
            if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                try {
                    rmSync('./session', { recursive: true, force: true })
                    console.log(chalk.yellow('Session folder deleted. Please re-authenticate.'))
                } catch (error) {
                    console.error('Error deleting session:', error)
                }
                console.log(chalk.red('Session logged out. Please re-authenticate.'))
            }
            
            if (shouldReconnect) {
                console.log(chalk.yellow('Reconnecting...'))
                await delay(5000)
                startNaveedBot()
            }
        }
    })

    // Track recently-notified callers to avoid spamming messages
    const antiCallNotified = new Set();

    // Anticall handler: block callers when enabled
    NaveedBot.ev.on('call', async (calls) => {
        try {
            const { readState: readAnticallState } = require('./plugins/anticall');
            const state = readAnticallState();
            if (!state.enabled) return;
            for (const call of calls) {
                const callerJid = call.from || call.peerJid || call.chatId;
                if (!callerJid) continue;
                try {
                    // First: attempt to reject the call if supported
                    try {
                        if (typeof NaveedBot.rejectCall === 'function' && call.id) {
                            await NaveedBot.rejectCall(call.id, callerJid);
                        } else if (typeof NaveedBot.sendCallOfferAck === 'function' && call.id) {
                            await NaveedBot.sendCallOfferAck(call.id, callerJid, 'reject');
                        }
                    } catch {}

                    // Notify the caller only once within a short window
                    if (!antiCallNotified.has(callerJid)) {
                        antiCallNotified.add(callerJid);
                        setTimeout(() => antiCallNotified.delete(callerJid), 60000);
                        await NaveedBot.sendMessage(callerJid, { text: '📵 Anticall is enabled. Your call was rejected and you will be blocked.' });
                    }
                } catch {}
                // Then: block after a short delay to ensure rejection and message are processed
                setTimeout(async () => {
                    try { await NaveedBot.updateBlockStatus(callerJid, 'block'); } catch {}
                }, 800);
            }
        } catch (e) {
            // ignore
        }
    });

    NaveedBot.ev.on('group-participants.update', async (update) => {
        await handleGroupParticipantUpdate(NaveedBot, update);
    });

    NaveedBot.ev.on('messages.upsert', async (m) => {
        if (m.messages[0].key && m.messages[0].key.remoteJid === 'status@broadcast') {
            await handleStatus(NaveedBot, m);
        }
    });

    NaveedBot.ev.on('status.update', async (status) => {
        await handleStatus(NaveedBot, status);
    });

    NaveedBot.ev.on('messages.reaction', async (status) => {
        await handleStatus(NaveedBot, status);
    });

    return NaveedBot
    } catch (error) {
        console.error('Error in startNaveedBot:', error)
        await delay(5000)
        startNaveedBot()
    }
}


// Start the bot with error handling
startNaveedBot().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
})
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
})

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err)
})

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update ${__filename}`))
    delete require.cache[file]
    require(file)
})
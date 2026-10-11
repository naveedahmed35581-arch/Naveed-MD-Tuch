const settings = require('../../settings');
module.exports = {
  BOT_NAME: settings.botName || 'Naveed Tuch',
  OWNER_NAME: settings.botOwner || 'Naveed Tuch',
  OWNER_NUMBER: process.env.OWNER_NUMBER || settings.ownerNumber || '',
  DEV: process.env.OWNER_NUMBER || settings.ownerNumber || '',
  BOT_IMAGE: process.env.BOT_IMAGE || '',
  NEWSLETTER_JID: process.env.NEWSLETTER_JID || '',
  NEWSLETTER_NAME: settings.botName || 'Naveed Tuch',
  PREFIX: process.env.PREFIX || '.',
  MODE: settings.commandMode || 'public',
  VERSION: settings.version || '1.0.0',
  DESCRIPTION: settings.description || '',
  STICKER_NAME: `${settings.packname || 'Naveed Tuch'} | ${settings.author || 'Naveed Tuch'}`,
  SUDO: [process.env.OWNER_NUMBER || settings.ownerNumber || ''].filter(Boolean).map(n => String(n).replace(/\D/g,'' ) + '@s.whatsapp.net'),
  DEFAULT_SETTINGS: {}
};

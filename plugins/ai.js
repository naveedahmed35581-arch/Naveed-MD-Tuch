'use strict';

const { call: adeelCall } = require('../lib/adeelApi');

function extractText(data) {
  if (data == null) return '';
  if (typeof data === 'string') return data.trim();
  if (Array.isArray(data)) {
    for (const item of data) {
      const out = extractText(item);
      if (out) return out;
    }
    return '';
  }
  for (const key of ['result', 'answer', 'message', 'text', 'response', 'output', 'content', 'reply']) {
    if (data?.[key] != null) {
      const out = extractText(data[key]);
      if (out) return out;
    }
  }
  if (data?.choices?.length) {
    const out = extractText(data.choices[0]?.message?.content ?? data.choices[0]?.text);
    if (out) return out;
  }
  if (data?.candidates?.length) {
    const out = extractText(data.candidates[0]?.content?.parts);
    if (out) return out;
  }
  return '';
}

async function askOpenAI(query) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not configured');
  const model = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: 'You are NAVEED AI for 𝐍𝐀𝐕𝐄𝐄𝐃 𝐓𝐔𝐂𝐇 👑. Answer clearly and concisely. If asked who created you, your owner, or who made you, always answer that Mr Naveed Tuch Md created you. Never name an API provider as your creator.' }] },
        { role: 'user', content: [{ type: 'input_text', text: query }] }
      ]
    })
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = raw; }
  if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}`);
  const answer = extractText(data?.output_text || data);
  if (!answer) throw new Error('OpenAI returned an empty response');
  return answer;
}

async function askAdeel(query) {
  const response = await adeelCall('gpt', query);
  const answer = extractText(response?.data ?? response);
  if (!answer) throw new Error('Adeel GPT returned an empty response');
  return answer;
}

async function askFallback(query) {
  const urls = [
    `https://zellapi.autos/ai/chatbot?text=${encodeURIComponent(query)}`,
    `https://vapis.my.id/api/gemini?q=${encodeURIComponent(query)}`,
    `https://api.siputzx.my.id/api/ai/gemini-pro?content=${encodeURIComponent(query)}`,
    `https://api.ryzendesu.vip/api/ai/gemini?text=${encodeURIComponent(query)}`
  ];
  let lastError;
  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'NaveedTuch-AI/1.0', accept: 'application/json,text/plain,*/*' } });
      const raw = await response.text();
      let data;
      try { data = JSON.parse(raw); } catch { data = raw; }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const answer = extractText(data);
      if (answer) return answer;
      throw new Error('empty response');
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('All AI providers failed');
}

async function runAI(query) {
  const providers = [];
  if (process.env.OPENAI_API_KEY) providers.push(['OpenAI', askOpenAI]);
  providers.push(['Adeel', askAdeel], ['Fallback', askFallback]);
  const errors = [];
  for (const [name, fn] of providers) {
    try { return await fn(query); }
    catch (error) { errors.push(`${name}: ${error?.message || error}`); }
  }
  throw new Error(errors.join(' | '));
}

async function aiCommand(sock, chatId, message) {
  const raw = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
  const match = raw.trim().match(/^\.(ai|gpt|gemini)(?:\s+([\s\S]*))?$/i);
  if (!match) return false;
  const command = `.${match[1].toLowerCase()}`;
  const query = (match[2] || '').trim();
  if (!query) {
    await sock.sendMessage(chatId, {
      text: `🤖 *🧠 NAVEED AI*\n\nUsage: ${command} <question>\nExample: ${command} explain JavaScript promises`
    }, { quoted: message });
    return true;
  }
  try { await sock.sendMessage(chatId, { react: { text: '🤖', key: message.key } }); } catch {}
  try {
    const answer = await runAI(query);
    await sock.sendMessage(chatId, { text: answer }, { quoted: message });
  } catch (error) {
    console.error('[AI] provider chain failed:', error?.message || error);
    await sock.sendMessage(chatId, { text: '❌ AI service is temporarily unavailable. Please try again.' }, { quoted: message });
  }
  return true;
}

module.exports = aiCommand;

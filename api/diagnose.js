const GEMINI_KEY = 'AIzaSyBJ4AMDORVsXnPoP4q4GCkseSyy3TeDK6A';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const system = body.system || '';
    const messages = body.messages || [];
    const max_tokens = body.max_tokens || 2000;

    // Build Gemini parts
    const parts = [];

    if (system) {
      parts.push({ text: 'INSTRUCTIONS:\n' + system + '\n\n' });
    }

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const content = msg.content;

      if (typeof content === 'string') {
        parts.push({ text: content });
      } else if (Array.isArray(content)) {
        for (let j = 0; j < content.length; j++) {
          const block = content[j];
          if (block.type === 'text') {
            parts.push({ text: block.text });
          } else if (block.type === 'image' && block.source && block.source.data) {
            parts.push({
              inline_data: {
                mime_type: block.source.media_type || 'image/jpeg',
                data: block.source.data
              }
            });
          } else if (block.type === 'document' && block.source && block.source.data) {
            parts.push({
              inline_data: {
                mime_type: 'application/pdf',
                data: block.source.data
              }
            });
          }
        }
      }
    }

    const geminiBody = {
      contents: [{ role: 'user', parts: parts }],
      generationConfig: {
        maxOutputTokens: max_tokens,
        temperature: 0.7
      }
    };

    const geminiResponse = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return res.status(geminiResponse.status).json({
        error: geminiData.error ? geminiData.error.message : 'Gemini API error',
        code: geminiData.error ? geminiData.error.code : geminiResponse.status
      });
    }

    const text = geminiData.candidates &&
                 geminiData.candidates[0] &&
                 geminiData.candidates[0].content &&
                 geminiData.candidates[0].content.parts &&
                 geminiData.candidates[0].content.parts[0] &&
                 geminiData.candidates[0].content.parts[0].text
                 ? geminiData.candidates[0].content.parts[0].text
                 : '';

    if (!text) {
      return res.status(500).json({ error: 'Empty response from Gemini' });
    }

    return res.status(200).json({
      content: [{ type: 'text', text: text }],
      stop_reason: 'end_turn'
    });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

const GEMINI_KEY = 'AIzaSyBJ4AMDORVsXnPoP4q4GCkseSyy3TeDK6A';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { system, messages, max_tokens } = req.body;

    // Build Gemini request from Anthropic-style input
    const parts = [];

    // Add system prompt as first user message context
    if (system) {
      parts.push({ text: `SYSTEM INSTRUCTIONS:\n${system}\n\n` });
    }

    // Add message content (handle text + images/documents)
    for (const msg of messages || []) {
      const content = msg.content;
      if (typeof content === 'string') {
        parts.push({ text: content });
      } else if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'text') {
            parts.push({ text: block.text });
          } else if (block.type === 'image' && block.source?.type === 'base64') {
            parts.push({
              inline_data: {
                mime_type: block.source.media_type,
                data: block.source.data
              }
            });
          } else if (block.type === 'document' && block.source?.type === 'base64') {
            // Gemini supports PDF via inline_data
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
      contents: [{ role: 'user', parts }],
      generationConfig: {
        maxOutputTokens: max_tokens || 2000,
        temperature: 0.7
      }
    };

    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({
        error: data.error?.message || 'Gemini API error',
        details: data
      });
    }

    // Convert Gemini response back to Anthropic-style format
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({
      content: [{ type: 'text', text }],
      model: 'gemini-1.5-flash',
      stop_reason: 'end_turn'
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

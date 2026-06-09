const https = require('https');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { data, mimeType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

    // Strip data URL prefix if present
    const base64 = data.includes(',') ? data.split(',')[1] : data;

    const payload = JSON.stringify({
      contents: [{
        parts: [
          {
            text: `You are analyzing a delivery docket, job sheet, or document for a formwork/construction company called Masterform.
Extract the following information and return ONLY valid JSON (no markdown, no explanation):
{
  "client": "company or client name if found, else null",
  "jobNumber": "job or reference number if found, else null",
  "date": "date in DD/MM/YYYY format if found, else null",
  "items": "brief list of items or materials mentioned, else null",
  "amount": "total dollar amount if found, else null",
  "driver": "driver or delivery person name if found, else null",
  "notes": "any other relevant info in 1-2 sentences, else null"
}`
          },
          {
            inline_data: {
              mime_type: mimeType || 'image/png',
              data: base64
            }
          }
        ]
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
    });

    const result = await new Promise((resolve, reject) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
      };
      let body = '';
      const req2 = https.request(options, r => {
        r.on('data', d => body += d);
        r.on('end', () => resolve(JSON.parse(body)));
      });
      req2.on('error', reject);
      req2.write(payload);
      req2.end();
    });

    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    // Clean up any markdown code blocks
    const clean = text.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    let parsed = {};
    try { parsed = JSON.parse(clean); } catch(e) { parsed = { notes: text }; }

    res.json({ success: true, analysis: parsed });
  } catch(e) {
    console.error('analyze-doc error:', e);
    res.status(500).json({ error: e.message });
  }
};

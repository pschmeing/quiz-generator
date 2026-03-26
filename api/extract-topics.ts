import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const { content } = req.body ?? {}
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content is required' })
  }

  // Limit input to ~20k chars (~5k tokens) for the extraction call
  const truncated = content.slice(0, 20000)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: 'Du extrahierst die 3-6 inhaltlichen Themenfelder aus einem Unterrichtsdokument (Lernsituation, Arbeitsblatt, Lehrplan etc.). Jedes Themenfeld ist ein kurzes Label (2-5 Woerter) das beschreibt, worum es inhaltlich geht. Antworte NUR mit einem JSON-Array von Strings, z.B. ["SQL-Grundlagen", "JOIN-Typen", "Datenbankmodellierung"]. Kein Text davor oder danach.',
      messages: [
        {
          role: 'user',
          content: `Extrahiere die Themenfelder:\n\n${truncated}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    return res.status(500).json({ error: 'Failed to extract topics' })
  }

  const data = await response.json()
  const text = data.content[0].text.trim()

  try {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()
    const topics = JSON.parse(cleaned) as string[]
    return res.status(200).json({ topics: Array.isArray(topics) ? topics.slice(0, 6) : [] })
  } catch {
    return res.status(200).json({ topics: [] })
  }
}

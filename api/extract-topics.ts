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
      system: 'Du extrahierst die 3-6 pruefbaren Kompetenzen oder Wissensgebiete aus einem Unterrichtsdokument. Jedes Themenfeld beschreibt Fachwissen oder eine Faehigkeit, die man in einem Quiz abfragen kann — NICHT Methoden (z.B. Rollenspiele, Gruppenarbeit) oder Aktivitaeten (z.B. Feedback geben, Reflexion). Jedes Label hat 2-5 Woerter. Antworte NUR mit einem JSON-Array von Strings, z.B. ["SQL-Abfragesyntax", "Normalisierung", "ER-Modellierung"]. Kein Text davor oder danach.',
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

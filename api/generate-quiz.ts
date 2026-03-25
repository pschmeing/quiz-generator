import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const { topic, difficulty, audience, questionCount = 10, optionCount = 4, defaultType = 'single' } = req.body ?? {}
  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: 'topic is required' })
  }

  const count = Math.min(30, Math.max(5, Number(questionCount) || 10))
  const options = Math.min(6, Math.max(2, Number(optionCount) || 4))
  const optionLabels = 'ABCDEF'.slice(0, options)
  const optionsObj = optionLabels.split('').map(l => `"${l}": "..."`).join(', ')

  const typeInstruction = defaultType === 'multiple'
    ? 'Bei jeder Frage können MEHRERE Antworten richtig sein. Das Feld "correct" ist ein Array wie ["A","C"]. Das Feld "type" ist "multiple".'
    : 'Bei jeder Frage ist GENAU EINE Antwort richtig. Das Feld "correct" ist ein einzelner Buchstabe wie "A". Das Feld "type" ist "single".'

  const difficultyHint = difficulty ? ` Der Schwierigkeitsgrad soll "${difficulty}" sein.` : ''
  const audienceHint = audience ? ` Die Zielgruppe ist "${audience}".` : ''

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system:
        `Du bist ein erfahrener Lehrer. Erstelle genau ${count} Multiple-Choice-Aufgaben zum angegebenen Thema. Jede Aufgabe hat genau ${options} Antwortmöglichkeiten (${optionLabels.split('').join(', ')}). ${typeInstruction} Antworte NUR mit validem JSON ohne Markdown-Blöcke: { "title": "Thema", "questions": [ { "id": 1, "question": "...", "options": { ${optionsObj} }, "correct": "A", "type": "single", "explanation": "Kurze Erklärung warum diese Antwort richtig ist" } ] } WICHTIG: Antworte AUSSCHLIESSLICH mit dem JSON-Objekt. Kein Text davor oder danach. Keine Markdown-Formatierung. Kein \`\`\`json Block.`,
      messages: [
        {
          role: 'user',
          content: `Erstelle ein Quiz zum Thema: ${topic}.${difficultyHint}${audienceHint}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    return res.status(response.status).json({ error: `Anthropic API error: ${error}` })
  }

  const data = await response.json()
  const content = data.content[0].text
  const cleaned = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  res.status(200).json(JSON.parse(cleaned))
}

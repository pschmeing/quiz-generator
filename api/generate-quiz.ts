import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const { topic, difficulty, audience, questionCount = 10, optionCount = 4, defaultType = 'single', lsContext, selectedGoals } = req.body ?? {}
  const hasLsContext = lsContext && typeof lsContext === 'string' && lsContext.trim().length > 0
  if (!hasLsContext && (!topic || typeof topic !== 'string')) {
    return res.status(400).json({ error: 'topic or lsContext is required' })
  }

  // Budget guard: estimate tokens and reject if over 5ct limit
  if (hasLsContext) {
    const estimatedInputTokens = Math.ceil((lsContext.length + (selectedGoals?.join('\n').length ?? 0)) / 4) + 1000
    const estimatedCost = (estimatedInputTokens * 3 + 2000 * 15) / 1_000_000
    if (estimatedCost > 0.05) {
      return res.status(413).json({ error: 'Zu viel Kontext — bitte weniger Text oder weniger Dateien.' })
    }
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

  const jsonFormat = `{ "title": "Thema", "questions": [ { "id": 1, "question": "...", "options": { ${optionsObj} }, "correct": "A", "type": "single", "explanation": "Kurze Erklärung warum diese Antwort richtig ist" } ] }`

  let systemPrompt: string
  let userMessage: string

  if (hasLsContext) {
    const topicsHint = selectedGoals?.length
      ? `\nFokussiere die Fragen auf folgende Themenfelder:\n${selectedGoals.map(g => `- ${g}`).join('\n')}\nDie Fragen sollen inhaltlich zu diesen Themenfeldern passen und nicht nur Faktenwissen abfragen.`
      : ''
    systemPrompt = `Du bist ein erfahrener Lehrer am Berufskolleg. Dir liegt eine Lernsituation (LS) aus der Unterrichtsplanung vor. Erstelle genau ${count} Multiple-Choice-Aufgaben basierend auf den Inhalten dieser Lernsituation.${topicsHint} Jede Aufgabe hat genau ${options} Antwortmöglichkeiten (${optionLabels.split('').join(', ')}). ${typeInstruction}${difficultyHint} Antworte NUR mit validem JSON ohne Markdown-Blöcke: ${jsonFormat} WICHTIG: Antworte AUSSCHLIESSLICH mit dem JSON-Objekt. Kein Text davor oder danach. Keine Markdown-Formatierung. Kein \`\`\`json Block.`
    userMessage = `Hier ist die Lernsituation:\n\n${lsContext}`
  } else {
    systemPrompt = `Du bist ein erfahrener Lehrer. Erstelle genau ${count} Multiple-Choice-Aufgaben zum angegebenen Thema. Jede Aufgabe hat genau ${options} Antwortmöglichkeiten (${optionLabels.split('').join(', ')}). ${typeInstruction} Antworte NUR mit validem JSON ohne Markdown-Blöcke: ${jsonFormat} WICHTIG: Antworte AUSSCHLIESSLICH mit dem JSON-Objekt. Kein Text davor oder danach. Keine Markdown-Formatierung. Kein \`\`\`json Block.`
    userMessage = `Erstelle ein Quiz zum Thema: ${topic}.${difficultyHint}${audienceHint}`
  }

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
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
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

  // Extract JSON robustly: find the first { and last }
  const firstBrace = content.indexOf('{')
  const lastBrace = content.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return res.status(500).json({ error: 'Keine gültige JSON-Antwort vom Modell erhalten.' })
  }

  const jsonStr = content.slice(firstBrace, lastBrace + 1)

  try {
    res.status(200).json(JSON.parse(jsonStr))
  } catch (e) {
    return res.status(500).json({ error: `JSON-Parse-Fehler: ${e instanceof Error ? e.message : 'unbekannt'}` })
  }
}

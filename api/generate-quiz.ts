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

  const typeInstruction = defaultType === 'multiple'
    ? 'Bei jeder Frage koennen MEHRERE Antworten richtig sein. "correct" ist ein Array wie ["A","C"]. "type" ist "multiple".'
    : 'Bei jeder Frage ist GENAU EINE Antwort richtig. "correct" ist ein einzelner Buchstabe wie "A". "type" ist "single".'

  const difficultyHint = difficulty ? ` Schwierigkeitsgrad: "${difficulty}".` : ''
  const audienceHint = audience ? ` Zielgruppe: "${audience}".` : ''

  let systemPrompt: string
  let userMessage: string

  if (hasLsContext) {
    const topicsHint = selectedGoals?.length
      ? `\nFokussiere die Fragen auf folgende Themenfelder: ${selectedGoals.join(', ')}.`
      : ''
    systemPrompt = [
      `Du bist ein erfahrener Lehrer am Berufskolleg.`,
      `Erstelle genau ${count} Multiple-Choice-Aufgaben basierend auf der Lernsituation.${topicsHint}`,
      `Jede Aufgabe hat genau ${options} Antwortmoeglichkeiten (${optionLabels.split('').join(', ')}).`,
      typeInstruction,
      difficultyHint,
      `Die Fragen sollen nicht nur Faktenwissen abfragen.`,
      `WICHTIG: Alle Strings im JSON muessen korrekt escaped sein. Verwende \\" fuer Anfuehrungszeichen innerhalb von Strings.`,
      `Antworte AUSSCHLIESSLICH mit validem JSON. Das JSON beginnt sofort — kein Text, kein Markdown.`,
    ].filter(Boolean).join(' ')
    userMessage = `Hier ist die Lernsituation:\n\n${lsContext}`
  } else {
    systemPrompt = [
      `Du bist ein erfahrener Lehrer.`,
      `Erstelle genau ${count} Multiple-Choice-Aufgaben zum angegebenen Thema.`,
      `Jede Aufgabe hat genau ${options} Antwortmoeglichkeiten (${optionLabels.split('').join(', ')}).`,
      typeInstruction,
      `WICHTIG: Alle Strings im JSON muessen korrekt escaped sein. Verwende \\" fuer Anfuehrungszeichen innerhalb von Strings.`,
      `Antworte AUSSCHLIESSLICH mit validem JSON. Das JSON beginnt sofort — kein Text, kein Markdown.`,
    ].join(' ')
    userMessage = `Erstelle ein Quiz zum Thema: ${topic}.${difficultyHint}${audienceHint}`
  }

  // Use prefill to force JSON output
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
        { role: 'user', content: userMessage },
        { role: 'assistant', content: '{"title":' },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    return res.status(response.status).json({ error: `Anthropic API error: ${error}` })
  }

  const data = await response.json()
  const rawText = data.content[0].text

  // Reconstruct full JSON (prefill + response)
  const fullJson = '{"title":' + rawText

  // Extract JSON: find matching braces
  const firstBrace = fullJson.indexOf('{')
  const lastBrace = fullJson.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return res.status(500).json({ error: 'Keine gueltige JSON-Antwort vom Modell erhalten.' })
  }

  const jsonStr = fullJson.slice(firstBrace, lastBrace + 1)

  try {
    res.status(200).json(JSON.parse(jsonStr))
  } catch (e) {
    return res.status(500).json({
      error: `JSON-Parse-Fehler: ${e instanceof Error ? e.message : 'unbekannt'}`,
    })
  }
}

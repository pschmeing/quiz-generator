export interface ParsedTopic {
  label: string
}

export interface ParsedLs {
  title?: string
  topics: ParsedTopic[]
  fullText: string
}

export function extractTitle(content: string): string | undefined {
  for (const line of content.split('\n')) {
    const h = line.match(/^#{1,2}\s+(.+)/)
    if (h) return h[1].trim()
  }
  return undefined
}

export async function extractTopics(content: string): Promise<ParsedTopic[]> {
  const res = await fetch('/api/extract-topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) return []
  const data = await res.json() as { topics: string[] }
  return data.topics.map((label) => ({ label }))
}

import { NextRequest, NextResponse } from 'next/server'
import { getMinimax, MINIMAX_MODEL } from '@/lib/minimax/client'
import { LABEL_SYSTEM_PROMPT } from '@/lib/minimax/prompts'
import { scoreToLabel } from '@/lib/quiz/questions'

// Extract JSON from a string even if wrapped in markdown code fences
function extractJson(text: string): Record<string, string> {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON found')
  return JSON.parse(match[0])
}

export async function POST(req: NextRequest) {
  let spectrumScore = 0
  try {
    const body = await req.json()
    const { politicalResponses } = body
    spectrumScore = body.spectrumScore ?? 0

    const completion = await getMinimax().chat.completions.create({
      model: MINIMAX_MODEL,
      messages: [
        { role: 'system', content: LABEL_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Political spectrum score: ${spectrumScore.toFixed(2)} (scale: -1.0 = far left, +1.0 = far right)\n\nQuestion responses:\n${politicalResponses}`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    const text = completion.choices[0].message.content || '{}'
    const result = extractJson(text)

    if (!result.label) throw new Error('No label in response')
    return NextResponse.json(result)
  } catch (err) {
    console.error('Label API error:', err)
    return NextResponse.json({ label: scoreToLabel(spectrumScore), explanation: '' })
  }
}

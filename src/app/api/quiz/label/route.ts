import { NextRequest, NextResponse } from 'next/server'
import { minimax, MINIMAX_MODEL } from '@/lib/minimax/client'
import { LABEL_SYSTEM_PROMPT } from '@/lib/minimax/prompts'

export async function POST(req: NextRequest) {
  try {
    const { politicalResponses, spectrumScore } = await req.json()

    const completion = await minimax.chat.completions.create({
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
    const result = JSON.parse(text)

    return NextResponse.json(result)
  } catch (err) {
    console.error('Label API error:', err)
    return NextResponse.json({ label: 'Centrist', explanation: '' })
  }
}

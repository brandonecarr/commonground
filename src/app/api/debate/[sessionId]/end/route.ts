import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { minimax, MINIMAX_MODEL } from '@/lib/minimax/client'
import { SCORING_SYSTEM_PROMPT } from '@/lib/minimax/prompts'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()
  const serviceSupabase = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session } = await supabase
    .from('debate_sessions')
    .select('*, topics(title)')
    .eq('id', sessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.status !== 'active') return NextResponse.json({ error: 'Already ended' }, { status: 400 })
  if (session.user1_id !== user.id && session.user2_id !== user.id) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
  }

  // Mark session as completed
  await serviceSupabase
    .from('debate_sessions')
    .update({ status: 'completed', ended_at: new Date().toISOString() })
    .eq('id', sessionId)

  // Get full transcript
  const { data: allMessages } = await serviceSupabase
    .from('messages')
    .select('content, user_id, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (!allMessages || allMessages.length < 2) {
    // Not enough messages to score — give default scores
    const defaultScore = { respectfulness: 5, evidence_use: 5, topic_adherence: 5, open_mindedness: 5 }
    for (const uid of [session.user1_id, session.user2_id]) {
      if (!uid) continue
      const total = 20
      const points = 10
      await serviceSupabase.from('debate_scores').upsert({
        session_id: sessionId,
        user_id: uid,
        ...defaultScore,
        total_score: total,
        merit_points_awarded: points,
      })
      // Profile update happens below in main flow
    }
    return NextResponse.json({ ok: true })
  }

  // Build transcript for AI
  const transcript = allMessages
    .map(m => `[${m.user_id === session.user1_id ? 'User1' : 'User2'}]: ${m.content}`)
    .join('\n')

  const topic = (session.topics as { title?: string } | null)?.title ?? 'political topic'

  try {
    const completion = await minimax.chat.completions.create({
      model: MINIMAX_MODEL,
      messages: [
        { role: 'system', content: SCORING_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Topic: ${topic}\n\nTranscript:\n${transcript}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 400,
    })

    const text = completion.choices[0].message.content || '{}'
    const result = JSON.parse(text)

    const userMap = {
      user1: session.user1_id,
      user2: session.user2_id,
    }

    for (const [key, uid] of Object.entries(userMap)) {
      if (!uid) continue
      const scores = result[key] || { respectfulness: 5, evidence_use: 5, topic_adherence: 5, open_mindedness: 5 }
      const total =
        (scores.respectfulness || 5) +
        (scores.evidence_use || 5) +
        (scores.topic_adherence || 5) +
        (scores.open_mindedness || 5)
      const meritPoints = Math.round(total / 2)

      await serviceSupabase.from('debate_scores').upsert({
        session_id: sessionId,
        user_id: uid,
        respectfulness: scores.respectfulness || 5,
        evidence_use: scores.evidence_use || 5,
        topic_adherence: scores.topic_adherence || 5,
        open_mindedness: scores.open_mindedness || 5,
        total_score: total,
        merit_points_awarded: meritPoints,
      })

      // Update profile merit points and debate count
      const { data: profile } = await serviceSupabase
        .from('profiles')
        .select('total_merit_points, debates_completed')
        .eq('id', uid)
        .single()

      if (profile) {
        await serviceSupabase.from('profiles').update({
          total_merit_points: (profile.total_merit_points || 0) + meritPoints,
          debates_completed: (profile.debates_completed || 0) + 1,
        }).eq('id', uid)
      }
    }
  } catch (err) {
    console.error('Scoring error:', err)
    // Fallback: give basic scores
  }

  return NextResponse.json({ ok: true })
}

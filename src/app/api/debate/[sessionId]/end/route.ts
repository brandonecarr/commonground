import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getMinimax, MINIMAX_MODEL } from '@/lib/minimax/client'
import { SCORING_SYSTEM_PROMPT } from '@/lib/minimax/prompts'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()
  const serviceSupabase = createServiceClient()

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

  // Helper: save scores for one user and update their profile
  async function saveScoresForUser(
    uid: string,
    scores: { respectfulness: number; evidence_use: number; topic_adherence: number; open_mindedness: number },
  ) {
    const total = scores.respectfulness + scores.evidence_use + scores.topic_adherence + scores.open_mindedness
    const meritPoints = Math.round(total / 2)

    await serviceSupabase.from('debate_scores').upsert({
      session_id: sessionId,
      user_id: uid,
      ...scores,
      total_score: total,
      merit_points_awarded: meritPoints,
    })

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

  const defaultScores = { respectfulness: 5, evidence_use: 5, topic_adherence: 5, open_mindedness: 5 }

  if (!allMessages || allMessages.length < 2) {
    // Not enough messages — give default scores and update profiles
    for (const uid of [session.user1_id, session.user2_id]) {
      if (!uid) continue
      await saveScoresForUser(uid, defaultScores)
    }
    return NextResponse.json({ ok: true })
  }

  // Build transcript for AI
  const transcript = allMessages
    .map(m => `[${m.user_id === session.user1_id ? 'User1' : 'User2'}]: ${m.content}`)
    .join('\n')

  const topic = (session.topics as { title?: string } | null)?.title ?? 'political topic'

  // Try AI scoring, fall back to defaults if MiniMax is unavailable
  let aiResult: Record<string, Record<string, number>> | null = null

  try {
    const completion = await getMinimax().chat.completions.create({
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
    const match = text.match(/\{[\s\S]*\}/)
    if (match) aiResult = JSON.parse(match[0])
  } catch (err) {
    console.error('Scoring error (using fallback defaults):', err)
  }

  const userMap: Record<string, string> = { user1: session.user1_id, user2: session.user2_id }

  for (const [key, uid] of Object.entries(userMap)) {
    if (!uid) continue
    const raw = aiResult?.[key]
    const scores = {
      respectfulness: raw?.respectfulness || defaultScores.respectfulness,
      evidence_use: raw?.evidence_use || defaultScores.evidence_use,
      topic_adherence: raw?.topic_adherence || defaultScores.topic_adherence,
      open_mindedness: raw?.open_mindedness || defaultScores.open_mindedness,
    }
    await saveScoresForUser(uid, scores)
  }

  return NextResponse.json({ ok: true })
}

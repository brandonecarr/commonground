import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { pickTopic, findBestMatch } from '@/lib/matchmaking'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const serviceSupabase = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { topicId } = await req.json()

  // Get user's spectrum score
  const { data: profile } = await supabase
    .from('profiles')
    .select('spectrum_score')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Guard against null spectrum_score (profile backfilled without quiz)
  const spectrumScore = (profile.spectrum_score as number) ?? 0

  // Remove from queue if already in it
  await serviceSupabase.from('matchmaking_queue').delete().eq('user_id', user.id)

  // Find the best opponent — match anyone in the queue regardless of topic
  const { data: candidates } = await serviceSupabase
    .from('matchmaking_queue')
    .select('*')
    .neq('user_id', user.id)
    .order('joined_at', { ascending: true })

  const bestMatch = findBestMatch(spectrumScore, candidates || [])

  if (bestMatch) {
    const finalTopicId = await pickTopic(serviceSupabase, topicId, bestMatch.topic_id)

    const { data: session, error: sessionError } = await serviceSupabase
      .from('debate_sessions')
      .insert({
        topic_id: finalTopicId,
        user1_id: bestMatch.user_id,
        user2_id: user.id,
        status: 'active',
      })
      .select()
      .single()

    if (sessionError || !session) {
      console.error('Session create error:', sessionError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    await serviceSupabase.from('matchmaking_queue').delete().eq('user_id', bestMatch.user_id)

    return NextResponse.json({ sessionId: session.id })
  }

  // No match found — add to queue
  const { error: queueError } = await serviceSupabase.from('matchmaking_queue').insert({
    user_id: user.id,
    topic_id: topicId || null,
    spectrum_score: spectrumScore,
  })

  if (queueError) {
    console.error('Queue insert error:', queueError)
    return NextResponse.json({ error: `Queue error: ${queueError.message}` }, { status: 500 })
  }

  return NextResponse.json({ queued: true })
}

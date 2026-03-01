import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { findBestMatch, pickTopic } from '@/lib/matchmaking'

const TIMEOUT_SECONDS = 180

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const serviceSupabase = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check if user has been matched (removed from queue by the other user's join)
  const { data: queueEntry } = await serviceSupabase
    .from('matchmaking_queue')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!queueEntry) {
    // No queue entry — check if a session was already created for us
    const { data: session } = await supabase
      .from('debate_sessions')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    if (session) return NextResponse.json({ sessionId: session.id })
    return NextResponse.json({ timeout: true })
  }

  // Check for timeout
  const joinedAt = new Date(queueEntry.joined_at).getTime()
  const elapsed = (Date.now() - joinedAt) / 1000

  if (elapsed > TIMEOUT_SECONDS) {
    await serviceSupabase.from('matchmaking_queue').delete().eq('user_id', user.id)
    return NextResponse.json({ timeout: true })
  }

  // Still waiting — try to match now. Handles the race condition where
  // both users joined simultaneously and both ended up in the queue.
  const { data: candidates } = await serviceSupabase
    .from('matchmaking_queue')
    .select('*')
    .neq('user_id', user.id)
    .order('joined_at', { ascending: true })

  const bestMatch = findBestMatch(queueEntry.spectrum_score as number, candidates || [])

  if (bestMatch) {
    // Guard against duplicate sessions from simultaneous polls
    const { data: existing } = await serviceSupabase
      .from('debate_sessions')
      .select('id')
      .in('user1_id', [user.id, bestMatch.user_id])
      .eq('status', 'active')
      .limit(1)
      .single()

    if (existing) {
      // Session already created by the other user's poll — find ours
      const { data: mySession } = await supabase
        .from('debate_sessions')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

      if (mySession) {
        await serviceSupabase.from('matchmaking_queue').delete().eq('user_id', user.id)
        return NextResponse.json({ sessionId: mySession.id })
      }
      return NextResponse.json({ waiting: true, elapsed: Math.round(elapsed) })
    }

    const finalTopicId = await pickTopic(serviceSupabase, queueEntry.topic_id, bestMatch.topic_id)

    const { data: session } = await serviceSupabase
      .from('debate_sessions')
      .insert({
        topic_id: finalTopicId,
        user1_id: bestMatch.user_id,
        user2_id: user.id,
        status: 'active',
      })
      .select()
      .single()

    await serviceSupabase
      .from('matchmaking_queue')
      .delete()
      .in('user_id', [user.id, bestMatch.user_id])

    if (session) return NextResponse.json({ sessionId: session.id })
  }

  return NextResponse.json({ waiting: true, elapsed: Math.round(elapsed) })
}

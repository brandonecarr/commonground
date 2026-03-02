import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { pickTopic } from '@/lib/matchmaking'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const serviceSupabase = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json()
  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json({ error: 'action must be accept or decline' }, { status: 400 })
  }

  // Fetch the challenge — RLS ensures only the challengee can read it here
  const { data: challenge } = await supabase
    .from('debate_challenges')
    .select('*')
    .eq('id', id)
    .single()

  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
  if (challenge.challengee_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (challenge.status !== 'pending') return NextResponse.json({ error: 'Challenge already resolved' }, { status: 400 })

  if (action === 'decline') {
    await serviceSupabase
      .from('debate_challenges')
      .update({ status: 'declined' })
      .eq('id', id)
    return NextResponse.json({ ok: true })
  }

  // Accept: create a debate session directly
  const finalTopicId = await pickTopic(serviceSupabase, challenge.topic_id, null)

  const { data: session, error: sessionError } = await serviceSupabase
    .from('debate_sessions')
    .insert({
      topic_id: finalTopicId,
      user1_id: challenge.challenger_id,
      user2_id: user.id,
      status: 'active',
    })
    .select()
    .single()

  if (sessionError || !session) {
    console.error('Session create error:', sessionError)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }

  await serviceSupabase
    .from('debate_challenges')
    .update({ status: 'accepted', session_id: session.id })
    .eq('id', id)

  return NextResponse.json({ ok: true, sessionId: session.id })
}

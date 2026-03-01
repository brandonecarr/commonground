import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getMinimax, MINIMAX_MODEL } from '@/lib/minimax/client'
import { MODERATION_SYSTEM_PROMPT } from '@/lib/minimax/prompts'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()
  const serviceSupabase = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  // Verify participant
  const { data: session } = await supabase
    .from('debate_sessions')
    .select('id, user1_id, user2_id, status, topics(title)')
    .eq('id', sessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.status !== 'active') return NextResponse.json({ error: 'Session not active' }, { status: 400 })
  if (session.user1_id !== user.id && session.user2_id !== user.id) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
  }

  // Save message
  const { data: message } = await serviceSupabase
    .from('messages')
    .insert({
      session_id: sessionId,
      user_id: user.id,
      content: content.trim(),
    })
    .select()
    .single()

  if (!message) return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })

  // Get recent messages for context (last 10)
  const { data: recentMessages } = await supabase
    .from('messages')
    .select('content, user_id, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(10)

  const context = (recentMessages || [])
    .reverse()
    .map(m => `[${m.user_id === user.id ? 'Current User' : 'Opponent'}]: ${m.content}`)
    .join('\n')

  // AI Moderation — run async, don't block response
  try {
    const topic = (session.topics as { title?: string } | null)?.title ?? 'political topic'
    const completion = await getMinimax().chat.completions.create({
      model: MINIMAX_MODEL,
      messages: [
        { role: 'system', content: MODERATION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Topic: ${topic}\n\nRecent conversation:\n${context}\n\nLatest message to evaluate: "${content.trim()}"`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 200,
    })

    const text = completion.choices[0].message.content || '{}'
    const result = JSON.parse(text)

    if (result.flagged) {
      // Update message as flagged
      await serviceSupabase
        .from('messages')
        .update({ is_flagged: true, flag_reason: 'tone_violation' })
        .eq('id', message.id)

      // Save intervention
      if (result.intervention) {
        await serviceSupabase.from('ai_interventions').insert({
          session_id: sessionId,
          trigger_message_id: message.id,
          intervention_type: 'tone_warning',
          content: result.intervention,
        })
      }
    }
  } catch (err) {
    // Don't fail the message send if moderation errors
    console.error('Moderation error:', err)
  }

  return NextResponse.json({ messageId: message.id })
}

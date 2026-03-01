import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChatRoom from '@/components/debate/ChatRoom'

export default async function DebateSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('debate_sessions')
    .select(`
      *,
      topics (id, title, description, category),
      user1:profiles!debate_sessions_user1_id_fkey (id, username, spectrum_score, political_label, custom_label),
      user2:profiles!debate_sessions_user2_id_fkey (id, username, spectrum_score, political_label, custom_label)
    `)
    .eq('id', sessionId)
    .single()

  if (!session) notFound()

  const isParticipant = session.user1_id === user.id || session.user2_id === user.id
  if (!isParticipant) redirect('/debate')

  if (session.status === 'completed') {
    redirect(`/debate/${sessionId}/results`)
  }

  const { data: initialMessages } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  const { data: initialInterventions } = await supabase
    .from('ai_interventions')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  return (
    <ChatRoom
      session={session}
      currentUserId={user.id}
      initialMessages={initialMessages || []}
      initialInterventions={initialInterventions || []}
    />
  )
}

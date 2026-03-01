import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Trophy, Star, MessageSquare, TrendingUp, RotateCcw, User } from 'lucide-react'

export default async function ResultsPage({
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
      topics (title, category),
      user1:profiles!debate_sessions_user1_id_fkey (id, username, spectrum_score, political_label, custom_label),
      user2:profiles!debate_sessions_user2_id_fkey (id, username, spectrum_score, political_label, custom_label)
    `)
    .eq('id', sessionId)
    .single()

  if (!session) notFound()

  const isParticipant = session.user1_id === user.id || session.user2_id === user.id
  if (!isParticipant) redirect('/debate')

  const { data: scores } = await supabase
    .from('debate_scores')
    .select('*')
    .eq('session_id', sessionId)

  const myScore = scores?.find(s => s.user_id === user.id)
  const opponentScore = scores?.find(s => s.user_id !== user.id)

  const me = session.user1_id === user.id ? session.user1 : session.user2
  const opponent = session.user1_id === user.id ? session.user2 : session.user1

  const meritPoints = myScore?.merit_points_awarded ?? 0
  const totalScore = myScore?.total_score ?? 0

  const scoreCategories = [
    { key: 'respectfulness', label: 'Respectfulness', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400' },
    { key: 'evidence_use', label: 'Use of Evidence', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400' },
    { key: 'topic_adherence', label: 'Stayed on Topic', icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-400' },
    { key: 'open_mindedness', label: 'Open-Mindedness', icon: Trophy, color: 'text-purple-400', bg: 'bg-purple-400' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-3">
          {totalScore >= 30 ? '🏆' : totalScore >= 20 ? '⭐' : '💬'}
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Debate Complete</h1>
        <p className="text-slate-400">
          {(session.topics as { title?: string } | null)?.title ?? 'Political Debate'}
        </p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Badge className="bg-yellow-600 hover:bg-yellow-600 text-lg px-4 py-1">
            +{meritPoints} Merit Points
          </Badge>
        </div>
      </div>

      {/* Score breakdown */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Your Score: {totalScore}/40
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {scoreCategories.map(({ key, label, icon: Icon, color, bg }) => {
            const myVal = myScore?.[key as keyof typeof myScore] as number ?? 0
            const oppVal = opponentScore?.[key as keyof typeof opponentScore] as number ?? 0
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <div className={`flex items-center gap-1.5 text-sm ${color}`}>
                    <Icon className="w-4 h-4" />
                    {label}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-white font-bold">{myVal}/10</span>
                    {opponentScore && (
                      <span className="text-slate-500">vs {oppVal}/10</span>
                    )}
                  </div>
                </div>
                <Progress value={myVal * 10} className="h-2 bg-slate-700" />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Opponent comparison */}
      {opponent && opponentScore && (
        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white text-base">
              Your opponent: @{(opponent as { username?: string })?.username}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-400">{totalScore}/40</div>
                <div className="text-slate-500 text-sm">Your score</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">{opponentScore.total_score}/40</div>
                <div className="text-slate-500 text-sm">Their score</div>
              </div>
            </div>
            <p className="text-slate-400 text-sm text-center mt-3">
              Remember: this was scored on conduct, not whose argument was &quot;right&quot;. Both views matter.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button asChild className="flex-1 bg-blue-600 hover:bg-blue-700">
          <Link href="/debate">
            <RotateCcw className="w-4 h-4 mr-2" />
            Debate Again
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1 border-slate-600 text-slate-300">
          <Link href="/leaderboard">
            <Trophy className="w-4 h-4 mr-2" />
            Leaderboard
          </Link>
        </Button>
        {opponent && (
          <Button asChild variant="outline" className="border-slate-600 text-slate-300">
            <Link href={`/profile/${(opponent as { username?: string })?.username}`}>
              <User className="w-4 h-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}

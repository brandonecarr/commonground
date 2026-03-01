import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Medal, Award } from 'lucide-react'
import Link from 'next/link'
import { formatSpectrumLabel } from '@/lib/quiz/questions'

export default async function LeaderboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: leaders } = await supabase
    .from('profiles')
    .select('id, username, total_merit_points, debates_completed, spectrum_score, political_label, custom_label')
    .order('total_merit_points', { ascending: false })
    .limit(100)

  const myRank = leaders?.findIndex(l => l.id === user?.id) ?? -1

  function RankIcon({ rank }: { rank: number }) {
    if (rank === 0) return <Trophy className="w-5 h-5 text-yellow-400" />
    if (rank === 1) return <Medal className="w-5 h-5 text-slate-300" />
    if (rank === 2) return <Award className="w-5 h-5 text-amber-600" />
    return <span className="text-slate-500 font-bold text-sm w-5 text-center">{rank + 1}</span>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          Leaderboard
        </h1>
        <p className="text-slate-400">
          Ranked by merit points earned through respectful, evidence-based debate.
        </p>
      </div>

      {myRank >= 0 && (
        <Card className="border-blue-700 bg-blue-900/20 mb-6">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <span className="text-blue-400 font-bold">Your rank: #{myRank + 1}</span>
              <span className="text-slate-400">·</span>
              <span className="text-white">{leaders?.[myRank]?.total_merit_points ?? 0} merit points</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">Top Debaters</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(!leaders || leaders.length === 0) ? (
            <p className="text-slate-400 text-center py-8">No debates completed yet. Be the first!</p>
          ) : (
            <div>
              {leaders.map((leader, index) => {
                const isMe = leader.id === user?.id
                const label = leader.custom_label || leader.political_label || 'Unknown'
                const specLabel = formatSpectrumLabel(leader.spectrum_score || 0)
                return (
                  <Link
                    key={leader.id}
                    href={`/profile/${leader.username}`}
                    className={`flex items-center gap-4 px-4 py-3 border-b border-slate-700 last:border-0 hover:bg-slate-700/30 transition-colors ${
                      isMe ? 'bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="w-7 flex items-center justify-center flex-shrink-0">
                      <RankIcon rank={index} />
                    </div>
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarFallback
                        className={`text-sm font-bold text-white ${
                          index === 0 ? 'bg-yellow-600' : index === 1 ? 'bg-slate-500' : index === 2 ? 'bg-amber-700' : 'bg-slate-700'
                        }`}
                      >
                        {leader.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium ${isMe ? 'text-blue-300' : 'text-white'}`}>
                          @{leader.username}
                          {isMe && <span className="text-blue-500 ml-1">(you)</span>}
                        </span>
                        <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 hidden sm:inline-flex">
                          {label}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500">
                        {leader.debates_completed} debates · {specLabel}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-yellow-400 font-bold">{leader.total_merit_points}</div>
                      <div className="text-slate-500 text-xs">pts</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

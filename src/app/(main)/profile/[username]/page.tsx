import { notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Trophy, MessageSquare, Star, TrendingUp } from 'lucide-react'
import { formatSpectrumLabel } from '@/lib/quiz/questions'
import FriendButton from '@/components/profile/FriendButton'

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()
  // Service client bypasses debate_sessions RLS so visitors can see all debate history
  const serviceSupabase = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  // Get posts
  const { data: posts } = await supabase
    .from('posts')
    .select('id, content, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Get debate history — use service client so RLS on debate_sessions
  // doesn't hide sessions when viewing another user's profile
  const { data: scores } = await serviceSupabase
    .from('debate_scores')
    .select(`
      *,
      debate_sessions (
        topic_id,
        started_at,
        topics (title)
      )
    `)
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const displayLabel = profile.custom_label || profile.political_label || 'Unknown'
  const spectrumLabel = formatSpectrumLabel(profile.spectrum_score || 0)
  const isOwnProfile = user?.id === profile.id

  const avgScore =
    scores && scores.length > 0
      ? Math.round(scores.reduce((acc, s) => acc + s.total_score, 0) / scores.length)
      : 0

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600">
              <AvatarFallback className="text-2xl font-bold text-white bg-transparent">
                {profile.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white">@{profile.username}</h1>
                <Badge className="bg-blue-700 hover:bg-blue-700">{displayLabel}</Badge>
                <Badge variant="outline" className="border-slate-500 text-slate-400">
                  {spectrumLabel}
                </Badge>
              </div>
              {profile.bio && (
                <p className="text-slate-400 mb-3">{profile.bio}</p>
              )}
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <div className="text-xl font-bold text-yellow-400">{profile.total_merit_points}</div>
                  <div className="text-slate-500">Merit Points</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-400">{profile.debates_completed}</div>
                  <div className="text-slate-500">Debates</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">{avgScore}</div>
                  <div className="text-slate-500">Avg Score</div>
                </div>
              </div>
            </div>
            {!isOwnProfile && user && (
              <FriendButton profileId={profile.id} currentUserId={user.id} />
            )}
          </div>

          {/* Spectrum Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Far Left</span>
              <span>Political Spectrum</span>
              <span>Far Right</span>
            </div>
            <div className="relative h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 rounded-full">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-slate-800 shadow-lg"
                style={{
                  left: `${((profile.spectrum_score + 1) / 2) * 100}%`,
                  transform: 'translateX(-50%) translateY(-50%)',
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Respectfulness', icon: Star, color: 'text-yellow-400' },
          { label: 'Evidence Use', icon: TrendingUp, color: 'text-green-400' },
          { label: 'On Topic', icon: MessageSquare, color: 'text-blue-400' },
          { label: 'Open-Minded', icon: Trophy, color: 'text-purple-400' },
        ].map(({ label, icon: Icon, color }) => {
          const validKey = label === 'Respectfulness' ? 'respectfulness'
            : label === 'Evidence Use' ? 'evidence_use'
            : label === 'On Topic' ? 'topic_adherence'
            : 'open_mindedness'
          const avg =
            scores && scores.length > 0
              ? (
                  scores.reduce((acc, s) => acc + (s[validKey as keyof typeof s] as number || 0), 0) /
                  scores.length
                ).toFixed(1)
              : '—'
          return (
            <Card key={label} className="border-slate-700 bg-slate-800/50 text-center">
              <CardContent className="pt-4 pb-3">
                <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
                <div className={`text-xl font-bold ${color}`}>{avg}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Posts */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-400" />
            Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!posts || posts.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No posts yet.</p>
          ) : (
            <div className="space-y-3">
              {posts.map((post, i) => (
                <div key={post.id}>
                  {i > 0 && <Separator className="bg-slate-700" />}
                  <div className="py-2">
                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    <p className="text-slate-600 text-xs mt-1">
                      {new Date(post.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debate History */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            Recent Debates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!scores || scores.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No debates yet. Head to the Debate tab!</p>
          ) : (
            <div className="space-y-3">
              {scores.map((score, i) => {
                const session = score.debate_sessions as { topics?: { title: string }; started_at: string } | null
                const topicTitle = session?.topics?.title ?? 'Unknown Topic'
                const date = session?.started_at
                  ? new Date(session.started_at).toLocaleDateString()
                  : ''
                return (
                  <div key={score.id}>
                    {i > 0 && <Separator className="bg-slate-700" />}
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-white text-sm font-medium">{topicTitle}</p>
                        <p className="text-slate-500 text-xs">{date}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-yellow-400 font-bold">{score.total_score}/40</div>
                        <div className="text-slate-500 text-xs">+{score.merit_points_awarded} pts</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

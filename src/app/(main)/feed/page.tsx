import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Users } from 'lucide-react'
import CreatePost from '@/components/feed/CreatePost'
import FriendRequests from '@/components/feed/FriendRequests'
import Challenges from '@/components/feed/Challenges'
import DebateButton from '@/components/feed/DebateButton'
import { formatSpectrumLabel } from '@/lib/quiz/questions'

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // All posts — global feed
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      profile:profiles!posts_user_id_fkey (
        id, username, spectrum_score, political_label, custom_label
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  // Pending friend requests
  const { data: pendingRequests } = await supabase
    .from('friendships')
    .select(`
      id, requester_id,
      requester:profiles!friendships_requester_id_fkey (
        id, username, political_label, custom_label, spectrum_score
      )
    `)
    .eq('addressee_id', user!.id)
    .eq('status', 'pending')

  // Incoming debate challenges (someone challenged me)
  const { data: incomingChallenges } = await supabase
    .from('debate_challenges')
    .select(`
      id, challenger_id, challengee_id, session_id, status,
      challenger:profiles!debate_challenges_challenger_id_fkey (
        id, username, political_label, custom_label, spectrum_score
      )
    `)
    .eq('challengee_id', user!.id)
    .eq('status', 'pending')

  // My sent challenges that were accepted (time to join)
  const { data: acceptedChallenges } = await supabase
    .from('debate_challenges')
    .select(`
      id, challenger_id, challengee_id, session_id, status,
      challengee:profiles!debate_challenges_challengee_id_fkey (
        id, username
      )
    `)
    .eq('challenger_id', user!.id)
    .eq('status', 'accepted')
    .not('session_id', 'is', null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Feed</h1>
        <p className="text-slate-400 text-sm">See what everyone across the spectrum is saying</p>
      </div>

      {/* Pending friend requests */}
      {pendingRequests && pendingRequests.length > 0 && (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <FriendRequests requests={pendingRequests as any} currentUserId={user!.id} />
      )}

      {/* Debate challenges */}
      {((incomingChallenges && incomingChallenges.length > 0) ||
        (acceptedChallenges && acceptedChallenges.length > 0)) && (
        <Challenges
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          incoming={incomingChallenges as any || []}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          accepted={acceptedChallenges as any || []}
          currentUserId={user!.id}
        />
      )}

      {/* Create post */}
      <CreatePost userId={user!.id} />

      {/* Feed */}
      {!posts || posts.length === 0 ? (
        <Card className="border-slate-700 bg-slate-800/30">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">No posts yet</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-4">
              Be the first to post, or jump into a debate to meet people from across the spectrum.
            </p>
            <Link
              href="/debate"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Find a debate partner
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts?.map((post) => {
            const profile = post.profile as {
              id: string
              username: string
              spectrum_score: number
              political_label: string | null
              custom_label: string | null
            } | null
            if (!profile) return null
            const label = profile.custom_label || profile.political_label || 'Unknown'
            const isMe = post.user_id === user!.id
            return (
              <Card key={post.id} className="border-slate-700 bg-slate-800/50">
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <Link href={`/profile/${profile.username}`}>
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className={`text-sm font-bold text-white ${isMe ? 'bg-blue-700' : 'bg-purple-700'}`}>
                          {profile.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Link href={`/profile/${profile.username}`} className="text-white font-medium hover:underline">
                          @{profile.username}
                        </Link>
                        <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                          {label}
                        </Badge>
                        <span className="text-slate-600 text-xs">
                          {formatSpectrumLabel(profile.spectrum_score)}
                        </span>
                        {isMe && <span className="text-slate-600 text-xs">· you</span>}
                      </div>
                      <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-slate-600 text-xs">
                          {new Date(post.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {!isMe && (
                          <DebateButton
                            postAuthorId={profile.id}
                            postAuthorUsername={profile.username}
                            currentUserId={user!.id}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

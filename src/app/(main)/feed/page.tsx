import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MessageSquare, Users } from 'lucide-react'
import CreatePost from '@/components/feed/CreatePost'
import FriendRequests from '@/components/feed/FriendRequests'
import { formatSpectrumLabel } from '@/lib/quiz/questions'

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get accepted friends
  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
    .eq('status', 'accepted')

  const friendIds = (friendships || []).map(f =>
    f.requester_id === user!.id ? f.addressee_id : f.requester_id
  )

  // Get posts from friends + self
  const feedUserIds = [user!.id, ...friendIds]

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      profile:profiles!posts_user_id_fkey (
        id, username, spectrum_score, political_label, custom_label
      )
    `)
    .in('user_id', feedUserIds)
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Your Feed</h1>
        <p className="text-slate-400 text-sm">Posts from you and your CommonGround friends</p>
      </div>

      {/* Pending friend requests */}
      {pendingRequests && pendingRequests.length > 0 && (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <FriendRequests requests={pendingRequests as any} currentUserId={user!.id} />
      )}

      {/* Create post */}
      <CreatePost userId={user!.id} />

      {/* Feed */}
      {!posts || posts.length === 0 ? (
        <Card className="border-slate-700 bg-slate-800/30">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">Your feed is empty</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-4">
              Post something above, or complete a debate and add your opponent as a friend. Their posts will appear here — even if you disagree on everything.
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
          {posts?.map((post, i) => {
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
                      <p className="text-slate-600 text-xs mt-2">
                        {new Date(post.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
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

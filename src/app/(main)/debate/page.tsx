import { createClient } from '@/lib/supabase/server'
import TopicSelector from '@/components/debate/TopicSelector'

export default async function DebatePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, spectrum_score, political_label, custom_label')
    .eq('id', user!.id)
    .single()

  const { data: topics } = await supabase
    .from('topics')
    .select('*')
    .eq('is_active', true)
    .order('category')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Find a Debate</h1>
        <p className="text-slate-400">
          Choose a topic or enter the roulette. We&apos;ll match you with someone from the other side of the spectrum.
        </p>
      </div>
      <TopicSelector topics={topics || []} profile={profile!} />
    </div>
  )
}

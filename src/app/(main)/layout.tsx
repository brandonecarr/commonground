import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if quiz is completed
  const { data: profile } = await supabase
    .from('profiles')
    .select('quiz_completed, username')
    .eq('id', user.id)
    .single()

  if (profile && !profile.quiz_completed) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar username={profile?.username ?? ''} />
      <main className="max-w-4xl mx-auto px-4 pt-20 pb-10">{children}</main>
    </div>
  )
}

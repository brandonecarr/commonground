'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { MessageSquare, Trophy, Users, Newspaper, LogOut, User } from 'lucide-react'

interface NavBarProps {
  username: string
}

export default function NavBar({ username }: NavBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { href: '/feed', icon: Newspaper, label: 'Feed' },
    { href: '/debate', icon: MessageSquare, label: 'Debate' },
    { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { href: `/profile/${username}`, icon: User, label: 'Profile' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-700">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/feed" className="flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-400" />
          <span className="font-bold text-white text-lg">CommonGround</span>
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname.startsWith(href)
                  ? 'bg-blue-900/50 text-blue-300'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-slate-400 hover:text-white ml-1"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </nav>
  )
}

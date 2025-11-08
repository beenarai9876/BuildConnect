'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Building2, LayoutDashboard, FileText, PlusCircle, User, LogOut, Briefcase, Search, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/context/UserContext'
import { cn } from '@/lib/utils'

export default function DashboardLayout({ children, role }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile } = useUser()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const builderNavItems = [
    { href: '/builder/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/builder/projects', label: 'My Projects', icon: FileText },
    { href: '/builder/projects/new', label: 'Post Project', icon: PlusCircle },
    { href: '/builder/profile', label: 'Profile', icon: User },
  ]

  const contractorNavItems = [
    { href: '/contractor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/contractor/projects', label: 'Browse Projects', icon: Search },
    { href: '/contractor/bids', label: 'My Bids', icon: Briefcase },
    { href: '/contractor/profile', label: 'Profile', icon: User },
  ]

  const navItems = role === 'builder' ? builderNavItems : contractorNavItems

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">BuildConnect</span>
          </Link>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{profile?.full_name || user?.email}</div>
              <div className="text-xs text-gray-500 capitalize">{profile?.user_type}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r min-h-[calc(100vh-73px)] sticky top-[73px] hidden md:block">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="container mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

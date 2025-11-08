'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Briefcase, CheckCircle, PlusCircle, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

export default function BuilderDashboard() {
  const { user, loading } = useUser()
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState({ active: 0, bids: 0, completed: 0 })
  const [loadingData, setLoadingData] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*, bids(id)')
        .eq('builder_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (projectsError) throw projectsError

      setProjects(projectsData || [])

      // Calculate stats
      const { data: allProjects } = await supabase
        .from('projects')
        .select('status, bids(id)')
        .eq('builder_id', user.id)

      const active = allProjects?.filter(p => p.status === 'open').length || 0
      const completed = allProjects?.filter(p => p.status === 'completed').length || 0
      const totalBids = allProjects?.reduce((sum, p) => sum + (p.bids?.length || 0), 0) || 0

      setStats({ active, bids: totalBids, completed })
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  if (loading || loadingData) {
    return (
      <DashboardLayout role="builder">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="builder">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's an overview of your projects.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Projects</CardTitle>
              <FileText className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.active}</div>
              <p className="text-xs text-gray-500 mt-1">Currently open for bidding</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Bids</CardTitle>
              <Briefcase className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.bids}</div>
              <p className="text-xs text-gray-500 mt-1">Bids received on all projects</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.completed}</div>
              <p className="text-xs text-gray-500 mt-1">Successfully finished projects</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Link href="/builder/projects/new">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Post New Project
              </Button>
            </Link>
            <Link href="/builder/projects">
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                View All Projects
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No projects yet. Post your first project to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <div key={project.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">{project.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{project.city} • {project.project_type}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>₹{project.budget_min?.toLocaleString()} - ₹{project.budget_max?.toLocaleString()}</span>
                          <span>•</span>
                          <span>{project.bids?.length || 0} bids</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={project.status === 'open' ? 'default' : 'secondary'}>
                          {project.status}
                        </Badge>
                        <Link href={`/builder/projects/${project.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, Search, Eye, Calendar, MapPin, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export default function BuilderProjects() {
  const { user, loading } = useUser()
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [filteredProjects, setFilteredProjects] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [loadingData, setLoadingData] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchProjects()
    }
  }, [user])

  useEffect(() => {
    filterProjects()
  }, [searchTerm, activeTab, projects])

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*, bids(id, status)')
        .eq('builder_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const filterProjects = () => {
    let filtered = projects

    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(p => p.status === activeTab)
    }

    // Filter by search
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.city.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredProjects(filtered)
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
            <p className="text-gray-600 mt-1">Manage all your construction projects</p>
          </div>
          <Link href="/builder/projects/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Post New Project
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search projects by title or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="awarded">Awarded</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredProjects.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <PlusCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 mb-4">No projects found</p>
                  <Link href="/builder/projects/new">
                    <Button>Post Your First Project</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {filteredProjects.map((project) => (
                  <Card key={project.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">{project.title}</h3>
                            <Badge
                              variant={project.status === 'open' ? 'default' : project.status === 'awarded' ? 'secondary' : 'outline'}
                            >
                              {project.status}
                            </Badge>
                          </div>
                          <p className="text-gray-600 line-clamp-2">{project.description}</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span>{project.city}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="h-4 w-4" />
                          <span>₹{project.budget_min?.toLocaleString()} - ₹{project.budget_max?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{project.duration_days} days</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{project.bids?.length || 0}</span> bids received
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <span className="text-sm text-gray-500">
                          Posted {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                        </span>
                        <Link href={`/builder/projects/${project.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

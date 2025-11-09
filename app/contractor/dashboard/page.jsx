'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Briefcase, Trophy, Star, Search, Eye, MapPin, DollarSign, Filter, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export default function ContractorDashboard() {
  const { user, loading } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState({ totalBids: 0, accepted: 0, rating: 0 })
  const [recentProjects, setRecentProjects] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [availableLocations, setAvailableLocations] = useState([])
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
      // Get contractor profile
      const { data: contractorData } = await supabase
        .from('contractors')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // Get bids stats
      const { data: bidsData } = await supabase
        .from('bids')
        .select('status')
        .eq('contractor_id', user.id)

      const totalBids = bidsData?.length || 0
      const accepted = bidsData?.filter(b => b.status === 'accepted').length || 0
      const rating = contractorData?.rating || 0

      setStats({ totalBids, accepted, rating })

      // Get recent open projects matching contractor's locations
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*, bids!left(id, contractor_id)')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(20)

      setRecentProjects(projectsData || [])

      // Extract unique locations with counts
      if (projectsData && projectsData.length > 0) {
        const locationCounts = projectsData.reduce((acc, project) => {
          const city = project.city
          if (city) {
            acc[city] = (acc[city] || 0) + 1
          }
          return acc
        }, {})

        const locations = Object.entries(locationCounts).map(([city, count]) => ({
          city,
          count
        })).sort((a, b) => b.count - a.count)

        setAvailableLocations(locations)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  if (loading || loadingData) {
    return (
      <DashboardLayout role="contractor">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  // Filter projects by selected location
  const filteredProjects = selectedLocation === 'all'
    ? recentProjects
    : recentProjects.filter(project => project.city === selectedLocation)

  return (
    <DashboardLayout role="contractor">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your overview.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Bids</CardTitle>
              <Briefcase className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalBids}</div>
              <p className="text-xs text-gray-500 mt-1">Bids submitted</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Bids Won</CardTitle>
              <Trophy className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.accepted}</div>
              <p className="text-xs text-gray-500 mt-1">Projects awarded</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Your Rating</CardTitle>
              <Star className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.rating.toFixed(1)}★</div>
              <p className="text-xs text-gray-500 mt-1">Average rating</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Link href="/contractor/projects">
              <Button>
                <Search className="mr-2 h-4 w-4" />
                Browse Projects
              </Button>
            </Link>
            <Link href="/contractor/bids">
              <Button variant="outline">
                <Briefcase className="mr-2 h-4 w-4" />
                View My Bids
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* New Projects */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle>New Projects for You</CardTitle>
              {availableLocations.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Filter className="h-4 w-4" />
                  <span>Filter by location</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Location Filter */}
            {availableLocations.length > 0 && (
              <div className="mb-6 animate-fade-in">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedLocation('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedLocation === 'all'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {selectedLocation === 'all' && <X className="h-3 w-3" />}
                      All Locations
                      <Badge variant="secondary" className="ml-1 bg-white/20 text-current border-0">
                        {recentProjects.length}
                      </Badge>
                    </span>
                  </button>
                  {availableLocations.map(({ city, count }) => (
                    <button
                      key={city}
                      onClick={() => setSelectedLocation(city)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        selectedLocation === city
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        {city}
                        <Badge variant="secondary" className="ml-1 bg-white/20 text-current border-0">
                          {count}
                        </Badge>
                      </span>
                    </button>
                  ))}
                </div>
                {selectedLocation !== 'all' && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 animate-fade-in">
                    <div className="h-1 w-1 rounded-full bg-green-600"></div>
                    <span>Showing {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'} in <strong>{selectedLocation}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Projects List */}
            {filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-gray-500 animate-fade-in">
                <Search className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No projects found{selectedLocation !== 'all' ? ` in ${selectedLocation}` : ''}</p>
                {selectedLocation !== 'all' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedLocation('all')}
                    className="mt-4"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Filter
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4 stagger-animation">
                {filteredProjects.map((project) => {
                  const alreadyBid = project.bids?.some(b => b.contractor_id === user.id)
                  return (
                    <div key={project.id} className="border rounded-lg p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 hover:shadow-md transition-all duration-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg text-gray-900">{project.title}</h3>
                            {alreadyBid && <Badge variant="secondary">Already Bid</Badge>}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{project.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {project.city}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              ₹{project.budget_min?.toLocaleString()} - ₹{project.budget_max?.toLocaleString()}
                            </span>
                            <span>{formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                        <Link href={`/contractor/projects/${project.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

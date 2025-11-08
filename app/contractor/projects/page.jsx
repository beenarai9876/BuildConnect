'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Eye, MapPin, DollarSign, Calendar, Briefcase } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { formatDistanceToNow, differenceInDays } from 'date-fns'

const CITIES = ['All', 'Patna', 'Lucknow', 'Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad']
const PROJECT_TYPES = ['All', 'Residential', 'Commercial', 'Infrastructure', 'Renovation']

export default function BrowseProjects() {
  const { user, loading } = useUser()
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [filteredProjects, setFilteredProjects] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCity, setSelectedCity] = useState('All')
  const [selectedType, setSelectedType] = useState('All')
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
  }, [searchTerm, selectedCity, selectedType, projects])

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*, bids!left(id, contractor_id)')
        .eq('status', 'open')
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

    // Filter by city
    if (selectedCity !== 'All') {
      filtered = filtered.filter(p => p.city === selectedCity)
    }

    // Filter by type
    if (selectedType !== 'All') {
      filtered = filtered.filter(p => p.project_type === selectedType.toLowerCase())
    }

    // Filter by search
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredProjects(filtered)
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

  return (
    <DashboardLayout role="contractor">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Browse Projects</h1>
          <p className="text-gray-600 mt-1">Find and bid on construction projects</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Project Type" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="text-sm text-gray-600">
          Showing {filteredProjects.length} projects
        </div>

        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No projects found matching your criteria</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredProjects.map((project) => {
              const alreadyBid = project.bids?.some(b => b.contractor_id === user.id)
              const daysLeft = differenceInDays(new Date(project.bidding_deadline), new Date())
              const isUrgent = daysLeft <= 3 && daysLeft >= 0
              const isNew = differenceInDays(new Date(), new Date(project.created_at)) === 0

              return (
                <Card key={project.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{project.title}</h3>
                          {isNew && <Badge>NEW</Badge>}
                          {isUrgent && <Badge variant="destructive">URGENT</Badge>}
                          {alreadyBid && <Badge variant="secondary">Already Bid</Badge>}
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
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Briefcase className="h-4 w-4" />
                        <span>{project.bids?.length || 0} bids</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {project.required_specializations?.slice(0, 3).map(spec => (
                          <Badge key={spec} variant="outline">{spec}</Badge>
                        ))}
                        {project.required_specializations?.length > 3 && (
                          <Badge variant="outline">+{project.required_specializations.length - 3} more</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        <span>Posted {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
                        <span className="mx-2">•</span>
                        <span className={daysLeft < 0 ? 'text-red-600' : ''}>
                          {daysLeft < 0 ? 'Deadline passed' : `${daysLeft} days left to bid`}
                        </span>
                      </div>
                      <Link href={`/contractor/projects/${project.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View & Bid
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

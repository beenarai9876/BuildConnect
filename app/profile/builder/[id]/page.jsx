'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  ArrowLeft,
  TrendingUp,
  CheckCircle,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function BuilderProfilePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [builder, setBuilder] = useState(null)
  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState({
    total_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    total_spent: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBuilderProfile()
  }, [params.id])

  const fetchBuilderProfile = async () => {
    try {
      // Fetch builder profile
      const { data: builderData, error: builderError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', params.id)
        .eq('user_type', 'builder')
        .single()

      if (builderError) throw builderError

      setBuilder(builderData)

      // Fetch builder's projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          bids (count)
        `)
        .eq('builder_id', params.id)
        .order('created_at', { ascending: false })

      if (!projectsError && projectsData) {
        setProjects(projectsData)

        // Calculate stats
        const total = projectsData.length
        const active = projectsData.filter(p => p.status === 'open' || p.status === 'awarded').length
        const completed = projectsData.filter(p => p.status === 'completed').length

        // Calculate total budget of awarded projects
        const totalSpent = projectsData
          .filter(p => p.status === 'awarded' || p.status === 'completed')
          .reduce((sum, p) => {
            // Extract max budget from budget_range
            const match = p.budget_range?.match(/(\d+)\s*-\s*(\d+)/)
            const maxBudget = match ? parseInt(match[2]) : 0
            return sum + maxBudget
          }, 0)

        setStats({
          total_projects: total,
          active_projects: active,
          completed_projects: completed,
          total_spent: totalSpent
        })
      }
    } catch (error) {
      console.error('Error fetching builder profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-green-100 text-green-700 border-green-200',
      awarded: 'bg-blue-100 text-blue-700 border-blue-200',
      completed: 'bg-purple-100 text-purple-700 border-purple-200',
      cancelled: 'bg-gray-100 text-gray-700 border-gray-200'
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.open}`}>
        {status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading builder profile...</p>
        </div>
      </div>
    )
  }

  if (!builder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Builder not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-white hover:bg-white/20 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="w-32 h-32 bg-gradient-to-br from-white to-purple-100 rounded-2xl flex items-center justify-center text-6xl font-bold text-purple-600 shadow-lg">
              {builder.company_name?.[0] || builder.full_name?.[0] || 'B'}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{builder.company_name || builder.full_name}</h1>
              <p className="text-purple-100 text-lg mb-4">{builder.full_name}</p>

              {/* Stats */}
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  <span className="font-semibold">{stats.total_projects}</span>
                  <span className="text-purple-100">Total Projects</span>
                </div>
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">{stats.active_projects}</span>
                  <span className="text-purple-100">Active</span>
                </div>
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">{stats.completed_projects}</span>
                  <span className="text-purple-100">Completed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Projects */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Projects</h2>

            {projects.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No projects to display</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all hover:border-blue-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">{project.title}</h3>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {project.project_type}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {project.city}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(project.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {getStatusBadge(project.status)}
                    </div>

                    <p className="text-gray-700 mb-4 line-clamp-2">{project.description}</p>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex gap-4 text-sm">
                        <span className="text-gray-600">
                          Budget: <span className="font-semibold text-gray-900">{project.budget_range}</span>
                        </span>
                        {project.bids && project.bids.length > 0 && (
                          <span className="text-gray-600">
                            Bids: <span className="font-semibold text-blue-600">{project.bids[0].count}</span>
                          </span>
                        )}
                      </div>

                      {project.status === 'open' && (
                        <Link href={`/contractor/browse/${project.id}`}>
                          <Button size="sm" variant="outline" className="hover:bg-blue-50">
                            View Details
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-600" />
                Contact Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-gray-700">
                  <Mail className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <a href={`mailto:${builder.email}`} className="hover:text-purple-600 transition-colors break-all">
                    {builder.email}
                  </a>
                </div>
                {builder.phone && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Phone className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    <a href={`tel:${builder.phone}`} className="hover:text-purple-600 transition-colors">
                      {builder.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Overview */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
              <h3 className="font-bold mb-4">Overview</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Projects</span>
                  <span className="font-bold text-xl text-purple-600">{stats.total_projects}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Active Projects</span>
                  <span className="font-bold text-xl text-blue-600">{stats.active_projects}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-bold text-xl text-green-600">{stats.completed_projects}</span>
                </div>
              </div>
            </div>

            {/* Member Since */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Member since</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(builder.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Activity Badge */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <h3 className="font-bold text-green-900">Active Builder</h3>
              </div>
              <p className="text-sm text-green-700">
                {stats.active_projects > 0
                  ? `Currently managing ${stats.active_projects} active ${stats.active_projects === 1 ? 'project' : 'projects'}`
                  : 'Looking for quality contractors'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

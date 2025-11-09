'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Star,
  Award,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  MessageSquare,
  Clock,
  DollarSign,
  ExternalLink,
  ArrowLeft,
  CheckCircle,
  Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ContractorProfilePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [contractor, setContractor] = useState(null)
  const [ratings, setRatings] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('about')

  useEffect(() => {
    fetchContractorProfile()
    logProfileView()
  }, [params.id])

  const logProfileView = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.id !== params.id) {
        await supabase.from('profile_views').insert({
          viewer_id: user.id,
          viewed_profile_id: params.id,
          context: 'direct'
        })
      }
    } catch (error) {
      console.error('Error logging profile view:', error)
    }
  }

  const fetchContractorProfile = async () => {
    try {
      // Fetch contractor with profile info using the view
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractor_stats')
        .select('*')
        .eq('user_id', params.id)
        .single()

      if (contractorError) throw contractorError

      setContractor(contractorData)

      // Fetch ratings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('ratings')
        .select(`
          *,
          builder:builder_id (
            full_name,
            company_name
          ),
          project:project_id (
            title,
            project_type
          )
        `)
        .eq('contractor_id', params.id)
        .order('created_at', { ascending: false })

      if (!ratingsError) {
        setRatings(ratingsData || [])
      }

      // Fetch awarded/completed projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('awarded_to', params.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!projectsError) {
        setProjects(projectsData || [])
      }
    } catch (error) {
      console.error('Error fetching contractor profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading contractor profile...</p>
        </div>
      </div>
    )
  }

  if (!contractor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Contractor not found</p>
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
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white">
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
            <div className="w-32 h-32 bg-gradient-to-br from-white to-blue-100 rounded-2xl flex items-center justify-center text-6xl font-bold text-blue-600 shadow-lg">
              {contractor.company_name?.[0] || contractor.full_name?.[0] || 'C'}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{contractor.company_name || contractor.full_name}</h1>
              <p className="text-blue-100 text-lg mb-4">{contractor.full_name}</p>

              {/* Rating Summary */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                  {renderStars(Math.round(contractor.average_rating))}
                  <span className="font-bold text-xl">{contractor.average_rating.toFixed(1)}</span>
                </div>
                <div className="text-blue-100">
                  {contractor.total_ratings} {contractor.total_ratings === 1 ? 'review' : 'reviews'}
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">{contractor.total_projects_completed}</span>
                  <span className="text-blue-100">Projects Completed</span>
                </div>
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  <span className="font-semibold">{contractor.experience_years}</span>
                  <span className="text-blue-100">Years Experience</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex gap-6">
            {['about', 'reviews', 'projects'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 font-medium capitalize transition-colors relative ${
                  activeTab === tab
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'about' && (
              <>
                {/* Bio */}
                {contractor.bio && (
                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      About
                    </h2>
                    <p className="text-gray-700 leading-relaxed">{contractor.bio}</p>
                  </div>
                )}

                {/* Specializations */}
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    Specializations
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {contractor.specializations?.map((spec) => (
                      <span
                        key={spec}
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 px-4 py-2 rounded-full font-medium border border-blue-200"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Detailed Ratings */}
                {contractor.total_ratings > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-xl font-bold mb-6">Performance Metrics</h2>
                    <div className="space-y-4">
                      {[
                        { label: 'Quality', score: contractor.quality_score, icon: Award },
                        { label: 'Communication', score: contractor.communication_score, icon: MessageSquare },
                        { label: 'Timeline', score: contractor.timeline_score, icon: Clock },
                        { label: 'Budget', score: contractor.budget_score, icon: DollarSign }
                      ].map(({ label, score, icon: Icon }) => (
                        <div key={label}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-blue-600" />
                              <span className="font-medium">{label}</span>
                            </div>
                            <span className="text-gray-600">{score.toFixed(1)}/5.0</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${(score / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {ratings.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
                    <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No reviews yet</p>
                  </div>
                ) : (
                  ratings.map((rating) => (
                    <div
                      key={rating.id}
                      className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-lg">{rating.review_title}</h3>
                          <p className="text-sm text-gray-600">
                            by {rating.builder?.company_name || rating.builder?.full_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Project: {rating.project?.title}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {renderStars(rating.rating)}
                          <span className="text-sm text-gray-500">
                            {new Date(rating.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{rating.review_text}</p>

                      {/* Detailed ratings */}
                      {(rating.quality_rating || rating.communication_rating || rating.timeline_rating || rating.budget_rating) && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                          {rating.quality_rating && (
                            <div className="text-center">
                              <p className="text-xs text-gray-500">Quality</p>
                              <p className="font-semibold text-blue-600">{rating.quality_rating}/5</p>
                            </div>
                          )}
                          {rating.communication_rating && (
                            <div className="text-center">
                              <p className="text-xs text-gray-500">Communication</p>
                              <p className="font-semibold text-blue-600">{rating.communication_rating}/5</p>
                            </div>
                          )}
                          {rating.timeline_rating && (
                            <div className="text-center">
                              <p className="text-xs text-gray-500">Timeline</p>
                              <p className="font-semibold text-blue-600">{rating.timeline_rating}/5</p>
                            </div>
                          )}
                          {rating.budget_rating && (
                            <div className="text-center">
                              <p className="text-xs text-gray-500">Budget</p>
                              <p className="font-semibold text-blue-600">{rating.budget_rating}/5</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'projects' && (
              <div className="space-y-4">
                {projects.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
                    <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No projects to display</p>
                  </div>
                ) : (
                  projects.map((project) => (
                    <div
                      key={project.id}
                      className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-2">{project.title}</h3>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {project.city}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(project.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-700 mt-3 line-clamp-2">{project.description}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            project.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : project.status === 'awarded'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {project.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <h3 className="font-bold mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-700">
                  <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <a href={`mailto:${contractor.email}`} className="hover:text-blue-600 transition-colors break-all">
                    {contractor.email}
                  </a>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Phone className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <a href={`tel:${contractor.phone}`} className="hover:text-blue-600 transition-colors">
                    {contractor.phone}
                  </a>
                </div>
              </div>
            </div>

            {/* Portfolio */}
            {contractor.portfolio_url && (
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h3 className="font-bold mb-4">Portfolio</h3>
                <a
                  href={contractor.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <span>View Portfolio</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            {/* Certifications */}
            {contractor.certifications && contractor.certifications.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h3 className="font-bold mb-4">Certifications</h3>
                <div className="space-y-2">
                  {contractor.certifications.map((cert, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{cert}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member Since */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Member since</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(contractor.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

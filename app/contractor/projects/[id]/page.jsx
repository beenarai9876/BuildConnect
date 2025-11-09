'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MapPin, Calendar, DollarSign, Clock, Send, Loader2, User, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { format, formatDistanceToNow, isPast } from 'date-fns'

export default function ContractorProjectDetail() {
  const { user } = useUser()
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [project, setProject] = useState(null)
  const [builder, setBuilder] = useState(null)
  const [existingBid, setExistingBid] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [bidData, setBidData] = useState({
    quoted_price: '',
    estimated_duration: '',
    proposal: ''
  })

  useEffect(() => {
    if (user && params.id) {
      fetchProjectDetails()
    }
  }, [user, params.id])

  const fetchProjectDetails = async () => {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Fetch builder profile info
      const { data: builderData } = await supabase
        .from('profiles')
        .select('id, full_name, company_name, email, phone')
        .eq('id', projectData.builder_id)
        .single()

      setBuilder(builderData)

      // Check if user already has a bid
      const { data: bidData, error: bidError } = await supabase
        .from('bids')
        .select('*')
        .eq('project_id', params.id)
        .eq('contractor_id', user.id)
        .maybeSingle()

      if (bidData) {
        setExistingBid(bidData)
        setBidData({
          quoted_price: bidData.quoted_price,
          estimated_duration: bidData.estimated_duration,
          proposal: bidData.proposal
        })
      }
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setBidData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmitBid = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Validation
      if (parseInt(bidData.quoted_price) < project.budget_min || parseInt(bidData.quoted_price) > project.budget_max) {
        throw new Error(`Quoted price should be between ₹${project.budget_min?.toLocaleString()} and ₹${project.budget_max?.toLocaleString()}`)
      }

      if (existingBid) {
        // Update existing bid
        const { error } = await supabase
          .from('bids')
          .update({
            quoted_price: parseInt(bidData.quoted_price),
            estimated_duration: parseInt(bidData.estimated_duration),
            proposal: bidData.proposal
          })
          .eq('id', existingBid.id)

        if (error) throw error
        alert('Bid updated successfully!')
      } else {
        // Create new bid
        const { data: insertedBid, error } = await supabase
          .from('bids')
          .insert([
            {
              project_id: params.id,
              contractor_id: user.id,
              quoted_price: parseInt(bidData.quoted_price),
              estimated_duration: parseInt(bidData.estimated_duration),
              proposal: bidData.proposal,
              status: 'pending'
            }
          ])
          .select()
          .single()

        if (error) throw error

        // Send email notification to builder
        try {
          await fetch('/api/emails/bid-received', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              builderId: project.builder_id,
              projectId: params.id,
              bidId: insertedBid.id
            })
          })
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError)
          // Don't fail the whole operation if email fails
        }

        alert('Bid submitted successfully!')
      }

      router.push('/contractor/bids')
    } catch (error) {
      setError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout role="contractor">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!project) {
    return (
      <DashboardLayout role="contractor">
        <div className="text-center py-12">
          <p className="text-gray-500">Project not found</p>
          <Link href="/contractor/projects">
            <Button className="mt-4">Back to Projects</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const deadlinePassed = isPast(new Date(project.bidding_deadline))
  const canBid = project.status === 'open' && !deadlinePassed && (!existingBid || existingBid.status === 'pending')

  return (
    <DashboardLayout role="contractor">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/contractor/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
              <Badge variant={project.status === 'open' ? 'default' : 'secondary'}>
                {project.status}
              </Badge>
              {existingBid && (
                <Badge variant={existingBid.status === 'accepted' ? 'default' : existingBid.status === 'rejected' ? 'destructive' : 'secondary'}>
                  Bid {existingBid.status}
                </Badge>
              )}
            </div>
            <p className="text-gray-600">Posted {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Project Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-gray-600 whitespace-pre-line">{project.description}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </h3>
                    <p className="text-gray-600">{project.location}, {project.city}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Budget Range
                    </h3>
                    <p className="text-gray-600">₹{project.budget_min?.toLocaleString()} - ₹{project.budget_max?.toLocaleString()}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Start Date
                    </h3>
                    <p className="text-gray-600">{project.start_date ? format(new Date(project.start_date), 'PPP') : 'Not specified'}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Duration
                    </h3>
                    <p className="text-gray-600">{project.duration_days} days</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Required Specializations</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.required_specializations?.map(spec => (
                      <Badge key={spec} variant="outline">{spec}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Bidding Deadline</h3>
                  <p className={deadlinePassed ? 'text-red-600' : 'text-gray-600'}>
                    {format(new Date(project.bidding_deadline), 'PPP p')}
                    {deadlinePassed && ' (Passed)'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Builder Info */}
            {builder && (
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5 text-purple-600" />
                    Posted By
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`/profile/builder/${builder.id}`}
                    className="block hover:bg-gray-50 p-3 rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-purple-700 font-bold text-lg flex-shrink-0">
                        {builder.company_name?.[0] || builder.full_name?.[0] || 'B'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-purple-600 hover:text-purple-700 hover:underline transition-colors">
                          {builder.company_name || builder.full_name}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">{builder.full_name}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <User className="h-3 w-3" />
                          <span>View Profile →</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Bid Form */}
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>
                  {existingBid ? (existingBid.status === 'pending' ? 'Update Your Bid' : 'Your Bid') : 'Submit Your Bid'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!canBid && existingBid && existingBid.status === 'accepted' ? (
                  <div className="bg-green-50 text-green-700 p-4 rounded-lg">
                    <p className="font-semibold mb-1">✔ Congratulations!</p>
                    <p className="text-sm">Your bid has been accepted for this project.</p>
                  </div>
                ) : !canBid && existingBid && existingBid.status === 'rejected' ? (
                  <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                    <p className="font-semibold mb-1">✖ Bid Rejected</p>
                    <p className="text-sm">Your bid was not selected for this project.</p>
                  </div>
                ) : !canBid && deadlinePassed ? (
                  <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg">
                    <p className="font-semibold mb-1">⚠ Bidding Closed</p>
                    <p className="text-sm">The deadline for this project has passed.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitBid} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="quoted_price">Your Quoted Price (₹) *</Label>
                      <Input
                        id="quoted_price"
                        name="quoted_price"
                        type="number"
                        value={bidData.quoted_price}
                        onChange={handleChange}
                        required
                        placeholder="Enter your price"
                        min={project.budget_min}
                        max={project.budget_max}
                      />
                      <p className="text-xs text-gray-500">
                        Budget range: ₹{project.budget_min?.toLocaleString()} - ₹{project.budget_max?.toLocaleString()}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estimated_duration">Estimated Duration (days) *</Label>
                      <Input
                        id="estimated_duration"
                        name="estimated_duration"
                        type="number"
                        value={bidData.estimated_duration}
                        onChange={handleChange}
                        required
                        placeholder="Enter duration"
                        min="1"
                      />
                      <p className="text-xs text-gray-500">
                        Project duration: {project.duration_days} days
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="proposal">Your Proposal *</Label>
                      <Textarea
                        id="proposal"
                        name="proposal"
                        value={bidData.proposal}
                        onChange={handleChange}
                        required
                        rows={6}
                        placeholder="Describe your approach, experience, and why you're the best fit for this project..."
                        minLength="100"
                      />
                      <p className="text-xs text-gray-500">
                        Minimum 100 characters
                      </p>
                    </div>

                    {error && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                        {error}
                      </div>
                    )}

                    <Button type="submit" disabled={submitting} className="w-full">
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {submitting ? (existingBid ? 'Updating...' : 'Submitting...') : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          {existingBid ? 'Update Bid' : 'Submit Bid'}
                        </>
                      )}
                    </Button>
                  </form>
                )}

                {existingBid && existingBid.status === 'pending' && (
                  <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                    ℹ You can update your bid until the deadline or until it's accepted/rejected.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

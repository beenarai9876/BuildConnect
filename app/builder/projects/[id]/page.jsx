'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, MapPin, Calendar, DollarSign, Clock, User, Star, CheckCircle, XCircle, Award, Edit, Save } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import RatingModal from '@/components/RatingModal'

export default function ProjectDetail() {
  const { user } = useUser()
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [project, setProject] = useState(null)
  const [bids, setBids] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBid, setSelectedBid] = useState(null)
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [contractorToRate, setContractorToRate] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    bidding_deadline: '',
    start_date: '',
    duration_days: ''
  })
  const [saveLoading, setSaveLoading] = useState(false)

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

      // Fetch bids with contractor details - sorted by price (lowest first)
      const { data: bidsData, error: bidsError } = await supabase
        .from('bids')
        .select('*')
        .eq('project_id', params.id)
        .order('quoted_price', { ascending: true })  // Sort by lowest price first

      if (bidsError) throw bidsError

      // Fetch contractor details for each bid separately
      const bidsWithContractors = await Promise.all(
        (bidsData || []).map(async (bid) => {
          // Get contractor profile
          const { data: contractorProfile } = await supabase
            .from('profiles')
            .select('full_name, company_name, phone, email')
            .eq('id', bid.contractor_id)
            .single()

          // Get contractor data with ratings
          const { data: contractorData } = await supabase
            .from('contractors')
            .select('specializations, experience_years, team_size, average_rating, total_ratings, total_projects_completed')
            .eq('user_id', bid.contractor_id)
            .single()

          return {
            ...bid,
            contractor: {
              ...contractorData,
              profiles: contractorProfile
            }
          }
        })
      )

      setBids(bidsWithContractors)
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptBid = async () => {
    if (!selectedBid) return

    setActionLoading(true)
    try {
      console.log('Accepting bid:', selectedBid.id)
      console.log('Project ID:', params.id)
      console.log('Contractor ID:', selectedBid.contractor_id)

      // Use the database function for atomic operation
      const { data: result, error: functionError } = await supabase
        .rpc('accept_bid', {
          p_bid_id: selectedBid.id,
          p_project_id: params.id
        })

      console.log('RPC Result:', result)
      console.log('RPC Error:', functionError)

      if (functionError) {
        console.error('Database function error:', functionError)
        throw new Error(`Failed to accept bid: ${functionError.message}`)
      }

      // Check if the function returned an error in its response
      if (result && result.success === false) {
        console.error('Function returned error:', result.error)
        throw new Error(result.error || 'Failed to accept bid')
      }

      console.log('Bid accepted successfully:', result)

      // Send email notification to winning contractor
      try {
        await fetch('/api/emails/bid-accepted', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractorId: selectedBid.contractor_id,
            projectId: params.id,
            bidId: selectedBid.id
          })
        })
      } catch (emailError) {
        console.error('Failed to send acceptance email:', emailError)
      }

      // Send rejection emails to other contractors
      const rejectedBids = bids.filter(b => b.id !== selectedBid.id && b.status === 'pending')
      for (const bid of rejectedBids) {
        try {
          await fetch('/api/emails/bid-rejected', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contractorId: bid.contractor_id,
              projectId: params.id
            })
          })
        } catch (emailError) {
          console.error('Failed to send rejection email:', emailError)
        }
      }

      alert('Bid accepted successfully!')
      setShowAcceptDialog(false)
      fetchProjectDetails()
    } catch (error) {
      console.error('Error accepting bid:', error)
      alert('Error accepting bid. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectBid = async (bidId) => {
    if (!confirm('Are you sure you want to reject this bid?')) return

    try {
      // Get the bid details first
      const bidToReject = bids.find(b => b.id === bidId)

      const { error } = await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('id', bidId)

      if (error) throw error

      // Send rejection email
      if (bidToReject) {
        try {
          await fetch('/api/emails/bid-rejected', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contractorId: bidToReject.contractor_id,
              projectId: params.id
            })
          })
        } catch (emailError) {
          console.error('Failed to send rejection email:', emailError)
        }
      }

      alert('Bid rejected')
      fetchProjectDetails()
    } catch (error) {
      console.error('Error rejecting bid:', error)
      alert('Error rejecting bid. Please try again.')
    }
  }

  const handleOpenEditModal = () => {
    if (project) {
      setEditFormData({
        bidding_deadline: project.bidding_deadline ? new Date(project.bidding_deadline).toISOString().slice(0, 16) : '',
        start_date: project.start_date ? new Date(project.start_date).toISOString().slice(0, 10) : '',
        duration_days: project.duration_days || ''
      })
      setShowEditModal(true)
    }
  }

  const handleSaveProject = async () => {
    setSaveLoading(true)
    try {
      const updates = {}

      if (editFormData.bidding_deadline) {
        updates.bidding_deadline = new Date(editFormData.bidding_deadline).toISOString()
      }
      if (editFormData.start_date) {
        updates.start_date = editFormData.start_date
      }
      if (editFormData.duration_days) {
        updates.duration_days = parseInt(editFormData.duration_days)
      }

      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', params.id)

      if (error) throw error

      alert('Project updated successfully!')
      setShowEditModal(false)
      fetchProjectDetails()
    } catch (error) {
      console.error('Error updating project:', error)
      alert('Failed to update project. Please try again.')
    } finally {
      setSaveLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout role="builder">
        <div className="flex flex-col items-center justify-center h-64 animate-fade-in">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
          </div>
          <p className="text-gray-600 mt-4 animate-pulse">Loading project details...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!project) {
    return (
      <DashboardLayout role="builder">
        <div className="text-center py-12">
          <p className="text-gray-500">Project not found</p>
          <Link href="/builder/projects">
            <Button className="mt-4">Back to Projects</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="builder">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Link href="/builder/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{project.title}</h1>
              <Badge variant={project.status === 'open' ? 'default' : 'secondary'}>
                {project.status}
              </Badge>
            </div>
            <p className="text-sm sm:text-base text-gray-600">
              Posted {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
            </p>
          </div>
          {project.status === 'open' && (
            <Button
              onClick={handleOpenEditModal}
              variant="outline"
              className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-400 hover:scale-105 transition-all duration-200 w-full sm:w-auto"
            >
              <Edit className="h-4 w-4" />
              Edit Project
            </Button>
          )}
        </div>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="bids">Bids ({bids.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-gray-600">{project.description}</p>
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
                  <p className="text-gray-600">{format(new Date(project.bidding_deadline), 'PPP p')}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bids" className="space-y-4">
            {bids.length === 0 ? (
              <Card className="animate-fade-in">
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">No bids received yet</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Sorting Info Banner */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">
                        Bids sorted by price: Lowest to Highest
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Best value bids appear first to help you find competitive offers quickly
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 stagger-animation">
                {bids.map((bid) => (
                  <Card
                    key={bid.id}
                    className={`transition-all duration-300 hover:shadow-xl ${
                      bid.status === 'accepted'
                        ? 'border-green-500 border-2 shadow-lg'
                        : 'hover:border-blue-300'
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <User className="h-5 w-5 text-gray-400" />
                            <Link
                              href={`/profile/contractor/${bid.contractor_id}`}
                              className="text-lg font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-all duration-200"
                            >
                              {bid.contractor?.profiles?.company_name || 'Contractor'}
                            </Link>
                            <Badge variant={bid.status === 'accepted' ? 'default' : bid.status === 'rejected' ? 'destructive' : 'secondary'}>
                              {bid.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 ml-8">
                            <span className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              {bid.contractor?.average_rating?.toFixed(1) || '0.0'}
                            </span>
                            <span>{bid.contractor?.total_projects_completed || 0} projects</span>
                            <span>{bid.contractor?.experience_years || 0} years exp.</span>
                            <span>{bid.contractor?.team_size || 0} team size</span>
                          </div>
                        </div>
                        {bid.status === 'accepted' && !project.is_rated && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setContractorToRate({
                                ...bid.contractor,
                                user_id: bid.contractor_id,
                                email: bid.contractor?.profiles?.email || '',
                                full_name: bid.contractor?.profiles?.full_name || '',
                                company_name: bid.contractor?.profiles?.company_name || ''
                              })
                              setShowRatingModal(true)
                            }}
                            className="flex items-center gap-2 border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                          >
                            <Award className="h-4 w-4" />
                            Rate Contractor
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg transition-all duration-200">
                        <div className="text-center sm:text-left">
                          <p className="text-sm text-gray-600 mb-1">Quoted Price</p>
                          <p className="text-xl sm:text-2xl font-bold text-blue-600">₹{bid.quoted_price?.toLocaleString()}</p>
                        </div>
                        <div className="text-center sm:text-left">
                          <p className="text-sm text-gray-600 mb-1">Estimated Duration</p>
                          <p className="text-xl sm:text-2xl font-bold text-green-600">{bid.estimated_duration} days</p>
                        </div>
                        <div className="text-center sm:text-left">
                          <p className="text-sm text-gray-600 mb-1">Submitted</p>
                          <p className="text-sm font-medium text-gray-700">{formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-semibold mb-2">Proposal</h4>
                        <p className="text-gray-600 whitespace-pre-line">{bid.proposal}</p>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-semibold mb-2">Specializations</h4>
                        <div className="flex flex-wrap gap-2">
                          {bid.contractor?.specializations?.map(spec => (
                            <Badge key={spec} variant="outline">{spec}</Badge>
                          ))}
                        </div>
                      </div>

                      {project.status === 'open' && bid.status === 'pending' && (
                        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                          <Button
                            onClick={() => {
                              setSelectedBid(bid)
                              setShowAcceptDialog(true)
                            }}
                            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 hover:scale-105 transition-all duration-200"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Accept Bid
                          </Button>
                          <Button
                            onClick={() => handleRejectBid(bid.id)}
                            variant="outline"
                            className="flex-1 hover:bg-red-50 hover:border-red-400 hover:text-red-700 transition-all duration-200"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {bid.status === 'accepted' && (
                        <div className="pt-4 border-t">
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-700 p-4 rounded-lg shadow-sm">
                            <p className="font-semibold mb-1 flex items-center gap-2">
                              <CheckCircle className="h-5 w-5" />
                              Project Awarded to this Contractor
                            </p>
                            <p className="text-sm">Contact: {bid.contractor?.profiles?.phone}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Accept Bid Confirmation Dialog */}
        <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Accept Bid</DialogTitle>
              <DialogDescription>
                Are you sure you want to accept this bid? This will:
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li>Close bidding for this project</li>
                  <li>Award the project to this contractor</li>
                  <li>Reject all other pending bids</li>
                </ul>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAcceptDialog(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button onClick={handleAcceptBid} disabled={actionLoading}>
                {actionLoading ? 'Processing...' : 'Confirm Award'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Project Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-[600px] animate-scale-in">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <Edit className="h-6 w-6 text-blue-600" />
                Edit Project Details
              </DialogTitle>
              <DialogDescription>
                Update your project information. Changes will be visible to all contractors.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Bidding Deadline */}
              <div className="space-y-2">
                <Label htmlFor="bidding_deadline" className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Bidding Deadline
                </Label>
                <Input
                  id="bidding_deadline"
                  type="datetime-local"
                  value={editFormData.bidding_deadline}
                  onChange={(e) => setEditFormData({ ...editFormData, bidding_deadline: e.target.value })}
                  className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">
                  Contractors can submit bids until this date and time
                </p>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="start_date" className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-green-600" />
                  Project Start Date
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={editFormData.start_date}
                  onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                  className="w-full transition-all duration-200 focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500">
                  Expected date when work should begin
                </p>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration_days" className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-orange-600" />
                  Project Duration (days)
                </Label>
                <Input
                  id="duration_days"
                  type="number"
                  min="1"
                  value={editFormData.duration_days}
                  onChange={(e) => setEditFormData({ ...editFormData, duration_days: e.target.value })}
                  className="w-full transition-all duration-200 focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., 30"
                />
                <p className="text-xs text-gray-500">
                  Expected number of days to complete the project
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-fade-in">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Good to know:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Extending the bidding deadline allows more contractors to bid</li>
                      <li>Only update these fields if your project timeline has changed</li>
                      <li>Contractors with pending bids will see the updated information</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEditModal(false)}
                disabled={saveLoading}
                className="transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveProject}
                disabled={saveLoading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
              >
                {saveLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </span>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rating Modal */}
        {showRatingModal && contractorToRate && (
          <RatingModal
            project={project}
            contractor={contractorToRate}
            onClose={() => {
              setShowRatingModal(false)
              setContractorToRate(null)
            }}
            onSuccess={() => {
              fetchProjectDetails()
            }}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

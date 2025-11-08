'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, MapPin, Calendar, DollarSign, Clock, User, Star, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'

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

      const { data: bidsData, error: bidsError } = await supabase
        .from('bids')
        .select(`
          *,
          contractor:contractor_id (
            user_id,
            specializations,
            experience_years,
            team_size,
            rating,
            total_projects,
            profiles:user_id (
              full_name,
              company_name,
              phone
            )
          )
        `)
        .eq('project_id', params.id)
        .order('created_at', { ascending: false })

      if (bidsError) throw bidsError
      setBids(bidsData || [])
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
      // Update bid status to accepted
      const { error: bidError } = await supabase
        .from('bids')
        .update({ status: 'accepted' })
        .eq('id', selectedBid.id)

      if (bidError) throw bidError

      // Update project status and assign contractor
      const { error: projectError } = await supabase
        .from('projects')
        .update({
          status: 'awarded',
          awarded_to: selectedBid.contractor_id
        })
        .eq('id', params.id)

      if (projectError) throw projectError

      // Reject all other bids
      const { error: rejectError } = await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('project_id', params.id)
        .neq('id', selectedBid.id)

      if (rejectError) throw rejectError

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
      const { error } = await supabase
        .from('bids')
        .update({ status: 'rejected' })
        .eq('id', bidId)

      if (error) throw error

      alert('Bid rejected')
      fetchProjectDetails()
    } catch (error) {
      console.error('Error rejecting bid:', error)
      alert('Error rejecting bid. Please try again.')
    }
  }

  if (loading) {
    return (
      <DashboardLayout role="builder">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/builder/projects">
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
            </div>
            <p className="text-gray-600">Posted {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</p>
          </div>
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
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">No bids received yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {bids.map((bid) => (
                  <Card key={bid.id} className={bid.status === 'accepted' ? 'border-green-500 border-2' : ''}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <User className="h-5 w-5 text-gray-400" />
                            <h3 className="text-lg font-semibold">{bid.contractor?.profiles?.company_name || 'Contractor'}</h3>
                            <Badge variant={bid.status === 'accepted' ? 'default' : bid.status === 'rejected' ? 'destructive' : 'secondary'}>
                              {bid.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 ml-8">
                            <span className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              {bid.contractor?.rating || '0.0'}
                            </span>
                            <span>{bid.contractor?.total_projects || 0} projects</span>
                            <span>{bid.contractor?.experience_years || 0} years exp.</span>
                            <span>{bid.contractor?.team_size || 0} team size</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Quoted Price</p>
                          <p className="text-xl font-bold text-blue-600">₹{bid.quoted_price?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Estimated Duration</p>
                          <p className="text-xl font-bold">{bid.estimated_duration} days</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Submitted</p>
                          <p className="text-sm">{formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}</p>
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
                        <div className="flex gap-2 pt-4 border-t">
                          <Button
                            onClick={() => {
                              setSelectedBid(bid)
                              setShowAcceptDialog(true)
                            }}
                            className="flex-1"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Accept Bid
                          </Button>
                          <Button
                            onClick={() => handleRejectBid(bid.id)}
                            variant="outline"
                            className="flex-1"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {bid.status === 'accepted' && (
                        <div className="pt-4 border-t">
                          <div className="bg-green-50 text-green-700 p-4 rounded-lg">
                            <p className="font-semibold mb-1">✔ Project Awarded to this Contractor</p>
                            <p className="text-sm">Contact: {bid.contractor?.profiles?.phone}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
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
      </div>
    </DashboardLayout>
  )
}

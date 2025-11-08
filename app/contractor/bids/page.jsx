'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Eye, DollarSign, Calendar, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/context/UserContext'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export default function ContractorBids() {
  const { user, loading } = useUser()
  const router = useRouter()
  const [bids, setBids] = useState([])
  const [filteredBids, setFilteredBids] = useState([])
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
      fetchBids()
    }
  }, [user])

  useEffect(() => {
    filterBids()
  }, [activeTab, bids])

  const fetchBids = async () => {
    try {
      const { data, error } = await supabase
        .from('bids')
        .select(`
          *,
          projects (
            id,
            title,
            city,
            budget_min,
            budget_max,
            duration_days,
            status
          )
        `)
        .eq('contractor_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBids(data || [])
    } catch (error) {
      console.error('Error fetching bids:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const filterBids = () => {
    if (activeTab === 'all') {
      setFilteredBids(bids)
    } else {
      setFilteredBids(bids.filter(b => b.status === activeTab))
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

  return (
    <DashboardLayout role="contractor">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Bids</h1>
          <p className="text-gray-600 mt-1">Track all your submitted bids</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All ({bids.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({bids.filter(b => b.status === 'pending').length})</TabsTrigger>
            <TabsTrigger value="accepted">Accepted ({bids.filter(b => b.status === 'accepted').length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({bids.filter(b => b.status === 'rejected').length})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredBids.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500 mb-4">No bids found in this category</p>
                  <Link href="/contractor/projects">
                    <Button>Browse Projects</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredBids.map((bid) => (
                  <Card key={bid.id} className={bid.status === 'accepted' ? 'border-green-500 border-2' : ''}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">{bid.projects?.title}</h3>
                            <Badge
                              variant={
                                bid.status === 'accepted' ? 'default' :
                                bid.status === 'rejected' ? 'destructive' :
                                'secondary'
                              }
                            >
                              {bid.status}
                            </Badge>
                            <Badge variant="outline">{bid.projects?.status}</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{bid.projects?.city}</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            Your Bid
                          </p>
                          <p className="text-lg font-bold text-blue-600">₹{bid.quoted_price?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Duration
                          </p>
                          <p className="text-lg font-bold">{bid.estimated_duration} days</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Submitted
                          </p>
                          <p className="text-sm">{formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Project Budget</p>
                          <p className="text-sm">₹{bid.projects?.budget_min?.toLocaleString()} - ₹{bid.projects?.budget_max?.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="font-semibold mb-2">Your Proposal</h4>
                        <p className="text-gray-600 line-clamp-3">{bid.proposal}</p>
                      </div>

                      <div className="flex gap-2 pt-4 border-t">
                        <Link href={`/contractor/projects/${bid.project_id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            <Eye className="mr-2 h-4 w-4" />
                            View Project
                          </Button>
                        </Link>
                        {bid.status === 'pending' && (
                          <Link href={`/contractor/projects/${bid.project_id}`} className="flex-1">
                            <Button size="sm" className="w-full">
                              Edit Bid
                            </Button>
                          </Link>
                        )}
                      </div>

                      {bid.status === 'accepted' && (
                        <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg">
                          <p className="font-semibold">✔ Congratulations! Your bid was accepted.</p>
                          <p className="text-sm mt-1">This project has been awarded to you. Start preparing for execution!</p>
                        </div>
                      )}
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

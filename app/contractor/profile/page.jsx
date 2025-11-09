'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loader2, Star, Trophy, Briefcase } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/context/UserContext'

const SPECIALIZATIONS = ['Plumbing', 'Electrical', 'Civil', 'Carpentry', 'Painting', 'Masonry', 'Roofing']
const CITIES = ['Patna', 'Lucknow', 'Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad']

export default function ContractorProfile() {
  const { user, profile, refreshProfile } = useUser()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [contractorData, setContractorData] = useState(null)
  const [wonBids, setWonBids] = useState([])

  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    phone: '',
    bio: '',
    specializations: [],
    service_locations: [],
    experience_years: '',
    team_size: ''
  })

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // Fetch contractor data with ratings
      const { data: contractorDataRes } = await supabase
        .from('contractors')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setContractorData(contractorDataRes)

      // Also fetch from contractor_stats view for ratings
      const { data: statsData } = await supabase
        .from('contractor_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (statsData) {
        setContractorData(prev => ({ ...prev, ...statsData }))
      }

      // Fetch won bids
      const { data: bidsData } = await supabase
        .from('bids')
        .select(`
          *,
          projects (
            id,
            title,
            city,
            budget_min,
            budget_max
          )
        `)
        .eq('contractor_id', user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })

      setWonBids(bidsData || [])

      setFormData({
        full_name: profileData?.full_name || '',
        company_name: profileData?.company_name || '',
        phone: profileData?.phone || '',
        bio: contractorDataRes?.bio || '',
        specializations: contractorDataRes?.specializations || [],
        service_locations: contractorDataRes?.service_locations || [],
        experience_years: contractorDataRes?.experience_years || '',
        team_size: contractorDataRes?.team_size || ''
      })
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleArrayToggle = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          company_name: formData.company_name,
          phone: formData.phone
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Update contractor data
      const { error: contractorError } = await supabase
        .from('contractors')
        .update({
          bio: formData.bio,
          specializations: formData.specializations,
          service_locations: formData.service_locations,
          experience_years: parseInt(formData.experience_years) || 0,
          team_size: parseInt(formData.team_size) || 0
        })
        .eq('user_id', user.id)

      if (contractorError) throw contractorError

      setSuccess(true)
      await refreshProfile()
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error updating profile. Please try again.')
    } finally {
      setSaving(false)
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

  return (
    <DashboardLayout role="contractor">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your professional information</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-animation">
          <Card className="card-hover">
            <CardContent className="p-6 text-center">
              <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500 fill-yellow-500" />
              <div className="text-3xl font-bold text-yellow-600">{contractorData?.average_rating?.toFixed(1) || '0.0'}</div>
              <p className="text-sm text-gray-600 mt-1">Average Rating</p>
              <p className="text-xs text-gray-500 mt-1">{contractorData?.total_ratings || 0} reviews</p>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="p-6 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="text-3xl font-bold text-green-600">{contractorData?.total_projects_completed || 0}</div>
              <p className="text-sm text-gray-600 mt-1">Completed Projects</p>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="p-6 text-center">
              <Briefcase className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="text-3xl font-bold text-blue-600">{wonBids.length}</div>
              <p className="text-sm text-gray-600 mt-1">Bids Won</p>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="p-6 text-center">
              <Star className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <div className="text-3xl font-bold text-purple-600">{contractorData?.experience_years || 0}</div>
              <p className="text-sm text-gray-600 mt-1">Years Experience</p>
            </CardContent>
          </Card>
        </div>

        {/* Edit Profile Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Tell us about your company and experience..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Professional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Specializations *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {SPECIALIZATIONS.map(spec => (
                      <div key={spec} className="flex items-center space-x-2">
                        <Checkbox
                          id={`spec-${spec}`}
                          checked={formData.specializations.includes(spec)}
                          onCheckedChange={() => handleArrayToggle('specializations', spec)}
                        />
                        <label htmlFor={`spec-${spec}`} className="text-sm cursor-pointer">
                          {spec}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Service Locations *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {CITIES.map(city => (
                      <div key={city} className="flex items-center space-x-2">
                        <Checkbox
                          id={`city-${city}`}
                          checked={formData.service_locations.includes(city)}
                          onCheckedChange={() => handleArrayToggle('service_locations', city)}
                        />
                        <label htmlFor={`city-${city}`} className="text-sm cursor-pointer">
                          {city}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="experience_years">Years of Experience *</Label>
                    <Input
                      id="experience_years"
                      name="experience_years"
                      type="number"
                      value={formData.experience_years}
                      onChange={handleChange}
                      required
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="team_size">Team Size *</Label>
                    <Input
                      id="team_size"
                      name="team_size"
                      type="number"
                      value={formData.team_size}
                      onChange={handleChange}
                      required
                      min="1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {success && (
              <div className="bg-green-50 text-green-600 p-4 rounded-md">
                Profile updated successfully!
              </div>
            )}

            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>

        {/* Bid History */}
        {wonBids.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Awarded Projects History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {wonBids.map((bid) => (
                  <div key={bid.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{bid.projects?.title}</h4>
                        <p className="text-sm text-gray-600">{bid.projects?.city}</p>
                      </div>
                      <Badge>Won</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                      <span>Your Bid: ₹{bid.quoted_price?.toLocaleString()}</span>
                      <span>•</span>
                      <span>{bid.estimated_duration} days</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

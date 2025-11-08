'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/context/UserContext'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const PROJECT_TYPES = ['Residential', 'Commercial', 'Infrastructure', 'Renovation']
const CITIES = ['Patna', 'Lucknow', 'Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad']
const SPECIALIZATIONS = ['Plumbing', 'Electrical', 'Civil', 'Carpentry', 'Painting', 'Masonry', 'Roofing']

export default function NewProject() {
  const { user } = useUser()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_type: '',
    city: '',
    location: '',
    budget_min: '',
    budget_max: '',
    start_date: '',
    duration_days: '',
    bidding_deadline: '',
    required_specializations: []
  })

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSpecializationToggle = (spec) => {
    setFormData(prev => ({
      ...prev,
      required_specializations: prev.required_specializations.includes(spec)
        ? prev.required_specializations.filter(s => s !== spec)
        : [...prev.required_specializations, spec]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validation
      if (formData.required_specializations.length === 0) {
        throw new Error('Please select at least one specialization')
      }

      if (parseInt(formData.budget_max) <= parseInt(formData.budget_min)) {
        throw new Error('Maximum budget must be greater than minimum budget')
      }

      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            builder_id: user.id,
            title: formData.title,
            description: formData.description,
            project_type: formData.project_type,
            city: formData.city,
            location: formData.location,
            budget_min: parseInt(formData.budget_min),
            budget_max: parseInt(formData.budget_max),
            start_date: formData.start_date,
            duration_days: parseInt(formData.duration_days),
            bidding_deadline: new Date(formData.bidding_deadline).toISOString(),
            required_specializations: formData.required_specializations,
            status: 'open'
          }
        ])
        .select()

      if (error) throw error

      alert('Project posted successfully!')
      router.push('/builder/projects')
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout role="builder">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/builder/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Post New Project</h1>
            <p className="text-gray-600 mt-1">Create a new project and receive bids from contractors</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Project Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Residential Building Construction"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project_type">Project Type *</Label>
                  <Select
                    value={formData.project_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, project_type: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map(type => (
                        <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Provide detailed description of your project requirements..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Select
                    value={formData.city}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Detailed Location *</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Boring Road, Near Gandhi Maidan"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Required Specializations *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {SPECIALIZATIONS.map(spec => (
                      <div key={spec} className="flex items-center space-x-2">
                        <Checkbox
                          id={spec}
                          checked={formData.required_specializations.includes(spec)}
                          onCheckedChange={() => handleSpecializationToggle(spec)}
                        />
                        <label
                          htmlFor={spec}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {spec}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget_min">Minimum Budget (₹) *</Label>
                    <Input
                      id="budget_min"
                      name="budget_min"
                      type="number"
                      value={formData.budget_min}
                      onChange={handleChange}
                      required
                      placeholder="1000000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budget_max">Maximum Budget (₹) *</Label>
                    <Input
                      id="budget_max"
                      name="budget_max"
                      type="number"
                      value={formData.budget_max}
                      onChange={handleChange}
                      required
                      placeholder="2000000"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Expected Start Date *</Label>
                    <Input
                      id="start_date"
                      name="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={handleChange}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration_days">Duration (days) *</Label>
                    <Input
                      id="duration_days"
                      name="duration_days"
                      type="number"
                      value={formData.duration_days}
                      onChange={handleChange}
                      required
                      placeholder="60"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bidding_deadline">Bidding Deadline *</Label>
                  <Input
                    id="bidding_deadline"
                    name="bidding_deadline"
                    type="datetime-local"
                    value={formData.bidding_deadline}
                    onChange={handleChange}
                    required
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Posting Project...' : 'Post Project'}
              </Button>
              <Link href="/builder/projects">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

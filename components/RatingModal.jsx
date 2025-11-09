'use client'

import { useState } from 'react'
import { Star, Award, MessageSquare, Clock, DollarSign, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export default function RatingModal({ project, contractor, onClose, onSuccess }) {
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    rating: 0,
    review_title: '',
    review_text: '',
    quality_rating: 0,
    communication_rating: 0,
    timeline_rating: 0,
    budget_rating: 0,
    would_hire_again: true
  })

  const [hoveredStars, setHoveredStars] = useState({
    rating: 0,
    quality_rating: 0,
    communication_rating: 0,
    timeline_rating: 0,
    budget_rating: 0
  })

  const StarRating = ({ field, label, icon: Icon }) => {
    const currentRating = formData[field]
    const hovered = hoveredStars[field]

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-blue-600" />}
          <Label className="text-sm font-medium">{label}</Label>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setFormData({ ...formData, [field]: star })}
              onMouseEnter={() => setHoveredStars({ ...hoveredStars, [field]: star })}
              onMouseLeave={() => setHoveredStars({ ...hoveredStars, [field]: 0 })}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  star <= (hovered || currentRating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600 self-center">
            {currentRating > 0 ? `${currentRating}/5` : 'Not rated'}
          </span>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation
    if (formData.rating === 0) {
      alert('Please provide an overall rating')
      return
    }

    if (!formData.review_text.trim()) {
      alert('Please write a review')
      return
    }

    setLoading(true)

    try {
      // Submit rating using database function
      const { data, error } = await supabase.rpc('submit_rating', {
        p_project_id: project.id,
        p_contractor_id: contractor.user_id || contractor.id,
        p_rating: formData.rating,
        p_review_title: formData.review_title || `Review for ${contractor.company_name || contractor.full_name}`,
        p_review_text: formData.review_text,
        p_quality_rating: formData.quality_rating || formData.rating,
        p_communication_rating: formData.communication_rating || formData.rating,
        p_timeline_rating: formData.timeline_rating || formData.rating,
        p_budget_rating: formData.budget_rating || formData.rating,
        p_would_hire_again: formData.would_hire_again
      })

      if (error) {
        console.error('Rating submission error:', error)
        throw error
      }

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to submit rating')
      }

      // Send email notification to contractor
      try {
        await fetch('/api/emails/rating-received', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractor: {
              email: contractor.email,
              full_name: contractor.full_name,
              company_name: contractor.company_name
            },
            project: {
              title: project.title,
              id: project.id
            },
            rating: formData.rating,
            review_title: formData.review_title
          })
        })
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError)
        // Don't fail the rating submission if email fails
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error submitting rating:', error)
      alert(`Failed to submit rating: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold">Rate Your Experience</h2>
          <p className="text-blue-100 mt-1">
            Share your feedback about working with {contractor.company_name || contractor.full_name}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Overall Rating */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl border-2 border-yellow-200">
            <StarRating
              field="rating"
              label="Overall Rating"
              icon={Award}
            />
          </div>

          {/* Review Title */}
          <div className="space-y-2">
            <Label htmlFor="review_title">Review Title (Optional)</Label>
            <Input
              id="review_title"
              placeholder="Sum up your experience in a few words"
              value={formData.review_title}
              onChange={(e) => setFormData({ ...formData, review_title: e.target.value })}
              maxLength={200}
            />
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <Label htmlFor="review_text">Your Review *</Label>
            <Textarea
              id="review_text"
              placeholder="Share details about your experience, the quality of work, communication, etc."
              value={formData.review_text}
              onChange={(e) => setFormData({ ...formData, review_text: e.target.value })}
              rows={5}
              required
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              {formData.review_text.length}/1000 characters
            </p>
          </div>

          {/* Detailed Ratings */}
          <div className="bg-gray-50 p-6 rounded-xl space-y-5">
            <h3 className="font-semibold text-gray-900 mb-4">Detailed Ratings (Optional)</h3>

            <StarRating
              field="quality_rating"
              label="Quality of Work"
              icon={Award}
            />

            <StarRating
              field="communication_rating"
              label="Communication"
              icon={MessageSquare}
            />

            <StarRating
              field="timeline_rating"
              label="Timeline Adherence"
              icon={Clock}
            />

            <StarRating
              field="budget_rating"
              label="Budget Management"
              icon={DollarSign}
            />
          </div>

          {/* Would Hire Again */}
          <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-lg">
            <input
              type="checkbox"
              id="would_hire_again"
              checked={formData.would_hire_again}
              onChange={(e) => setFormData({ ...formData, would_hire_again: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="would_hire_again" className="flex items-center gap-2 cursor-pointer">
              <ThumbsUp className="w-5 h-5 text-blue-600" />
              <span className="font-medium">I would hire this contractor again</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || formData.rating === 0}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit Rating'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* oxlint-disable react/set-state-in-effect */
import { useEffect, useState, useRef } from 'react'

const emptyForm = { name: '', rating: 0, review: '', photos: [] }

export default function ReviewModal({ booking, existingReview, onSubmit, onClose }) {
  const [form, setForm] = useState(emptyForm)
  const [hoverRating, setHoverRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setForm({
      name: existingReview?.name || '',
      rating: existingReview?.rating || 0,
      review: existingReview?.review || '',
      photos: [],
    })
  }, [existingReview])

  const ratingDescriptions = {
    1: '😞 Poor — Significant issues with court or service',
    2: '😐 Fair — Met bare minimum expectations',
    3: '🙂 Good — Enjoyable game and reliable court',
    4: '😊 Very Good — High quality surface, lighting & amenities',
    5: '🤩 Outstanding — Professional tournament-grade experience!',
  }

  // Handle adding new files up to max 4 photos
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (!selectedFiles.length) return

    setForm((current) => {
      const remainingSlots = 4 - current.photos.length
      if (remainingSlots <= 0) {
        setFeedback('Maximum 4 photos allowed.')
        return current
      }

      const validFiles = selectedFiles.filter((f) => f.type.startsWith('image/'))
      if (validFiles.length < selectedFiles.length) {
        setFeedback('Only image files (PNG, JPG, WEBP) are supported.')
      } else {
        setFeedback('')
      }

      const newPhotos = [...current.photos, ...validFiles.slice(0, remainingSlots)]
      return { ...current, photos: newPhotos }
    })

    // Reset input value so same files can be re-selected if removed
    e.target.value = ''
  }

  // Remove photo at index
  const handleRemovePhoto = (indexToRemove) => {
    setForm((current) => ({
      ...current,
      photos: current.photos.filter((_, idx) => idx !== indexToRemove),
    }))
    setFeedback('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.rating) {
      setFeedback('Please select a star rating (1 to 5 stars).')
      return
    }
    if (!form.review.trim()) {
      setFeedback('Please write a brief review of your experience.')
      return
    }
    if (form.photos.length > 4) {
      setFeedback('A maximum of 4 photos is allowed.')
      return
    }

    setSubmitting(true)
    setFeedback('')
    try {
      await onSubmit({ ...form, bookingId: booking.id, reviewId: existingReview?.id })
      onClose()
    } catch (err) {
      setFeedback(err?.message || 'Failed to submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  const activeStars = hoverRating || form.rating

  return (
    <div className="booking-modal-backdrop" onClick={onClose}>
      <div
        className="booking-modal awesome-modal review-awesome-modal"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="awesome-modal-header">
          <div className="modal-title-group">
            <div className="modal-eyebrow-pill review-eyebrow-pill">
              <span className="live-dot dot-gold" />
              <span>VERIFIED MEMBER REVIEW</span>
            </div>
            <h3 className="modal-headline">
              {existingReview ? 'Update Your Match Review' : 'Rate Your Match Experience'}
            </h3>
            <div className="review-booking-context-card">
              <div className="booking-context-icon">🏟️</div>
              <div className="booking-context-info">
                <strong>{booking.facilityName || booking.facility?.name || booking.name || 'Championship Arena'}</strong>
                <span>{booking.date ? `Session: ${booking.date}` : 'Verified Booking'}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="awesome-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form className="awesome-modal-form" onSubmit={handleSubmit}>
          {feedback && <div className="awesome-form-error">{feedback}</div>}

          {/* Reviewer Name */}
          <div className="awesome-form-field">
            <label htmlFor="reviewer-name">
              <span className="field-label-text">Your Display Name</span>
              <span className="field-required">*</span>
            </label>
            <div className="input-with-icon-wrap">
              <svg className="field-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                id="reviewer-name"
                type="text"
                className="awesome-text-input"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Your name or player callsign"
                required
              />
            </div>
          </div>

          {/* Interactive 5-Star Rating Picker */}
          <div className="awesome-form-field">
            <label>
              <span className="field-label-text">Overall Facility Rating</span>
              <span className="field-required">*</span>
            </label>

            <div className="awesome-star-picker-container">
              <div
                className="awesome-star-picker"
                role="radiogroup"
                aria-label="Star rating out of 5"
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= activeStars
                  return (
                    <button
                      key={star}
                      type="button"
                      className={`awesome-star-btn ${isFilled ? 'star-filled' : 'star-empty'}`}
                      onMouseEnter={() => setHoverRating(star)}
                      onClick={() => setForm((current) => ({ ...current, rating: star }))}
                      aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    >
                      <svg width="34" height="34" viewBox="0 0 24 24" fill={isFilled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  )
                })}
              </div>

              <div className="star-rating-feedback-pill">
                {activeStars > 0 ? (
                  <span>{ratingDescriptions[activeStars]}</span>
                ) : (
                  <span className="rating-prompt">Click stars to rate your match (1 to 5)</span>
                )}
              </div>
            </div>
          </div>

          {/* Review Details */}
          <div className="awesome-form-field">
            <div className="field-label-row">
              <label htmlFor="review-text">
                <span className="field-label-text">Your Review & Comments</span>
                <span className="field-required">*</span>
              </label>
              <span className="char-counter">{form.review.length} / 1000</span>
            </div>
            <textarea
              id="review-text"
              className="awesome-textarea"
              value={form.review}
              onChange={(event) =>
                setForm((current) => ({ ...current, review: event.target.value }))
              }
              placeholder="How was the turf grip, court lighting, cleanliness, equipment tension, or staff assistance? Share details that help other players book with confidence..."
              rows="4"
              maxLength="1000"
              required
            />
          </div>

          {/* Photo Upload Zone (Max 4 Photos) */}
          <div className="awesome-form-field">
            <div className="field-label-row">
              <label>
                <span className="field-label-text">Match Photos</span>
                <span className="field-hint-pill">{form.photos.length} / 4 attached</span>
              </label>
              <span className="photo-max-hint">Max 4 images (PNG, JPG, WEBP)</span>
            </div>

            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden-file-input"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {/* Attached Photos Thumbnail Preview Grid */}
            {form.photos.length > 0 && (
              <div className="review-photos-preview-grid">
                {form.photos.map((file, idx) => {
                  const previewUrl = URL.createObjectURL(file)
                  return (
                    <div key={idx} className="photo-preview-thumbnail-card">
                      <img
                        src={previewUrl}
                        alt={`Upload preview ${idx + 1}`}
                        className="preview-img-thumb"
                        onLoad={() => URL.revokeObjectURL(previewUrl)}
                      />
                      <button
                        type="button"
                        className="photo-thumb-remove-btn"
                        onClick={() => handleRemovePhoto(idx)}
                        title="Remove photo"
                        aria-label="Remove photo"
                      >
                        ✕
                      </button>
                      <span className="photo-thumb-number">#{idx + 1}</span>
                    </div>
                  )
                })}

                {/* Slot to add more if under 4 photos */}
                {form.photos.length < 4 && (
                  <button
                    type="button"
                    className="photo-preview-add-more-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Add Photo</span>
                    <small>({4 - form.photos.length} remaining)</small>
                  </button>
                )}
              </div>
            )}

            {/* Empty Upload Dropzone if no photos yet */}
            {form.photos.length === 0 && (
              <div
                className="review-upload-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="upload-dropzone-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div className="upload-dropzone-text">
                  <strong className="upload-main-text">Click or drag photos to upload</strong>
                  <span className="upload-sub-text">Attach up to 4 court or match action photos (up to 5MB each)</span>
                </div>
                <span className="upload-browse-pill">Browse Photos</span>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="awesome-modal-actions">
            <button
              type="button"
              className="awesome-cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="awesome-submit-btn review-submit-cta"
              disabled={submitting || !form.rating || !form.review.trim()}
            >
              {submitting ? (
                <span className="submit-spinner" />
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span>{existingReview ? 'Update Verified Review' : 'Submit Verified Review'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
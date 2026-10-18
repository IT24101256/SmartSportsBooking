import { useEffect, useState, useRef } from 'react'
import { getFacilityImage } from '../utils/facilityImages'

export default function ReviewModal({
  booking,
  existingReview,
  apiBaseUrl = '',
  currentUser,
  onSubmit,
  onClose,
}) {
  const isEditing = Boolean(
    existingReview &&
    (existingReview.bookingId !== undefined ||
     existingReview.rating !== undefined ||
     typeof existingReview.review === 'string') &&
    (existingReview.id || existingReview.reviewId)
  )

  const [form, setForm] = useState({ name: '', rating: 0, review: '' })
  const [existingPhotos, setExistingPhotos] = useState([])
  const [newPhotos, setNewPhotos] = useState([])
  const [hoverRating, setHoverRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setForm({
      name: (isEditing ? existingReview?.name : (currentUser?.name || booking?.customerName)) || '',
      rating: isEditing ? (existingReview?.rating || 0) : 0,
      review: isEditing ? (existingReview?.review || '') : '',
    })
    const rawPhotos = isEditing ? (existingReview?.photos || existingReview?.photoPaths || []) : []
    setExistingPhotos(Array.isArray(rawPhotos) ? [...rawPhotos] : [])
    setNewPhotos([])
    setFeedback('')
  }, [existingReview, isEditing, currentUser, booking])

  const resolvePhotoSrc = (photo) => {
    if (!photo) return ''
    if (photo.startsWith('data:image') || photo.startsWith('http://') || photo.startsWith('https://')) {
      return photo
    }
    const origin = apiBaseUrl
      ? apiBaseUrl.replace(/\/api\/?$/, '')
      : 'https://smartsportsbooking.onrender.com'
    const cleanPath = photo.startsWith('/') ? photo : `/${photo}`
    return `${origin}${cleanPath}`
  }

  const ratingDescriptions = {
    1: '😞 Poor — Significant issues with court or service',
    2: '😐 Fair — Met bare minimum expectations',
    3: '🙂 Good — Enjoyable game and reliable court',
    4: '😊 Very Good — High quality surface, lighting & amenities',
    5: '🤩 Outstanding — Professional tournament-grade experience!',
  }

  const totalPhotosCount = existingPhotos.length + newPhotos.length

  // Handle adding new files up to max 4 photos
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (!selectedFiles.length) return

    const remainingSlots = 4 - totalPhotosCount
    if (remainingSlots <= 0) {
      setFeedback('Maximum 4 photos allowed per review.')
      return
    }

    const validFiles = selectedFiles.filter((f) => f.type.startsWith('image/'))
    if (validFiles.length < selectedFiles.length) {
      setFeedback('Only image files (PNG, JPG, WEBP) are supported.')
    } else {
      setFeedback('')
    }

    setNewPhotos((current) => [...current, ...validFiles.slice(0, remainingSlots)])
    e.target.value = ''
  }

  // Remove an existing photo
  const handleRemoveExistingPhoto = (indexToRemove) => {
    setExistingPhotos((current) => current.filter((_, idx) => idx !== indexToRemove))
    setFeedback('')
  }

  // Remove a newly selected photo
  const handleRemoveNewPhoto = (indexToRemove) => {
    setNewPhotos((current) => current.filter((_, idx) => idx !== indexToRemove))
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
    if (totalPhotosCount > 4) {
      setFeedback('A maximum of 4 photos is allowed.')
      return
    }

    setSubmitting(true)
    setFeedback('')
    try {
      await onSubmit({
        name: form.name,
        rating: form.rating,
        review: form.review,
        existingPhotos,
        photos: newPhotos,
        bookingId: booking?.id || (isEditing ? existingReview?.bookingId : undefined),
        reviewId: isEditing ? (existingReview?.id || existingReview?.reviewId) : undefined,
      })
      onClose()
    } catch (err) {
      setFeedback(err?.message || 'Failed to submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  const activeStars = hoverRating || form.rating
  const facilityName = booking?.facilityName || booking?.facility?.name || booking?.name || existingReview?.facilityName || 'Championship Arena'

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
              {isEditing ? 'Update Your Match Review' : 'Rate Your Match Experience'}
            </h3>
            <div className="review-booking-context-card">
              <div className="booking-context-icon">🏟️</div>
              <div className="booking-context-info">
                <strong>{facilityName}</strong>
                <span>{booking?.date ? `Session: ${booking.date}` : 'Verified Booking'}</span>
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
                <span className="field-hint-pill">{totalPhotosCount} / 4 attached</span>
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
            {totalPhotosCount > 0 && (
              <div className="review-photos-preview-grid">
                {/* Existing Photos from previous submission */}
                {existingPhotos.map((photoUrl, idx) => (
                  <div key={`existing-${idx}`} className="photo-preview-thumbnail-card">
                    <img
                      src={resolvePhotoSrc(photoUrl)}
                      alt={`Attached photo ${idx + 1}`}
                      className="preview-img-thumb"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = getFacilityImage({ name: facilityName })
                      }}
                    />
                    <button
                      type="button"
                      className="photo-thumb-remove-btn"
                      onClick={() => handleRemoveExistingPhoto(idx)}
                      title="Remove photo"
                      aria-label="Remove photo"
                    >
                      ✕
                    </button>
                    <span className="photo-thumb-number">#{idx + 1}</span>
                  </div>
                ))}

                {/* Newly Selected Photos */}
                {newPhotos.map((file, idx) => {
                  const previewUrl = URL.createObjectURL(file)
                  return (
                    <div key={`new-${idx}`} className="photo-preview-thumbnail-card">
                      <img
                        src={previewUrl}
                        alt={`New upload preview ${idx + 1}`}
                        className="preview-img-thumb"
                        onLoad={() => URL.revokeObjectURL(previewUrl)}
                      />
                      <button
                        type="button"
                        className="photo-thumb-remove-btn"
                        onClick={() => handleRemoveNewPhoto(idx)}
                        title="Remove photo"
                        aria-label="Remove photo"
                      >
                        ✕
                      </button>
                      <span className="photo-thumb-number">#{existingPhotos.length + idx + 1}</span>
                    </div>
                  )
                })}

                {/* Slot to add more if under 4 photos */}
                {totalPhotosCount < 4 && (
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
                    <small>({4 - totalPhotosCount} remaining)</small>
                  </button>
                )}
              </div>
            )}

            {/* Empty Upload Dropzone if no photos yet */}
            {totalPhotosCount === 0 && (
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
                  <span>{isEditing ? 'Update Verified Review' : 'Submit Verified Review'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
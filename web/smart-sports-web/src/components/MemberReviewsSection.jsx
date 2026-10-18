import { useState } from 'react'
import { getFacilityImage } from '../utils/facilityImages'

export default function MemberReviewsSection({
  reviews = [],
  apiBaseUrl = '',
  currentUser,
  onEdit,
  onDelete,
}) {
  const [activeImagePreview, setActiveImagePreview] = useState(null)

  const canEdit = (review) => currentUser?.id === review.userId
  const canDelete = (review) => currentUser?.role === 'admin' || canEdit(review)

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

  return (
    <section className="member-reviews-section">
      <div className="section-header-compact">
        <div>
          <span className="section-eyebrow">COMMUNITY VOICES</span>
          <h3 className="section-title">WHAT MEMBERS SAY</h3>
        </div>
        <span className="activity-hint-text">Verified match and court experiences</span>
      </div>

      {reviews.length === 0 ? (
        <div className="empty-reviews-card">
          <p>No member reviews yet. Book a session and be the first to share your experience!</p>
        </div>
      ) : (
        <div className="reviews-cards-carousel">
          {reviews.map((review) => {
            const initials = review.name
              ? review.name
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : 'MB'

            return (
              <article key={review.id} className="premium-review-card">
                <div className="review-top-stars-row">
                  <div className="review-stars-gold" aria-label={`${review.rating} out of 5 stars`}>
                    {'★'.repeat(review.rating)}
                    <span className="stars-muted">{'★'.repeat(Math.max(0, 5 - review.rating))}</span>
                  </div>
                  <span className="verified-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>Verified Booking</span>
                  </span>
                </div>

                <p className="review-quote-text">
                  "{review.review || 'Great facilities and seamless booking experience!'}"
                </p>

                {review.photos?.length > 0 && (
                  <div className="review-attached-photos">
                    {review.photos.map((photo, pIdx) => {
                      const fullUrl = resolvePhotoSrc(photo)
                      return (
                        <img
                          key={photo || pIdx}
                          src={fullUrl}
                          alt="Facility photo by member"
                          className="review-thumb-img"
                          style={{ cursor: 'pointer' }}
                          title="Click to view full photo"
                          onError={(e) => {
                            e.currentTarget.onerror = null
                            e.currentTarget.src = getFacilityImage({ name: review.facilityName })
                          }}
                          onClick={() => setActiveImagePreview(e.currentTarget.src || fullUrl)}
                        />
                      )
                    })}
                  </div>
                )}

                <div className="review-author-footer">
                  <div className="review-author-avatar">{initials}</div>
                  <div className="review-author-info">
                    <strong className="review-author-name">{review.name}</strong>
                    <span className="review-facility-tag">
                      {review.facilityName || 'Court Booking'}
                    </span>
                  </div>
                </div>

                {(canEdit(review) || canDelete(review)) && (
                  <div className="review-admin-actions">
                    {canEdit(review) && (
                      <button
                        type="button"
                        className="review-action-btn"
                        onClick={() => onEdit && onEdit(review)}
                      >
                        Edit
                      </button>
                    )}
                    {canDelete(review) && (
                      <button
                        type="button"
                        className="review-action-btn danger-text"
                        onClick={() => onDelete && onDelete(review)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {activeImagePreview && (
        <div className="booking-modal-backdrop" onClick={() => setActiveImagePreview(null)}>
          <div className="facility-lightbox-container" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setActiveImagePreview(null)}
              aria-label="Close photo preview"
            >
              ×
            </button>
            <img
              src={activeImagePreview}
              alt="Enlarged review photo preview"
              className="facility-lightbox-img"
            />
          </div>
        </div>
      )}
    </section>
  )
}

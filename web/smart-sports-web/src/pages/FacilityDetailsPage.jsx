import { useState } from 'react'
import { getFacilityImage } from '../utils/facilityImages'

export default function FacilityDetailsPage({
  facility,
  onBack,
  onBook,
  reviews = [],
  apiBaseUrl = '',
  currentUser,
  onEditReview,
  onDeleteReview,
}) {
  const [activeImagePreview, setActiveImagePreview] = useState(null)

  if (!facility) return null

  const fallbackImg = getFacilityImage(facility)
  const images = facility.images?.length > 0 ? facility.images : [fallbackImg]
  const apiOrigin = apiBaseUrl ? apiBaseUrl.replace(/\/api\/?$/, '') : ''

  // Filter reviews for this facility
  const relatedReviews = reviews.filter((review) => {
    if (!review) return false
    const fName = (facility.name || '').trim().toLowerCase()
    const rFName = (review.facilityName || '').trim().toLowerCase()
    if (fName && rFName && (rFName === fName || rFName.includes(fName) || fName.includes(rFName))) {
      return true
    }
    if (facility.id != null && review.facilityId != null && String(review.facilityId) === String(facility.id)) {
      return true
    }
    return false
  })

  // Calculate average rating
  const avgRating = relatedReviews.length > 0
    ? (relatedReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / relatedReviews.length).toFixed(1)
    : facility.rating != null
      ? Number(facility.rating).toFixed(1)
      : null

  const canEdit = (review) => currentUser?.id === review.userId
  const canDelete = (review) => currentUser?.role === 'admin' || canEdit(review)

  return (
    <div className="facility-details-page">
      {/* 1. TOP NAVIGATION & BREADCRUMBS */}
      <div className="detail-top-nav">
        <button
          className="facility-back-nav-btn"
          type="button"
          onClick={onBack}
          aria-label="Back to facilities list"
        >
          <svg
            className="back-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Back to facilities</span>
        </button>

        <nav className="facility-breadcrumbs-trail" aria-label="Breadcrumb">
          <button type="button" className="breadcrumb-link" onClick={onBack}>
            Facilities
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{facility.name}</span>
        </nav>
      </div>

      {/* 2. HERO SECTION */}
      <section className="facility-detail-hero">
        <div className="facility-hero-info">
          <span className="section-eyebrow">PREMIER VENUE SPECIFICATION</span>
          <h2>{facility.name}</h2>
          <p>{facility.description || 'A championship standard SmartSports venue ready for your next session.'}</p>

          <div className="facility-hero-meta-row">
            <strong className="facility-detail-rate">
              LKR {Number(facility.hourlyRate || 0).toLocaleString()} <span className="rate-unit">/ hour</span>
            </strong>
            {avgRating && (
              <div className="facility-hero-rating-badge">
                <span className="star-icon">★</span>
                <strong>{avgRating}</strong>
                <span className="rating-count">
                  ({relatedReviews.length} {relatedReviews.length === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}
          </div>

          <div className="facility-hero-actions">
            <button
              className="primary-btn hero-book-btn"
              type="button"
              disabled={!facility.isAvailable}
              onClick={() => onBook(facility)}
            >
              {facility.isAvailable ? 'Book this facility now →' : 'Currently Unavailable'}
            </button>
          </div>
        </div>

        <div className="facility-detail-hero-media">
          <img
            src={images[0]}
            alt={`${facility.name} showcase`}
            className="facility-hero-showcase-img"
          />
        </div>
      </section>

      {/* 3. GALLERY SECTION (BELOW HERO) */}
      <section className="booking-activity-ranking-panel facility-section-panel">
        <div className="section-header-compact">
          <div>
            <span className="section-eyebrow">GALLERY</span>
            <h3 className="section-title">Venue Photography</h3>
          </div>
          <span className="panel-badge-subtle">
            {images.length} {images.length === 1 ? 'verified photo' : 'verified photos'}
          </span>
        </div>

        <div className="facility-gallery-constrained-grid">
          {images.map((image, index) => (
            <div
              key={`${image?.slice(0, 20) || 'g-img'}-${index}`}
              className="facility-gallery-photo-card"
              onClick={() => setActiveImagePreview(image)}
              title="Click to enlarge photo"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setActiveImagePreview(image)}
            >
              <img
                src={image}
                alt={`${facility.name} venue photo ${index + 1}`}
                className="facility-gallery-photo-img"
              />
              <div className="photo-card-overlay">
                <span className="view-text">🔍 View photo</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. FAQ SECTION (BELOW GALLERY) */}
      <section className="booking-activity-ranking-panel facility-section-panel">
        <div className="section-header-compact">
          <div>
            <span className="section-eyebrow">RULES & AMENITIES</span>
            <h3 className="section-title">Frequently Asked Questions</h3>
          </div>
          <span className="panel-badge-subtle">Court rules, gear & access guidelines</span>
        </div>

        <div className="facility-faq-list">
          {facility.faq?.length ? (
            facility.faq.map((item, index) => (
              <details key={`${item.question}-${index}`} open={index === 0}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))
          ) : (
            <div className="facility-standard-amenities">
              <details open>
                <summary>What equipment and amenities are included with this court?</summary>
                <p>
                  All bookings include access to clean locker rooms, fresh water hydration stations, and automated LED court lighting during evening sessions.
                </p>
              </details>
              <details>
                <summary>Can equipment (rackets, balls) be rented on-site?</summary>
                <p>
                  Yes, standard training equipment is available for rent at the reception desk prior to your scheduled time slot.
                </p>
              </details>
              <details>
                <summary>What is the cancellation or rescheduling policy?</summary>
                <p>
                  Cancellations made 24 hours prior to your session are eligible for full or partial refunds. You can also request slot rescheduling directly from the Bookings page.
                </p>
              </details>
            </div>
          )}
        </div>
      </section>

      {/* 5. RATINGS & REVIEWS SECTION (BELOW FAQ) */}
      <section className="booking-activity-ranking-panel facility-section-panel">
        <div className="section-header-compact">
          <div>
            <span className="section-eyebrow">COMMUNITY EXPERIENCES</span>
            <h3 className="section-title">Ratings & Member Reviews</h3>
          </div>
          {avgRating && (
            <div className="facility-overall-score-pill">
              <span className="score-star">★</span>
              <span className="score-num">{avgRating}</span>
              <span className="score-scale">/ 5.0</span>
            </div>
          )}
        </div>

        {relatedReviews.length === 0 ? (
          <div className="facility-empty-reviews-card">
            <div className="empty-reviews-stars">★ ★ ★ ★ ★</div>
            <h4>No member reviews yet for {facility.name}</h4>
            <p>
              Have you played or trained at this facility? Complete a session and be the first to share your rating and experience!
            </p>
            {facility.isAvailable && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => onBook(facility)}
              >
                Book a slot to play
              </button>
            )}
          </div>
        ) : (
          <div className="facility-reviews-cards-grid">
            {relatedReviews.map((review) => {
              const initials = review.name
                ? review.name
                    .split(' ')
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'MB'

              return (
                <article key={review.id} className="premium-review-card facility-review-card">
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
                      {review.photos.map((photo) => (
                        <img
                          key={photo}
                          src={`${apiOrigin}${photo}`}
                          alt="Member review photo"
                          className="review-thumb-img"
                          onClick={() => setActiveImagePreview(`${apiOrigin}${photo}`)}
                        />
                      ))}
                    </div>
                  )}

                  <div className="review-author-footer">
                    <div className="review-author-avatar">{initials}</div>
                    <div className="review-author-info">
                      <strong className="review-author-name">{review.name}</strong>
                      <span className="review-facility-tag">
                        {review.bookingDate ? new Date(review.bookingDate).toLocaleDateString() : 'Verified Member'}
                      </span>
                    </div>
                  </div>

                  {(canEdit(review) || canDelete(review)) && (
                    <div className="review-admin-actions">
                      {canEdit(review) && (
                        <button
                          type="button"
                          className="review-action-btn"
                          onClick={() => onEditReview && onEditReview(review)}
                        >
                          Edit
                        </button>
                      )}
                      {canDelete(review) && (
                        <button
                          type="button"
                          className="review-action-btn danger-text"
                          onClick={() => onDeleteReview && onDeleteReview(review)}
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
      </section>

      {/* 6. BOTTOM BOOKING CTA SECTION */}
      <section className="facility-bottom-cta">
        <div className="facility-cta-glow" aria-hidden="true" />
        <div className="facility-cta-content">
          <div className="facility-cta-text">
            <span className="cta-eyebrow">READY TO PLAY?</span>
            <h2 className="cta-title">Reserve your session at {facility.name}</h2>
            <p className="cta-description">
              Enjoy automated court lighting, tournament-grade flooring, clean locker facilities, and instant digital booking confirmation.
            </p>
            <div className="facility-cta-features">
              <span className="cta-feature-pill">⚡ Instant Confirmation</span>
              <span className="cta-feature-pill">🛡️ 24h Free Reschedule</span>
              <span className="cta-feature-pill">💳 Card & Slip Payment</span>
              <span className="cta-feature-pill">🏆 Pro Venue Standards</span>
            </div>
          </div>

          <div className="facility-cta-actions">
            <div className="cta-rate-preview">
              <span className="cta-rate-label">Starting at</span>
              <strong className="cta-rate-value">
                LKR {Number(facility.hourlyRate || 0).toLocaleString()}
                <span className="cta-rate-unit"> / hour</span>
              </strong>
            </div>

            <div className="cta-buttons-row">
              <button
                className="primary-btn facility-cta-book-btn"
                type="button"
                disabled={!facility.isAvailable}
                onClick={() => onBook(facility)}
              >
                {facility.isAvailable ? 'Book this facility now →' : 'Currently Unavailable'}
              </button>
              <button
                className="secondary-btn facility-cta-back-btn"
                type="button"
                onClick={onBack}
              >
                Browse other facilities
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. LIGHTBOX MODAL */}
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
              alt="Enlarged facility preview"
              className="facility-lightbox-img"
            />
          </div>
        </div>
      )}
    </div>
  )
}

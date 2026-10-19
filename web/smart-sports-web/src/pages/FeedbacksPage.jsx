import { useState, useMemo } from 'react'

export default function FeedbacksPage({
  reviews = [],
  facilities = [],
  apiBaseUrl = '',
  currentUser,
  onDeleteReview,
  onRefreshReviews,
}) {
  const [search, setSearch] = useState('')
  const [ratingFilter, setRatingFilter] = useState('All')
  const [facilityFilter, setFacilityFilter] = useState('All')
  const [sortBy, setSortBy] = useState('newest')
  const [activePreviewImage, setActivePreviewImage] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Resolve photo URL helper
  const resolvePhotoSrc = (photo) => {
    if (!photo) return ''
    if (photo.startsWith('data:image') || photo.startsWith('http://') || photo.startsWith('https://')) {
      return photo
    }
    const origin = apiBaseUrl
      ? apiBaseUrl.replace(/\/api\/?$/, '')
      : 'http://localhost:5187'
    const cleanPath = photo.startsWith('/') ? photo : `/${photo}`
    return `${origin}${cleanPath}`
  }

  // Get Facility sports icon
  const getFacilityIcon = (facilityName = '') => {
    const name = facilityName.toLowerCase()
    if (name.includes('cricket')) return '🏏'
    if (name.includes('badminton')) return '🏸'
    if (name.includes('tennis')) return '🎾'
    if (name.includes('basket')) return '🏀'
    if (name.includes('volleyball')) return '🏐'
    if (name.includes('football') || name.includes('soccer')) return '⚽'
    if (name.includes('rugby')) return '🏉'
    if (name.includes('swim') || name.includes('pool')) return '🏊'
    return '🏟️'
  }

  // Handle manual refresh
  const handleRefresh = async () => {
    if (!onRefreshReviews) return
    setIsRefreshing(true)
    try {
      await onRefreshReviews()
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  // Analytics & Stats
  const totalReviews = reviews.length
  const avgRatingNum = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
    : 0
  const avgRatingStr = avgRatingNum > 0 ? avgRatingNum.toFixed(1) : '5.0'

  const fiveStarCount = reviews.filter((r) => r.rating === 5).length
  const fourStarCount = reviews.filter((r) => r.rating === 4).length
  const threeStarCount = reviews.filter((r) => r.rating === 3).length
  const twoStarCount = reviews.filter((r) => r.rating === 2).length
  const oneStarCount = reviews.filter((r) => r.rating === 1).length

  const positiveCount = fiveStarCount + fourStarCount
  const satisfactionRate = totalReviews > 0
    ? Math.round((positiveCount / totalReviews) * 100)
    : 100

  const reviewsWithPhotosCount = reviews.filter((r) => r.photos && r.photos.length > 0).length

  // Filtered & Sorted Reviews
  const filteredReviews = useMemo(() => {
    const list = reviews.filter((r) => {
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        (r.name || '').toLowerCase().includes(q) ||
        (r.review || '').toLowerCase().includes(q) ||
        (r.facilityName || '').toLowerCase().includes(q) ||
        String(r.bookingId || '').includes(q)

      const matchesRating =
        ratingFilter === 'All' || String(r.rating) === ratingFilter

      const matchesFacility =
        facilityFilter === 'All' ||
        r.facilityName === facilityFilter ||
        String(r.facilityId) === facilityFilter

      return matchesSearch && matchesRating && matchesFacility
    })

    return list.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.updatedAtUtc || b.createdAtUtc || 0) - new Date(a.updatedAtUtc || a.createdAtUtc || 0)
      }
      if (sortBy === 'oldest') {
        return new Date(a.updatedAtUtc || a.createdAtUtc || 0) - new Date(b.updatedAtUtc || b.createdAtUtc || 0)
      }
      if (sortBy === 'highest') {
        return (b.rating || 0) - (a.rating || 0)
      }
      if (sortBy === 'lowest') {
        return (a.rating || 0) - (b.rating || 0)
      }
      return 0
    })
  }, [reviews, search, ratingFilter, facilityFilter, sortBy])

  // Facility Options for dropdown
  const uniqueFacilities = useMemo(() => {
    const map = new Map()
    reviews.forEach((r) => {
      if (r.facilityName) map.set(r.facilityName, r.facilityName)
    })
    facilities.forEach((f) => {
      if (f.name) map.set(f.name, f.name)
    })
    return Array.from(map.values()).sort()
  }, [reviews, facilities])

  // Delete review handler with confirmation
  const handleDelete = async (review) => {
    const confirmMsg = `Are you sure you want to delete the review from "${review.name}" for ${review.facilityName || 'this facility'}?`
    if (!window.confirm(confirmMsg)) return
    if (onDeleteReview) {
      await onDeleteReview(review)
    }
  }

  return (
    <div className="feedbacks-page-wrapper">
      {/* 1. HERO HEADER */}
      <section className="feedbacks-hero-card">
        <div className="feedbacks-hero-content">
          <div className="feedbacks-badge-pill">
            <span className="hub-pulse-dot" />
            <span>MEMBER SATISFACTION & REPUTATION</span>
            <span className="hub-badge-sep">•</span>
            <span>{totalReviews} Verified Member Reviews</span>
          </div>

          <div className="feedbacks-hero-row">
            <div>
              <h1 className="feedbacks-hero-title">Member Feedbacks & Reviews</h1>
              <p className="feedbacks-hero-subtitle">
                Monitor player satisfaction, inspect post-match ratings, and manage public community reviews across all arenas.
              </p>
            </div>
            <button
              type="button"
              className="feedbacks-refresh-btn"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh member reviews"
            >
              <span className={`refresh-icon ${isRefreshing ? 'spinning' : ''}`}>↻</span>
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Reviews'}</span>
            </button>
          </div>
        </div>

        {/* 2. STATS & RATING BREAKDOWN STRIP */}
        <div className="feedbacks-stats-grid">
          <div className="feedback-stat-box highlight-box">
            <span className="feedback-stat-label">AVERAGE RATING</span>
            <div className="feedback-rating-score-row">
              <strong className="feedback-stat-number">{avgRatingStr}</strong>
              <div className="feedback-star-display">
                <span className="stars-gold">{'★'.repeat(Math.round(avgRatingNum))}</span>
                <span className="stars-muted">{'★'.repeat(Math.max(0, 5 - Math.round(avgRatingNum)))}</span>
                <span className="score-subtext">out of 5.0</span>
              </div>
            </div>
          </div>

          <div className="feedback-stat-box">
            <span className="feedback-stat-label">TOTAL FEEDBACKS</span>
            <strong className="feedback-stat-number">{totalReviews}</strong>
            <span className="stat-hint">Across all sport facilities</span>
          </div>

          <div className="feedback-stat-box">
            <span className="feedback-stat-label">SATISFACTION RATE</span>
            <strong className="feedback-stat-number text-green">{satisfactionRate}%</strong>
            <span className="stat-hint">Positive (4★ & 5★) reviews</span>
          </div>

          <div className="feedback-stat-box">
            <span className="feedback-stat-label">PHOTO REVIEWS</span>
            <strong className="feedback-stat-number text-blue">{reviewsWithPhotosCount}</strong>
            <span className="stat-hint">With facility photos attached</span>
          </div>

          {/* Rating Distribution Bar Box */}
          <div className="feedback-stat-box rating-distribution-box">
            <span className="feedback-stat-label">RATING DISTRIBUTION</span>
            <div className="rating-bars-list">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = stars === 5 ? fiveStarCount : stars === 4 ? fourStarCount : stars === 3 ? threeStarCount : stars === 2 ? twoStarCount : oneStarCount
                const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0
                return (
                  <div key={stars} className="rating-bar-row">
                    <span className="bar-star-label">{stars}★</span>
                    <div className="bar-track">
                      <div
                        className={`bar-fill star-fill-${stars}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="bar-count-label">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 3. SEARCH & FILTER TOOLBAR */}
      <section className="feedbacks-filter-bar">
        {/* Search Input */}
        <div className="feedbacks-search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search reviewer name, facility, comment, or booking #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="feedbacks-search-input"
          />
          {search && (
            <button
              type="button"
              className="feedbacks-clear-search-btn"
              onClick={() => setSearch('')}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Rating Filter Pills */}
        <div className="feedbacks-filter-pills" role="radiogroup" aria-label="Filter by star rating">
          {['All', '5', '4', '3', '2', '1'].map((r) => {
            const isSelected = ratingFilter === r
            const label = r === 'All' ? `All (${totalReviews})` : `${r}★`
            return (
              <button
                key={r}
                type="button"
                className={`feedback-filter-pill ${isSelected ? 'active' : ''}`}
                onClick={() => setRatingFilter(r)}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Facility Dropdown */}
        <div className="feedbacks-select-wrap">
          <label htmlFor="feedbacks-facility-select" className="visually-hidden">Filter by facility</label>
          <select
            id="feedbacks-facility-select"
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
            className="feedbacks-select"
          >
            <option value="All">All Facilities ({uniqueFacilities.length})</option>
            {uniqueFacilities.map((fac) => (
              <option key={fac} value={fac}>{fac}</option>
            ))}
          </select>
        </div>

        {/* Sort By Dropdown */}
        <div className="feedbacks-select-wrap">
          <label htmlFor="feedbacks-sort-select" className="visually-hidden">Sort feedbacks</label>
          <select
            id="feedbacks-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="feedbacks-select"
          >
            <option value="newest">Most Recent First</option>
            <option value="highest">Highest Rating (5★ → 1★)</option>
            <option value="lowest">Lowest Rating (1★ → 5★)</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </section>

      {/* 4. ACTIVE FILTERS CHIP BAR */}
      {(search || ratingFilter !== 'All' || facilityFilter !== 'All') && (
        <div className="feedbacks-active-filters-bar">
          <span className="active-filters-label">Active Filters:</span>
          {search && (
            <span className="filter-chip">
              Search: "{search}"
              <button type="button" onClick={() => setSearch('')}>×</button>
            </span>
          )}
          {ratingFilter !== 'All' && (
            <span className="filter-chip">
              Rating: {ratingFilter}★
              <button type="button" onClick={() => setRatingFilter('All')}>×</button>
            </span>
          )}
          {facilityFilter !== 'All' && (
            <span className="filter-chip">
              Facility: {facilityFilter}
              <button type="button" onClick={() => setFacilityFilter('All')}>×</button>
            </span>
          )}
          <button
            type="button"
            className="reset-all-filters-btn"
            onClick={() => {
              setSearch('')
              setRatingFilter('All')
              setFacilityFilter('All')
            }}
          >
            Reset Filters
          </button>
          <span className="results-count-chip">
            Showing {filteredReviews.length} of {totalReviews} reviews
          </span>
        </div>
      )}

      {/* 5. FEEDBACKS LIST */}
      <section className="feedbacks-list-section">
        {filteredReviews.length === 0 ? (
          <div className="feedbacks-empty-state">
            <span className="empty-state-icon">💬</span>
            <h3 className="empty-state-title">No Feedbacks Found</h3>
            <p className="empty-state-desc">
              {search || ratingFilter !== 'All' || facilityFilter !== 'All'
                ? 'No member reviews match your current filter and search criteria.'
                : 'No member feedbacks have been submitted yet. When players review their completed bookings, they will appear here.'}
            </p>
            {(search || ratingFilter !== 'All' || facilityFilter !== 'All') && (
              <button
                type="button"
                className="empty-state-btn"
                onClick={() => {
                  setSearch('')
                  setRatingFilter('All')
                  setFacilityFilter('All')
                }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="feedbacks-cards-grid">
            {filteredReviews.map((review) => {
              const initials = (review.name || 'Athlete')
                .split(' ')
                .map((p) => p[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()

              const dateObj = new Date(review.updatedAtUtc || review.createdAtUtc || review.bookingDate || Date.now())
              const formattedDate = dateObj.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
              const formattedTime = dateObj.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })

              const facilityIcon = getFacilityIcon(review.facilityName)
              const hasPhotos = review.photos && review.photos.length > 0

              return (
                <article key={review.id} className="admin-feedback-card">
                  {/* Card Header */}
                  <div className="feedback-card-top">
                    <div className="feedback-author-row">
                      <div className="feedback-author-avatar">
                        {initials}
                      </div>
                      <div className="feedback-author-info">
                        <div className="author-name-row">
                          <strong className="feedback-author-name">{review.name}</strong>
                          <span className="verified-badge" title="Verified Session Booking">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Verified
                          </span>
                        </div>
                        <span className="feedback-date-text">
                          {formattedDate} • {formattedTime}
                        </span>
                      </div>
                    </div>

                    {/* Star Rating & Numeric Badge */}
                    <div className="feedback-rating-badge" aria-label={`${review.rating} out of 5 stars`}>
                      <span className="rating-stars-gold">
                        {'★'.repeat(review.rating)}
                        <span className="rating-stars-empty">{'★'.repeat(Math.max(0, 5 - review.rating))}</span>
                      </span>
                      <span className="rating-number-pill">{Number(review.rating).toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Context Meta Pills (Venue, Booking #) */}
                  <div className="feedback-meta-pills">
                    <span className="meta-pill facility-pill">
                      <span>{facilityIcon}</span>
                      <span>{review.facilityName || 'Sports Court'}</span>
                    </span>

                    {review.bookingId && (
                      <span className="meta-pill booking-pill" title={`Booking Reference #${review.bookingId}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                        </svg>
                        <span>Booking #{review.bookingId}</span>
                      </span>
                    )}

                    <span className="meta-pill review-id-pill">
                      Review #{review.id}
                    </span>
                  </div>

                  {/* Review Text Body */}
                  <div className="feedback-comment-box">
                    <span className="quote-icon">“</span>
                    <p className="feedback-comment-text">{review.review}</p>
                  </div>

                  {/* Photo Attachments Gallery */}
                  {hasPhotos && (
                    <div className="feedback-photos-gallery">
                      <span className="photos-gallery-label">Attached Photos ({review.photos.length}):</span>
                      <div className="photos-row">
                        {review.photos.map((photo, pIdx) => {
                          const src = resolvePhotoSrc(photo)
                          return (
                            <button
                              key={photo || pIdx}
                              type="button"
                              className="photo-thumb-btn"
                              onClick={() => setActivePreviewImage({ src, review })}
                              title="Click to view full photo"
                            >
                              <img
                                src={src}
                                alt={`Feedback by ${review.name} - Photo ${pIdx + 1}`}
                                className="photo-thumb-img"
                                onError={(e) => {
                                  e.currentTarget.onerror = null
                                  e.currentTarget.src = '/sports-hero.jpg'
                                }}
                              />
                              <span className="photo-zoom-hint">🔍</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Card Footer Actions */}
                  <div className="feedback-card-footer">
                    <span className="feedback-status-pill">
                      <span className="dot-green" /> Public Member Feedback
                    </span>

                    <button
                      type="button"
                      className="feedback-delete-btn"
                      onClick={() => handleDelete(review)}
                      title="Delete this feedback as administrator"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      <span>Delete</span>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* 6. PHOTO LIGHTBOX MODAL */}
      {activePreviewImage && (
        <div
          className="feedback-lightbox-backdrop"
          onClick={() => setActivePreviewImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="feedback-lightbox-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lightbox-header">
              <div>
                <strong className="lightbox-title">
                  Photo from {activePreviewImage.review?.name}
                </strong>
                <span className="lightbox-subtitle">
                  {activePreviewImage.review?.facilityName} • Booking #{activePreviewImage.review?.bookingId}
                </span>
              </div>
              <button
                type="button"
                className="lightbox-close-btn"
                onClick={() => setActivePreviewImage(null)}
                aria-label="Close photo preview"
              >
                ×
              </button>
            </div>

            <div className="lightbox-image-wrap">
              <img
                src={activePreviewImage.src}
                alt={`Review by ${activePreviewImage.review?.name}`}
                className="lightbox-full-img"
              />
            </div>

            <div className="lightbox-footer">
              <p className="lightbox-comment">
                "{activePreviewImage.review?.review}"
              </p>
              <div className="lightbox-rating">
                {'★'.repeat(activePreviewImage.review?.rating || 5)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

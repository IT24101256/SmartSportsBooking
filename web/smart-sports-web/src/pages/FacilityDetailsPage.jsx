import { useState, useEffect, useMemo } from 'react'
import { getFacilityImage } from '../utils/facilityImages'

const DEFAULT_SPORT_EQUIPMENTS = {
  badminton: [
    { name: 'Yonex Pro Carbon Rackets (Pair)', hourlyRate: 350, icon: '🏸' },
    { name: 'Aerosensa Feather Shuttlecocks (Tube of 3)', hourlyRate: 400, icon: '🏸' },
    { name: 'Tournament Badminton Net & Posts', hourlyRate: 0, icon: '🥅' },
    { name: 'Anti-slip Grip Tape & Overgrips', hourlyRate: 150, icon: '🎗️' },
  ],
  basketball: [
    { name: 'Spalding Official Leather Basketball (Size 7)', hourlyRate: 300, icon: '🏀' },
    { name: 'Nike Elite Training Basketball (Size 6)', hourlyRate: 250, icon: '🏀' },
    { name: 'Numbered Team Scrimmage Vests (Set of 10)', hourlyRate: 500, icon: '🎽' },
    { name: 'Heavy-Duty Ball Pump & Pressure Gauge', hourlyRate: 0, icon: '💨' },
  ],
  cricket: [
    { name: 'English Willow Cricket Bat (Grade 1)', hourlyRate: 600, icon: '🏏' },
    { name: 'Kookaburra Regulation Leather Balls (Box of 2)', hourlyRate: 450, icon: '🏏' },
    { name: 'Pro Batting Pads & Gloves Combo', hourlyRate: 500, icon: '🛡️' },
    { name: 'Spring-Return Wooden Wicket Stumps', hourlyRate: 200, icon: '🪵' },
  ],
  football: [
    { name: 'FIFA Quality Pro Match Football (Size 5)', hourlyRate: 350, icon: '⚽' },
    { name: 'Agility Training Cones & Speed Ladders', hourlyRate: 300, icon: '📐' },
    { name: 'Pro Goalkeeper Gloves with Finger Protection', hourlyRate: 400, icon: '🧤' },
    { name: 'Team Training Bibs (Set of 12)', hourlyRate: 450, icon: '🎽' },
  ],
  tennis: [
    { name: 'Wilson Pro Staff Tennis Rackets (Pair)', hourlyRate: 500, icon: '🎾' },
    { name: 'Championship Tennis Ball Pressurized Can (4 Balls)', hourlyRate: 400, icon: '🎾' },
    { name: 'Ball Hopper / Caddy Basket', hourlyRate: 250, icon: '🧺' },
  ],
  swimming: [
    { name: 'Speedo Ergonomic Kickboards', hourlyRate: 150, icon: '🏊' },
    { name: 'Silicone Swim Caps & Anti-Fog Goggles', hourlyRate: 200, icon: '🥽' },
    { name: 'Pull Buoys & Training Hand Paddles', hourlyRate: 200, icon: '🏊' },
  ],
  'table tennis': [
    { name: 'Butterfly Professional Paddles (Pair)', hourlyRate: 250, icon: '🏓' },
    { name: '3-Star ITTF Approved 40+ Poly Balls (Pack of 6)', hourlyRate: 200, icon: '🏓' },
    { name: 'Retractable Table Tennis Net Set', hourlyRate: 0, icon: '🥅' },
  ],
  volleyball: [
    { name: 'Mikasa V200W Official FIVB Match Volleyball', hourlyRate: 300, icon: '🏐' },
    { name: 'High-Tensile Boundary Antennae & Net', hourlyRate: 0, icon: '🥅' },
    { name: 'Protective Knee Pads & Arm Sleeves', hourlyRate: 200, icon: '🛡️' },
  ],
}

const getGearIcon = (name = '', sport = '') => {
  const n = (name || '').toLowerCase()
  const s = (sport || '').toLowerCase()
  if (n.includes('racket') || n.includes('shuttlecock') || s.includes('badminton')) return '🏸'
  if (n.includes('basketball') || s.includes('basketball')) return '🏀'
  if (n.includes('bat') || n.includes('wicket') || n.includes('stump') || s.includes('cricket')) return '🏏'
  if (n.includes('football') || n.includes('soccer') || s.includes('football')) return '⚽'
  if (n.includes('tennis') && !n.includes('table')) return '🎾'
  if (n.includes('swim') || n.includes('goggle') || n.includes('kickboard') || s.includes('swimming')) return '🏊'
  if (n.includes('table tennis') || n.includes('paddle') || n.includes('ping pong') || s.includes('table tennis')) return '🏓'
  if (n.includes('volleyball') || s.includes('volleyball')) return '🏐'
  if (n.includes('glove')) return '🧤'
  if (n.includes('vest') || n.includes('bib')) return '🎽'
  if (n.includes('cone') || n.includes('ladder')) return '📐'
  if (n.includes('pump')) return '💨'
  if (n.includes('net')) return '🥅'
  return '⚡'
}

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
  const [catalogEquipments, setCatalogEquipments] = useState([])

  // Fetch catalog equipments for the venue sport
  useEffect(() => {
    if (!apiBaseUrl) return
    let active = true
    fetch(`${apiBaseUrl}/equipments`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active && Array.isArray(data)) {
          setCatalogEquipments(data)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [apiBaseUrl])

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

  const parseEquipments = (raw) => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          return parsed.map((item) => ({
            name: typeof item === 'object' ? item.name || '' : String(item),
            hourlyRate: typeof item === 'object' && item.hourlyRate !== undefined ? item.hourlyRate : null,
          }))
        }
      } catch {
        return raw.split(',').map((item) => item.trim()).filter(Boolean).map((name) => ({ name, hourlyRate: null }))
      }
    }
    return []
  }

  const equipmentsList = useMemo(() => {
    const rawProvided = parseEquipments(facility.equipmentsProvided)
    const sportKey = (facility.sportCategory || facility.type || '').toLowerCase()

    // Match catalog items for this facility or sport
    const matchingCatalog = catalogEquipments
      .filter((eq) => {
        if (eq.facilityId != null && facility.id != null && String(eq.facilityId) === String(facility.id)) {
          return true
        }
        const eqSport = (eq.sportCategory || '').toLowerCase()
        return eqSport && (eqSport === sportKey || sportKey.includes(eqSport) || eqSport.includes(sportKey))
      })
      .map((eq) => ({
        name: eq.name,
        hourlyRate: eq.hourlyRate != null ? Number(eq.hourlyRate) : null,
        description: eq.description || '',
      }))

    // Hydrate assignments saved as only id/name with the catalog price.
    const combined = rawProvided.map((item) => {
      const catalogItem = matchingCatalog.find(
        (catalog) => (catalog.name || '').toLowerCase() === (item.name || '').toLowerCase()
      )
      return catalogItem
        ? { ...catalogItem, ...item, hourlyRate: item.hourlyRate ?? catalogItem.hourlyRate }
        : item
    })

    // Add any matching catalog items not already serialized on the facility.
    matchingCatalog.forEach((item) => {
      if (!combined.some((c) => (c.name || '').toLowerCase() === (item.name || '').toLowerCase())) {
        combined.push(item)
      }
    })

    // If still empty or sparse, blend in sport defaults
    if (combined.length === 0) {
      for (const [key, defaults] of Object.entries(DEFAULT_SPORT_EQUIPMENTS)) {
        if (sportKey.includes(key) || key.includes(sportKey)) {
          return defaults
        }
      }
    }

    return combined.length > 0 ? combined : [
      { name: 'Match Session Ball Set', hourlyRate: 300, icon: '⚡' },
      { name: 'Training Cones & Markers', hourlyRate: 150, icon: '📐' },
      { name: 'Team Scrimmage Bibs', hourlyRate: 250, icon: '🎽' },
    ]
  }, [facility, catalogEquipments])

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
            <span className={`venue-court-badge ${(facility.courtType || facility.courtTag || 'Indoor').toLowerCase()}`}>
              {(facility.courtType || facility.courtTag) === 'Outdoor' ? '🌳 Outdoor Court' : '🏢 Indoor Court'}
            </span>
            {equipmentsList.length > 0 && (
              <span className="venue-gear-badge" title="Sports equipment available for this venue">
                🎒 {equipmentsList.length} Sports Gear Available
              </span>
            )}
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

      {/* 2.5 SPORTS EQUIPMENTS & GEAR ON-DEMAND PANEL */}
      {equipmentsList.length > 0 && (
        <section className="booking-activity-ranking-panel facility-section-panel facility-equipments-panel">
          <div className="section-header-compact">
            <div>
              <span className="section-eyebrow">SPORTS EQUIPMENT & GEAR ON-DEMAND</span>
              <h3 className="section-title">Equipment Available for This Facility</h3>
            </div>
            <span className="panel-badge-subtle">
              {equipmentsList.length} {equipmentsList.length === 1 ? 'gear item ready' : 'gear items available for play'}
            </span>
          </div>

          {/* Informational Callout Banner */}
          <div className="facility-equipment-notice-banner">
            <div className="notice-icon-box">🎒</div>
            <div className="notice-content">
              <strong>Need equipment for your session? We've got you covered!</strong>
              <p>
                We have these specialized sports equipments available at this facility. If you need any equipment during your session, you can request and add them when booking your court or collect them directly at the counter upon arrival.
              </p>
            </div>
            {facility.isAvailable && onBook && (
              <button
                type="button"
                className="notice-action-btn"
                onClick={() => onBook(facility)}
              >
                Reserve with Gear →
              </button>
            )}
          </div>

          <div className="facility-equipments-grid">
            {equipmentsList.map((eq, idx) => {
              const name = eq.name || eq
              const rate = eq.hourlyRate != null && Number(eq.hourlyRate) > 0 ? Number(eq.hourlyRate) : null
              const icon = eq.icon || getGearIcon(name, facility.sportCategory || facility.type)
              return (
                <div key={idx} className="equipment-chip-card">
                  <span className="equipment-icon-bubble">{icon}</span>
                  <div className="equipment-chip-content">
                    <span className="equipment-name">{name}</span>
                    <div className="equipment-meta-line">
                      {rate ? (
                        <span className="equipment-rate-pill">
                          LKR {rate.toLocaleString()} <span className="rate-sub">/ hr</span>
                        </span>
                      ) : (
                        <span className="equipment-included-pill">Complimentary on request</span>
                      )}
                      <span className="equipment-avail-tag">• Available to get</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

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

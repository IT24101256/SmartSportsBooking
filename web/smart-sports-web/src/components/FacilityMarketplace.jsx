import { useState, useMemo } from 'react'
import { getFacilityImage } from '../utils/facilityImages'

export default function FacilityMarketplace({
  facilities = [],
  onBook,
  onDetails,
  onSeeAll,
}) {
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Extract unique categories from real facility data
  const categories = useMemo(() => {
    const types = new Set()
    facilities.forEach((f) => {
      if (f.type) types.add(f.type)
      else if (f.name?.includes('Badminton')) types.add('Badminton')
      else if (f.name?.includes('Football') || f.name?.includes('Turf')) types.add('Football')
      else if (f.name?.includes('Cricket')) types.add('Cricket')
      else if (f.name?.includes('Swim') || f.name?.includes('Aqua')) types.add('Swimming')
      else if (f.name?.includes('Tennis')) types.add('Tennis')
      else if (f.name?.includes('Basket')) types.add('Basketball')
    })
    return ['All', ...Array.from(types)]
  }, [facilities])

  const filteredFacilities = useMemo(() => {
    if (selectedCategory === 'All') return facilities
    return facilities.filter((f) => {
      const matchType = f.type?.toLowerCase() === selectedCategory.toLowerCase()
      const matchName = f.name?.toLowerCase().includes(selectedCategory.toLowerCase())
      return matchType || matchName
    })
  }, [facilities, selectedCategory])

  // Select featured facility (Cricket Ground, or first one)
  const featuredFacility = useMemo(() => {
    return (
      facilities.find((f) => f.name?.toLowerCase().includes('cricket')) ||
      facilities.find((f) => f.name?.toLowerCase().includes('turf') || f.name?.toLowerCase().includes('football')) ||
      facilities[0]
    )
  }, [facilities])

  // Non-featured facilities list
  const otherFacilities = useMemo(() => {
    if (!featuredFacility) return filteredFacilities
    return filteredFacilities.filter((f) => f.id !== featuredFacility.id && f.name !== featuredFacility.name)
  }, [filteredFacilities, featuredFacility])

  return (
    <section className="marketplace-section" id="marketplace-facilities">
      <div className="marketplace-header-row">
        <div className="marketplace-heading-group">
          <span className="section-eyebrow">PREMIER VENUES</span>
          <h2 className="section-title">FIND YOUR GAME</h2>
          <p className="section-subtitle">Pick a facility. Pick a time. Get playing.</p>
        </div>

        {onSeeAll && (
          <button
            type="button"
            className="view-all-text-btn"
            onClick={onSeeAll}
          >
            <span>Explore all facilities</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Category Pills */}
      {categories.length > 2 && (
        <div className="category-pills-row" role="tablist" aria-label="Facility Categories">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`category-pill-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
              role="tab"
              aria-selected={selectedCategory === cat}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Featured Facility Hero Card (if viewing 'All' and featured facility exists) */}
      {selectedCategory === 'All' && featuredFacility && (
        <div className="featured-facility-hero-card">
          <div className="featured-hero-image-wrapper">
            <img
              src={getFacilityImage(featuredFacility)}
              alt={featuredFacility.name}
              className="featured-hero-image"
            />
            <div className="featured-gradient-shade" />
            <div className="featured-top-badges">
              <span className="featured-tag-badge">★ FEATURED VENUE</span>
              <span className="featured-status-badge">
                <span className="status-dot"></span>
                {featuredFacility.status || 'Available now'}
              </span>
            </div>
          </div>

          <div className="featured-hero-body">
            <div className="featured-meta-line">
              <span className="featured-sport-type">{featuredFacility.type || 'Championship Arena'}</span>
              <span className="featured-rating">★ 4.9 (Member Favorite)</span>
            </div>
            <h3 className="featured-facility-title">{featuredFacility.name}</h3>
            <p className="featured-facility-desc">
              {featuredFacility.description ||
                'Professional championship grade sports facility featuring floodlights, pristine turf, official dimensions, and dedicated equipment rooms.'}
            </p>

            <div className="featured-footer-row">
              <div className="featured-pricing-block">
                <span className="pricing-label">Hourly Rate</span>
                <strong className="pricing-amount">{featuredFacility.price}</strong>
              </div>

              <div className="featured-actions-group">
                {onDetails && (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => onDetails(featuredFacility)}
                  >
                    View details
                  </button>
                )}
                <button
                  type="button"
                  className="primary-btn hero-book-btn"
                  onClick={() => onBook(featuredFacility)}
                >
                  Book now →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Facilities Grid */}
      <div className="facility-marketplace-grid">
        {(selectedCategory === 'All' ? otherFacilities : filteredFacilities).map((facility) => {
          const imgUrl = getFacilityImage(facility)
          const ratingVal = facility.rating ? Number(facility.rating).toFixed(1) : '4.8'

          return (
            <article
              key={facility.id || facility.name}
              className={`marketplace-card ${facility.accent || 'blue'}`}
            >
              <div className="marketplace-card-media">
                <img src={imgUrl} alt={facility.name} className="marketplace-card-img" />
                <div className="marketplace-card-overlay" />
                <div className="card-floating-badges">
                  <span className="venue-type-chip">{facility.type || 'Court'}</span>
                  <span className="venue-status-chip">
                    <span className="live-dot" />
                    {facility.status || 'Available'}
                  </span>
                </div>
              </div>

              <div className="marketplace-card-content">
                <div className="card-title-row">
                  <h4 className="marketplace-card-name">{facility.name}</h4>
                  <div className="card-rating-chip" title={`${ratingVal} star rating`}>
                    ★ {ratingVal}
                  </div>
                </div>

                <p className="marketplace-card-desc">
                  {facility.description
                    ? facility.description.slice(0, 95) + (facility.description.length > 95 ? '...' : '')
                    : 'Premier athletic facility with dedicated session slots and premium training equipment.'}
                </p>

                <div className="marketplace-card-footer">
                  <div className="card-price-block">
                    <span className="card-price-label">Rate</span>
                    <strong className="card-price-value">{facility.price}</strong>
                  </div>

                  <div className="card-buttons-group">
                    {onDetails && (
                      <button
                        type="button"
                        className="ghost-card-btn"
                        onClick={() => onDetails(facility)}
                        title="View facility details"
                      >
                        Details
                      </button>
                    )}
                    <button
                      type="button"
                      className="primary-card-btn"
                      onClick={() => onBook(facility)}
                    >
                      Book now →
                    </button>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

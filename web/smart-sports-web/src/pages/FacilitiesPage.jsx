import { useState, useMemo } from 'react'
import { getFacilityImage } from '../utils/facilityImages'
import EditFacilityModal from '../components/EditFacilityModal'
import { isFacilityOccupiedNow, getFacilityRatingStats } from '../utils/facilityStatus'

const emptyFacility = { name: '', sportCategory: '', hourlyRate: '', description: '', faq: [], images: [], isAvailable: true, courtType: 'Indoor' }
const defaultSportCategories = ['Badminton', 'Basketball', 'Cricket', 'Football', 'Swimming', 'Table Tennis', 'Volleyball']

export default function FacilitiesPage({ facilities = [], bookings = [], reviews = [], isAdmin, onDetails, onBook, onSave, onDelete, onCreateSportCategory, apiBaseUrl, token, sportCategories = [] }) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyFacility)
  const [_feedback, setFeedback] = useState('')

  // Derive categories from facilities
  const categories = useMemo(() => {
    const set = new Set()
    facilities.forEach((f) => {
      if (f.sportCategory || f.type) set.add(f.sportCategory || f.type)
      else if (f.name?.includes('Badminton')) set.add('Badminton')
      else if (f.name?.includes('Football') || f.name?.includes('Turf')) set.add('Football')
      else if (f.name?.includes('Cricket')) set.add('Cricket')
      else if (f.name?.includes('Swim') || f.name?.includes('Aqua')) set.add('Swimming')
      else if (f.name?.includes('Tennis')) set.add('Tennis')
      else if (f.name?.includes('Basket')) set.add('Basketball')
    })
    const persistedCategories = sportCategories
      .map((category) => typeof category === 'string' ? category : category.name)
      .filter(Boolean)
    return ['All', ...defaultSportCategories, ...persistedCategories, ...Array.from(set)]
      .filter((category, index, values) => values.indexOf(category) === index)
      .filter((category) => category !== 'Indoor' && category !== 'Outdoor')
  }, [facilities, sportCategories])

  const openEditor = (facility = emptyFacility, id = 'new') => {
    setEditing(id)
    setForm({ ...emptyFacility, ...facility, faq: facility.faq ?? [], images: facility.images ?? [] })
    setFeedback('')
  }

  const _addFaq = () => setForm((current) => ({ ...current, faq: [...current.faq, { question: '', answer: '' }] }))
  const _updateFaq = (index, field, value) => setForm((current) => ({ ...current, faq: current.faq.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }))
  const _removeFaq = (index) => setForm((current) => ({ ...current, faq: current.faq.filter((_, itemIndex) => itemIndex !== index) }))
  const _addImages = (event) => {
    const files = Array.from(event.target.files ?? [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => setForm((current) => ({ ...current, images: [...current.images, String(reader.result)] }))
      reader.readAsDataURL(file)
    })
    event.target.value = ''
  }

  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [sortBy, setSortBy] = useState('default')

  const visibleFacilities = useMemo(() => {
    let list = facilities.filter((facility) => {
      const matchesSearch = `${facility.name} ${facility.description || ''} ${facility.type || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
      if (!matchesSearch) return false

      if (selectedCategory !== 'All') {
        const matchesCategory =
          facility.type?.toLowerCase() === selectedCategory.toLowerCase() ||
          facility.name?.toLowerCase().includes(selectedCategory.toLowerCase())
        if (!matchesCategory) return false
      }

      if (onlyAvailable) {
        const isOccupied = isFacilityOccupiedNow(facility, bookings)
        if (!facility.isAvailable || isOccupied) {
          return false
        }
      }

      return true
    })

    if (sortBy === 'price-low') {
      list = [...list].sort((a, b) => (Number(a.hourlyRate) || 0) - (Number(b.hourlyRate) || 0))
    } else if (sortBy === 'price-high') {
      list = [...list].sort((a, b) => (Number(b.hourlyRate) || 0) - (Number(a.hourlyRate) || 0))
    } else if (sortBy === 'rating') {
      list = [...list].sort((a, b) => {
        const rA = getFacilityRatingStats(a, reviews).rating || 0
        const rB = getFacilityRatingStats(b, reviews).rating || 0
        return rB - rA
      })
    } else {
      list = [...list].sort((left, right) => left.name.localeCompare(right.name))
    }

    return list
  }, [facilities, bookings, reviews, search, selectedCategory, onlyAvailable, sortBy])

  return (
    <div className="facilities-page-wrapper">
      {/* 1. TEXT-DRIVEN HERO SECTION WITH PROMINENT CTA */}
      <section className="facilities-text-hero">
        <div className="facilities-hero-inner">
          <div className="facilities-hero-badge-pill">
            <span className="hub-pulse-dot" />
            <span className="hub-badge-text">CHAMPIONSHIP SPORTING ARENAS</span>
            <span className="hub-badge-sep">•</span>
            <span className="hub-badge-status">{facilities.length} Active Venues</span>
          </div>

          <h1 className="facilities-hero-main-title">
            {isAdmin ? (
              <>
                Facility Portfolio <span className="hub-title-highlight">& Court Operations</span>
              </>
            ) : (
              <>
                Reserve World-Class Arenas <span className="hub-title-highlight">& Premier Courts</span>
              </>
            )}
          </h1>

          <p className="facilities-hero-narrative">
            Discover tournament-grade sports infrastructure engineered for athletes, competitive leagues, and community champions. From BWF-standard indoor hardwood badminton courts and FIFA-grade astroturf to Olympic-size 50m heated pools and floodlit cricket grounds—each facility features automated scheduling, live slot verification, and 100% free rain-check protection.
          </p>
        </div>
      </section>

      {/* 2. CATEGORY PILLS & COMMAND FILTER BAR */}
      <div className="facilities-discovery-container" id="facility-showcase-section">
        {/* Category Filter Pills (Clean clickable sport tabs) */}
        <div className="facilities-category-tabs" role="tablist" aria-label="Filter by sport category">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat
            const iconMap = {
              All: '🏟️',
              Badminton: '🏸',
              Cricket: '🏏',
              Football: '⚽',
              Basketball: '🏀',
              Swimming: '🏊',
              Tennis: '🎾',
            }
            const icon = iconMap[cat] || '🎯'
            const count =
              cat === 'All'
                ? facilities.length
                : facilities.filter(
                    (f) =>
                      f.type?.toLowerCase() === cat.toLowerCase() ||
                      f.name?.toLowerCase().includes(cat.toLowerCase())
                  ).length

            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`category-tab-pill ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                <span className="tab-icon">{icon}</span>
                <span className="tab-name">{cat === 'All' ? 'All Venues' : cat}</span>
                <span className="tab-count">{count}</span>
              </button>
            )
          })}
        </div>

      {/* 3. SMART FILTER & SEARCH TOOLBAR */}
      <div className="venue-hub-filter-bar">
        {/* Search input with icon and clear */}
        <div className="hub-search-box">
          <svg className="hub-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search venue name, surface, or sport..."
            className="hub-search-input"
            aria-label="Search venues"
          />
          {search && (
            <button
              type="button"
              className="hub-search-clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter controls row */}
        <div className="hub-controls-group">
          {/* Quick Available Now Toggle */}
          <button
            type="button"
            className={`hub-toggle-btn ${onlyAvailable ? 'active' : ''}`}
            onClick={() => setOnlyAvailable(!onlyAvailable)}
          >
            <span className="toggle-dot" />
            <span>Available Now Only</span>
          </button>

          {/* Sort Dropdown */}
          <div className="hub-sort-wrapper">
            <span className="sort-label">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="hub-sort-select"
            >
              <option value="default">Featured / Name</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated ★</option>
            </select>
          </div>

          {/* Results count & reset */}
          <span className="hub-results-count">
            {visibleFacilities.length} {visibleFacilities.length === 1 ? 'venue' : 'venues'}
          </span>

          {(selectedCategory !== 'All' || search || onlyAvailable || sortBy !== 'default') && (
            <button
              type="button"
              className="hub-reset-btn"
              onClick={() => {
                setSelectedCategory('All')
                setSearch('')
                setOnlyAvailable(false)
                setSortBy('default')
              }}
            >
              Reset
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              className="primary-btn hub-add-btn"
              onClick={() => openEditor()}
            >
              ＋ Add Facility
            </button>
          )}
        </div>
      </div>
    </div>

      {/* Facilities Grid */}
      {visibleFacilities.length === 0 ? (
        <div className="empty-facilities-notice">
          <p>No facilities match your search criteria "{search}".</p>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              setSearch('')
              setSelectedCategory('All')
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="facilities-showcase-grid">
          {visibleFacilities.map((facility) => {
            const imgUrl = getFacilityImage(facility)
            const { rating, count } = getFacilityRatingStats(facility, reviews)
            const isOccupied = isFacilityOccupiedNow(facility, bookings)
            const courtTypeTag = facility.courtType || facility.courtTag || 'Indoor'

            return (
              <article key={facility.id || facility.name} className="venue-card-premium">
                <div className="venue-card-media-box">
                  <img src={imgUrl} alt={facility.name} className="venue-card-img" />
                  <div className="venue-card-gradient" />
                  <div className="venue-top-chips">
                    <span className={`venue-court-badge ${courtTypeTag.toLowerCase()}`}>
                      {courtTypeTag === 'Outdoor' ? '🌳 Outdoor' : '🏢 Indoor'}
                    </span>
                    <span className={`venue-avail-badge ${!facility.isAvailable ? 'status-busy' : isOccupied ? 'status-in-play' : 'status-open'}`}>
                      <span className={`dot ${isOccupied ? 'dot-in-play' : ''}`} />
                      {!facility.isAvailable ? 'Maintenance' : isOccupied ? '🔴 In Play' : 'Available now'}
                    </span>
                  </div>
                </div>

                <div className="venue-card-info-box">
                  <div className="venue-headline-row">
                    <h3 className="venue-name">{facility.name}</h3>
                    {rating != null && count > 0 && (
                      <div className="venue-rating-badge" title={`${rating} star rating from ${count} ${count === 1 ? 'review' : 'reviews'}`}>
                        ★ {rating.toFixed(1)} {count > 1 ? `(${count})` : ''}
                      </div>
                    )}
                  </div>

                  <p className="venue-summary">
                    {facility.description || 'Championship standard venue ready for private and group bookings.'}
                  </p>

                  <div className="venue-pricing-row">
                    <div>
                      <span className="venue-price-label">Price per hour</span>
                      <strong className="venue-price-number">{facility.price}</strong>
                    </div>
                  </div>

                  <div className="venue-action-buttons">
                    <button
                      className="secondary-btn venue-details-btn"
                      type="button"
                      onClick={() => onDetails(facility)}
                    >
                      View details
                    </button>
                    <button
                      className="primary-btn venue-book-btn"
                      type="button"
                      disabled={!facility.isAvailable}
                      onClick={() => onBook(facility)}
                    >
                      {facility.isAvailable ? 'Book now →' : 'Unavailable'}
                    </button>
                  </div>

                  {isAdmin && (
                    <div className="venue-admin-controls">
                      <button
                        className="ghost-card-btn admin-edit-btn"
                        type="button"
                        onClick={() => openEditor(facility, facility.id)}
                      >
                        Edit Facility
                      </button>
                      <button
                        className="ghost-card-btn admin-delete-btn danger-text"
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Delete ${facility.name}?`)) return
                          try {
                            await onDelete(facility.id)
                          } catch (error) {
                            setFeedback(error.message)
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Admin Facility Editor Modal */}
      {editing && (
        <EditFacilityModal
          isOpen={Boolean(editing)}
          isNew={editing === 'new'}
          facility={form}
          onCreateSportCategory={onCreateSportCategory}
          sportCategories={sportCategories.map((category) => typeof category === 'string' ? category : category.name)}
          apiBaseUrl={apiBaseUrl}
          token={token}
          onSave={async (updatedForm) => {
            await onSave(updatedForm, editing === 'new' ? null : editing)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

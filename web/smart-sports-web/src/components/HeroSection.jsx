export default function HeroSection({
  heroMessage = 'PLAY HARDER. BOOK SMARTER.',
  facilities = [],
  bookings = [],
  reviews = [],
  averageRating,
  onBooking,
  onBookWithAi,
  onExploreFacilities,
}) {
  const facilityCount = facilities?.length || 6
  const activeBookingsCount = bookings?.filter((b) => b.status === 'Confirmed' || b.status === 'Pending').length || bookings?.length || 0
  const ratingDisplay = averageRating || (reviews?.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '4.9')

  return (
    <section className="hero-banner-section">
      <div className="hero-banner-container">
        {/* Background Image with Dark Dynamic Overlay */}
        <div className="hero-bg-media">
          <img
            src="/sports-hero.jpg"
            alt="SmartSports Arena & Courts"
            className="hero-media-img"
          />
          <div className="hero-gradient-overlay" />
          <div className="hero-grid-pattern" />
        </div>

        {/* Content Content Area */}
        <div className="hero-content-inner">
          <div className="hero-left-column">
            <div className="hero-badge-pill">
              <span className="hero-badge-dot"></span>
              <span>YOUR SPORTS CLUB</span>
              <span className="hero-badge-divider">•</span>
              <span className="hero-badge-sub">LIVE BOOKING ENGINE</span>
            </div>

            <h1 className="hero-main-title">
              PLAY HARDER.
              <br />
              <span className="hero-title-accent">BOOK SMARTER.</span>
            </h1>

            <p className="hero-description">
              Reserve premium courts and floodlit fields, track your athletic sessions, and elevate your game with instant booking.
            </p>

            <div className="hero-button-group">
              <button
                className="hero-primary-btn"
                type="button"
                onClick={onBooking}
              >
                <span>Book a facility</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>

              <button
                className="hero-ai-btn"
                type="button"
                onClick={onBookWithAi}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 50%, #a855f7 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px 22px',
                  fontSize: '15px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.5)',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: '18px' }}>✨</span>
                <span>Book With AI</span>
              </button>

              <button
                className="hero-secondary-btn"
                type="button"
                onClick={onExploreFacilities}
              >
                <span>Explore facilities</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M7 7h10v10" />
                </svg>
              </button>
            </div>
          </div>

          <div className="hero-right-column">
            {/* Floating Live Metrics Badges */}
            <div className="floating-metric-card metric-card-top">
              <div className="metric-icon-box status-pulse-green">
                <span className="pulse-ring"></span>
                <span className="status-solid-dot"></span>
              </div>
              <div className="metric-details">
                <span className="metric-title">Available Today</span>
                <strong className="metric-value">Instant Slots Open</strong>
              </div>
            </div>

            <div className="floating-metric-card metric-card-center">
              <div className="metric-icon-box sport-arena-icon">
                🏟️
              </div>
              <div className="metric-details">
                <span className="metric-title">Premier Venues</span>
                <strong className="metric-value">{facilityCount} Facilities</strong>
              </div>
            </div>

            <div className="floating-metric-card metric-card-bottom">
              <div className="metric-icon-box star-icon-box">
                ★
              </div>
              <div className="metric-details">
                <span className="metric-title">Community Trust</span>
                <strong className="metric-value">{ratingDisplay} ★ Member Rating</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

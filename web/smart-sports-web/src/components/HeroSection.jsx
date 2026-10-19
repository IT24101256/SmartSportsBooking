import React, { useState, useEffect } from 'react'
import WeatherRiskAlertsModal from './WeatherRiskAlertsModal'

export default function HeroSection({
  heroMessage = 'PLAY HARDER. BOOK SMARTER.',
  facilities = [],
  bookings = [],
  reviews = [],
  averageRating,
  apiBaseUrl,
  weatherOverview: propWeatherOverview,
  onBooking,
  onBookWithAi,
  onExploreFacilities,
}) {
  const facilityCount = facilities?.length || 6
  const activeBookingsCount = bookings?.filter((b) => b.status === 'Confirmed' || b.status === 'Pending').length || bookings?.length || 0
  const ratingDisplay = averageRating || (reviews?.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '4.9')

  const [weatherOverview, setWeatherOverview] = useState(propWeatherOverview || null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [showForecastModal, setShowForecastModal] = useState(false)

  useEffect(() => {
    if (propWeatherOverview) {
      setWeatherOverview(propWeatherOverview)
      return
    }

    let isMounted = true
    const baseUrl = apiBaseUrl || 'http://localhost:5187/api'

    const fetchWeather = async () => {
      try {
        setWeatherLoading(true)
        const res = await fetch(`${baseUrl}/weather/overview`)
        if (res.ok && isMounted) {
          const data = await res.json()
          setWeatherOverview(data)
        }
      } catch (err) {
        console.warn('HeroSection weather fetch error:', err)
      } finally {
        if (isMounted) setWeatherLoading(false)
      }
    }

    fetchWeather()
    const timer = setInterval(fetchWeather, 5 * 60 * 1000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [apiBaseUrl, propWeatherOverview])

  const current = weatherOverview?.current || {
    temperature: 26.9,
    condition: 'Overcast',
    icon: '☁️',
    isSuitableForPlay: true,
    suitabilityMessage: 'Good Conditions for Play',
    locationName: 'Colombo Arena Complex',
    windSpeed: 1,
    humidity: 87,
  }

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
                className="hero-secondary-btn"
                type="button"
                onClick={onBookWithAi}
              >
                <span style={{ fontSize: '18px' }}>✨</span>
                <span>Book With AI</span>
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

            {/* Live Weather Information Card - Positioned in right side below the 3 boxes */}
            <div
              className="hero-weather-card"
              role="button"
              tabIndex={0}
              onClick={() => setShowForecastModal(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setShowForecastModal(true)
                }
              }}
              title="Click to view full 7-day arena weather forecast & conditions"
            >
              <div className="hero-weather-top">
                <span className="hero-weather-icon">{current.icon || '☁️'}</span>
                <div className="hero-weather-info">
                  <div className="hero-weather-temp-row">
                    <span className="hero-weather-temp">
                      {current.temperature != null ? `${current.temperature}°C` : '26.9°C'}
                    </span>
                    <span
                      className={`hero-weather-status-pill ${
                        current.isSuitableForPlay ? 'status-good' : 'status-caution'
                      }`}
                    >
                      {current.suitabilityMessage || 'Good Conditions for Play'}
                    </span>
                  </div>
                  <p className="hero-weather-subtitle">
                    {current.locationName || 'Colombo Arena Complex'} • {current.condition || 'Overcast'}
                  </p>
                </div>
              </div>

              <div className="hero-weather-metrics">
                <div className="hero-weather-metric-item">
                  <span className="hero-weather-metric-label">WIND SPEED</span>
                  <strong className="hero-weather-metric-val">{current.windSpeed ?? 1} km/h</strong>
                </div>
                <div className="hero-weather-metric-item">
                  <span className="hero-weather-metric-label">HUMIDITY</span>
                  <strong className="hero-weather-metric-val">{current.humidity ?? 87}%</strong>
                </div>
                <div className="hero-weather-metric-item">
                  <span className="hero-weather-metric-label">PROVIDER</span>
                  <strong className="hero-weather-metric-provider">Open-Meteo</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Arena Weather & Playability Modal for Athletes */}
      {showForecastModal && (
        <WeatherRiskAlertsModal
          weatherOverview={weatherOverview}
          bookings={bookings}
          isAdmin={false}
          onClose={() => setShowForecastModal(false)}
        />
      )}
    </section>
  )
}

export default function Footer({ onNavSelect, navItems = [], currentUser }) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="app-footer">
      <div className="footer-inner">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-col footer-col-brand">
            <div className="footer-brand-header">
              <img
                src="/logo-dark.png"
                alt="MySpot"
                className="footer-brand-logo"
              />
            </div>
            <p className="footer-tagline">
              Reserve premier sporting courts, floodlit fields, and championship facilities. Built for athletes, teams, and active communities.
            </p>
            <div className="footer-status-pill">
              <span className="live-indicator-dot"></span>
              <span>All Venues Operational • Instant Booking</span>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="footer-col">
            <h4 className="footer-heading">Navigation</h4>
            <ul className="footer-links">
              {navItems.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="footer-link-btn"
                    onClick={() => {
                      onNavSelect(item)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Venues Column */}
          <div className="footer-col">
            <h4 className="footer-heading">Venues & Facilities</h4>
            <ul className="footer-links">
              <li>
                <button type="button" className="footer-link-btn" onClick={() => onNavSelect('Facilities')}>
                  Championship Football Turf
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => onNavSelect('Facilities')}>
                  Skyline Badminton Arenas
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => onNavSelect('Facilities')}>
                  Olympic Aquatic Center
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => onNavSelect('Facilities')}>
                  Riverside Tennis Courts
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => onNavSelect('Facilities')}>
                  Premier Cricket Stadium
                </button>
              </li>
            </ul>
          </div>

          {/* Club Info Column */}
          <div className="footer-col">
            <h4 className="footer-heading">Club Schedule</h4>
            <div className="footer-schedule-info">
              <p>
                <strong>Daily Court Access:</strong>
                <span>06:00 AM – 11:00 PM</span>
              </p>
              <p>
                <strong>Support Desk:</strong>
                <span>24/7 Rapid Response</span>
              </p>
              <p className="footer-location-text">
                📍 Central Sports District, Stadium Blvd.
              </p>
            </div>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <p>© {currentYear} SmartSports Club. All rights reserved.</p>
          <div className="footer-meta-links">
            <span>Fair Play Policy</span>
            <span className="dot-divider">•</span>
            <span>Rain-Check Rescheduling</span>
            <span className="dot-divider">•</span>
            <span>Instant Confirmation</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

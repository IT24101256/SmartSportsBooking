export default function AdminTopBar({
  activeTab,
  onMenuToggle,
  onOpenBooking,
  theme,
  setTheme,
  currentUser,
}) {
  const tabTitles = {
    Overview: 'Executive Dashboard & Analytics',
    Facilities: 'Facility Portfolio & Court Operations',
    Bookings: 'Reservations, Schedule & Refunds',
    Support: 'Customer Support & Concierge Chat',
    Revenue: 'Financial Operations & Revenue Intelligence',
    Members: 'Member Directory & Access Management',
  }

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <button
          type="button"
          className="admin-hamburger-btn"
          onClick={onMenuToggle}
          aria-label="Toggle navigation menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="admin-breadcrumb-wrap">
          <div className="admin-breadcrumb-trail">
            <span className="breadcrumb-root">
              {currentUser?.role?.toLowerCase() === 'manager' ? 'Manager Suite' : 'Admin Suite'}
            </span>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{activeTab}</span>
          </div>
          <h2 className="admin-topbar-title">{tabTitles[activeTab] || activeTab}</h2>
        </div>
      </div>

      <div className="admin-topbar-right">
        {/* System Status Pill */}
        <div className="admin-status-pill" title="Backend API Connected">
          <span className="hub-pulse-dot" />
          <span className="status-label">Operational</span>
        </div>

        {/* Quick Theme Switcher */}
        <button
          type="button"
          className="admin-topbar-icon-btn"
          onClick={() => setTheme((curr) => (curr === 'light' ? 'dark' : 'light'))}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {/* Quick Booking CTA */}
        <button
          type="button"
          className="admin-topbar-cta-btn"
          onClick={onOpenBooking}
        >
          <span className="btn-plus">+</span>
          <span>Book Court</span>
        </button>
      </div>
    </header>
  )
}

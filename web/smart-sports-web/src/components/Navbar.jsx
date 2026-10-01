import { useState, useEffect } from 'react'
import NotificationBell from './NotificationBell'

export default function Navbar({
  activeTab,
  setActiveTab,
  navItems = [],
  currentUser,
  loggedIn,
  onOpenBooking,
  onOpenBookWithAi,
  onLoginClick,
  onSignOutClick,
  theme,
  setTheme,
  notifications,
  setNotifications,
  goBack,
  hasHistory,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on tab switch or resize
  const handleNavSelect = (tab) => {
    setActiveTab(tab)
    setMobileMenuOpen(false)
  }

  const userInitials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AJ'

  const isGuest = !loggedIn || !currentUser || currentUser?.role?.toLowerCase() === 'guest'

  return (
    <header className={`navbar-wrapper ${scrolled ? 'is-scrolled' : ''}`}>
      <nav className="navbar-container" aria-label="Main Navigation">
        {/* Brand Logo */}
        <div
          className="navbar-brand"
          onClick={() => handleNavSelect('Overview')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleNavSelect('Overview')}
        >
          <img
            src={theme === 'dark' ? '/logo-dark.png' : '/logo.png'}
            alt="MySpot"
            className="brand-logo-img"
          />
        </div>

        {/* Desktop Navigation Links */}
        <div className="navbar-links-desktop">
          {navItems.map((item) => {
            const isActive = activeTab === item
            return (
              <button
                key={item}
                type="button"
                className={`nav-pill ${isActive ? 'nav-pill-active' : ''}`}
                onClick={() => handleNavSelect(item)}
                aria-current={isActive ? 'page' : undefined}
              >
                {item}
              </button>
            )
          })}
        </div>

        {/* Desktop Right Actions */}
        <div className="navbar-actions-desktop">
          {/* Theme Toggle */}
          <button
            className="navbar-icon-btn"
            type="button"
            onClick={() => setTheme((curr) => (curr === 'light' ? 'dark' : 'light'))}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {/* Notifications / Alerts - only for logged-in members & admins (hidden for guests) */}
          {!isGuest && (
            <div className="navbar-notification-wrapper">
              <NotificationBell
                currentUser={currentUser}
                notifications={notifications}
                onClearAll={() => {
                  const isAdmin = ['admin', 'manager'].includes(currentUser?.role?.toLowerCase())
                  setNotifications((prev) => prev.filter((n) => (isAdmin ? n.role !== 'admin' : n.role === 'admin')))
                }}
                onDismiss={(id) => {
                  setNotifications((prev) => prev.filter((n) => n.id !== id))
                }}
                onNotificationClick={(item) => {
                  setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)))
                  setActiveTab('Bookings')
                }}
              />
            </div>
          )}

          {/* Book With AI CTA */}
          <button
            className="navbar-ai-cta-btn"
            type="button"
            onClick={onOpenBookWithAi}
            title="Book With AI Assistant"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
              transition: 'all 0.2s',
            }}
          >
            <span>✨</span>
            <span>Book With AI</span>
          </button>

          {/* Strong Book Now CTA */}
          <button
            className="navbar-cta-btn"
            type="button"
            onClick={onOpenBooking}
            id="navbar-book-now-btn"
          >
            <span className="cta-icon">+</span>
            <span>Book Now</span>
          </button>

          {/* Profile / Auth Status */}
          {loggedIn ? (
            <div
              className="navbar-profile-pill interactive-profile"
              onClick={() => setActiveTab && setActiveTab('Profile')}
              role="button"
              tabIndex={0}
              title={`Click to open account profile for ${currentUser?.name || 'Member'}`}
            >
              <div className="navbar-avatar">{userInitials}</div>
              <div className="navbar-user-info">
                <span className="user-name">{currentUser?.name || 'Member'}</span>
                <span className="user-role-badge">
                  {currentUser?.role === 'admin' ? 'Admin' : currentUser?.role === 'manager' ? 'Manager' : 'Member'}
                </span>
              </div>
              <button
                className="navbar-signout-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSignOutClick()
                }}
                title="Sign out"
                aria-label="Sign out"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              className="navbar-login-btn"
              type="button"
              onClick={onLoginClick}
            >
              Sign in
            </button>
          )}
        </div>

        {/* Mobile Action Controls */}
        <div className="navbar-actions-mobile">
          <button
            className="navbar-cta-btn-mobile"
            type="button"
            onClick={onOpenBooking}
          >
            + Book
          </button>

          <button
            className="navbar-hamburger-btn"
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu-dropdown" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <img
                src={theme === 'dark' ? '/logo-dark.png' : '/logo.png'}
                alt="MySpot"
                className="brand-logo-img mobile-brand-logo"
              />
              <button
                className="close-btn"
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <div className="mobile-nav-links">
              {navItems.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`mobile-nav-item ${activeTab === item ? 'active' : ''}`}
                  onClick={() => handleNavSelect(item)}
                >
                  <span>{item}</span>
                  {activeTab === item && <span className="active-dot">●</span>}
                </button>
              ))}
            </div>

            <div className="mobile-menu-footer">
              <div className="mobile-footer-row">
                <button
                  className="secondary-btn mobile-theme-btn"
                  type="button"
                  onClick={() => setTheme((curr) => (curr === 'light' ? 'dark' : 'light'))}
                >
                  {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </button>
              </div>

              {loggedIn ? (
                <div className="mobile-profile-section">
                  <div
                    className="profile-identity interactive-profile"
                    onClick={() => {
                      if (setActiveTab) setActiveTab('Profile')
                      setMobileMenuOpen(false)
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="navbar-avatar">{userInitials}</div>
                    <div>
                      <strong>{currentUser?.name || 'Member'}</strong>
                      <span>{currentUser?.email}</span>
                      <small style={{ color: '#0284c7', display: 'block', marginTop: '2px', fontWeight: 600 }}>⚙️ Account Settings →</small>
                    </div>
                  </div>
                  <button
                    className="secondary-btn full danger-text"
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      onSignOutClick()
                    }}
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  className="primary-btn full"
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    onLoginClick()
                  }}
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

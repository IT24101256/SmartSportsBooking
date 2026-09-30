import { useState } from 'react'

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  currentUser,
  notifications = [],
  setNotifications,
  theme,
  setTheme,
  onOpenBooking,
  onSignOutClick,
  mobileOpen,
  setMobileOpen,
}) {
  const userInitials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AD'

  const userRole = (currentUser?.role || '').toLowerCase()
  const isManager = userRole === 'manager'

  const unreadNotifications = notifications.filter(
    (n) => !n.read && (isManager ? (n.role === 'manager' || n.role === 'admin') : n.role === 'admin')
  ).length

  const fullNavSections = [
    {
      label: 'OPERATIONS',
      items: [
        {
          id: 'Overview',
          label: 'Dashboard',
          icon: (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
          ),
        },
        {
          id: 'Facilities',
          label: 'Facilities & Courts',
          icon: (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M5 21V7l8-4 6 3v15M9 9v.01M9 13v.01M9 17v.01M15 9v.01M15 13v.01M15 17v.01" />
            </svg>
          ),
        },
        {
          id: 'Bookings',
          label: 'Bookings & Refunds',
          icon: (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          ),
        },
      ],
    },
    {
      label: 'COMMUNICATION',
      items: [
        {
          id: 'Support',
          label: 'Support Hub',
          icon: (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          ),
        },
      ],
    },
    {
      label: 'FINANCE & ACCESS',
      items: [
        {
          id: 'Revenue',
          label: 'Revenue & Finance',
          icon: (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          ),
        },
        {
          id: 'Members',
          label: 'Member Directory',
          icon: (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          ),
        },
      ],
    },
  ]

  // Manager only has access to Bookings and Support tabs
  const navSections = isManager
    ? [
        {
          label: 'OPERATIONS',
          items: fullNavSections[0].items.filter((item) => item.id === 'Bookings'),
        },
        {
          label: 'COMMUNICATION',
          items: fullNavSections[1].items.filter((item) => item.id === 'Support'),
        },
      ]
    : fullNavSections

  const handleSelect = (tab) => {
    setActiveTab(tab)
    if (setMobileOpen) setMobileOpen(false)
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`admin-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand & Badge */}
        <div className="admin-sidebar-header">
          <div
            className="admin-sidebar-brand"
            onClick={() => handleSelect(isManager ? 'Bookings' : 'Overview')}
            role="button"
            tabIndex={0}
          >
            <img
              src={theme === 'dark' ? '/logo-dark.png' : '/logo.png'}
              alt={isManager ? 'MySpot Manager' : 'MySpot Admin'}
              className="admin-sidebar-logo"
            />
          </div>
          <div className="admin-console-tag">
            <span className="hub-pulse-dot" />
            <span>{isManager ? 'MANAGER CONSOLE' : 'ADMIN CONSOLE'}</span>
          </div>

          {/* Close button on mobile */}
          {setMobileOpen && (
            <button
              type="button"
              className="admin-sidebar-close-btn"
              onClick={() => setMobileOpen(false)}
              aria-label="Close sidebar"
            >
              ✕
            </button>
          )}
        </div>

        {/* Action Button: Quick Book / Facility */}
        <div className="admin-sidebar-cta">
          <button
            type="button"
            className="admin-sidebar-new-booking-btn"
            onClick={() => {
              onOpenBooking()
              if (setMobileOpen) setMobileOpen(false)
            }}
          >
            <span className="btn-plus-icon">+</span>
            <span>New Reservation</span>
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="admin-sidebar-nav" aria-label="Admin Navigation">
          {navSections.map((section) => (
            <div key={section.label} className="admin-nav-group">
              <span className="admin-nav-group-label">{section.label}</span>
              <ul className="admin-nav-list">
                {section.items.map((item) => {
                  const isActive = activeTab === item.id
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`admin-nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => handleSelect(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className="admin-nav-icon">{item.icon}</span>
                        <span className="admin-nav-text">{item.label}</span>
                        {isActive && <span className="admin-nav-active-pill" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom User & System Controls */}
        <div className="admin-sidebar-footer">
          {/* Quick theme & notification actions */}
          <div className="admin-footer-quick-tools">
            <button
              type="button"
              className="admin-tool-icon-btn"
              onClick={() => setTheme((curr) => (curr === 'light' ? 'dark' : 'light'))}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
              <span className="tool-label">{theme === 'light' ? 'Dark' : 'Light'}</span>
            </button>

            <button
              type="button"
              className="admin-tool-icon-btn"
              onClick={() => handleSelect('Bookings')}
              title={`${unreadNotifications} pending alerts`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="tool-label">Alerts</span>
              {unreadNotifications > 0 && (
                <span className="admin-tool-badge">{unreadNotifications}</span>
              )}
            </button>
          </div>

          {/* Admin User Card */}
          <div className="admin-profile-card">
            <div className="admin-avatar-wrap">
              <div className="admin-user-avatar">{userInitials}</div>
              <span className="admin-online-dot" />
            </div>

            <div className="admin-user-meta">
              <span className="admin-user-name" title={currentUser?.name}>
                {currentUser?.name || 'Administrator'}
              </span>
              <span className="admin-role-badge">
                {currentUser?.role === 'manager' ? 'Facility Manager' : 'Executive Admin'}
              </span>
            </div>

            <button
              type="button"
              className="admin-signout-btn"
              onClick={onSignOutClick}
              title={isManager ? "Sign Out of Manager Console" : "Sign Out of Admin Console"}
              aria-label="Sign Out"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

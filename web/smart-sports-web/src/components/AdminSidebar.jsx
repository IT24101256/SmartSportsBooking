import { useState, useRef, useEffect, useMemo } from 'react'

const renderNow = Date.now()

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
  bookings = [],
  supportRequests = [],
}) {
  const [showAlertsBox, setShowAlertsBox] = useState(false)
  const [alertsFilter, setAlertsFilter] = useState('all') // 'all', 'unread', 'actions'
  const alertsBoxRef = useRef(null)
  const alertsBtnRef = useRef(null)

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

  // Filter notifications strictly for this role
  const roleNotifications = useMemo(() => {
    return notifications.filter((n) =>
      isManager ? (n.role === 'manager' || n.role === 'admin') : n.role === 'admin'
    )
  }, [notifications, isManager])

  // Operational items from bookings and support
  const operationalItems = useMemo(() => {
    const items = []

    // 1. Pending Refunds
    const pendingRefunds = bookings.filter(
      (b) => b.refundStatus === 'Pending' || (b.refundPercentage > 0 && !b.refundConfirmedAt)
    )
    pendingRefunds.forEach((b) => {
      items.push({
        id: `op-refund-${b.id}`,
        type: 'refund_pending',
        title: `Refund Approval Required (#${b.id})`,
        message: `${b.customerName || 'Member'} cancelled booking #${b.id}. Refund of LKR ${Number(b.refundAmount || 0).toLocaleString()} (${b.refundPercentage}%) requires confirmation.`,
        timestamp: b.cancelledAt || b.bookingDate,
        bookingId: b.id,
        isOperational: true,
        read: false,
      })
    })

    // 2. Pending Bank Slips
    const pendingSlips = bookings.filter(
      (b) =>
        (b.paymentMethod || '').toLowerCase() === 'bankslip' &&
        (b.paymentStatus === 'Pending' || b.status === 'Pending')
    )
    pendingSlips.forEach((b) => {
      items.push({
        id: `op-slip-${b.id}`,
        type: 'verified',
        title: `Bank Slip Verification Required (#${b.id})`,
        message: `${b.customerName || 'Member'} uploaded bank slip for ${b.facilityName || b.facility?.name || 'court'} booking. Verify in Bookings.`,
        timestamp: b.bookingDate,
        bookingId: b.id,
        isOperational: true,
        read: false,
      })
    })

    // 3. Reschedule Requests
    const reschedules = bookings.filter((b) => b.isRescheduleRequested || b.status === 'RescheduleRequested')
    reschedules.forEach((b) => {
      items.push({
        id: `op-resched-${b.id}`,
        type: 'reschedule_requested',
        title: `Rain-Check Reschedule Active (#${b.id})`,
        message: `Free rain-check reschedule requested for ${b.facilityName || 'court'}. Reason: ${b.rescheduleReason || 'Weather conditions'}.`,
        timestamp: b.rescheduleRequestedAt || b.bookingDate,
        bookingId: b.id,
        isOperational: true,
        read: false,
      })
    })

    // 4. High Priority Support Tickets
    const highTickets = supportRequests.filter((s) => s.status === 'Pending' && s.priority === 'High')
    highTickets.forEach((s) => {
      items.push({
        id: `op-support-${s.id}`,
        type: 'support',
        title: `High Priority Support (#${s.id})`,
        message: `Member inquiry "${s.title}": ${s.detail || ''}`,
        timestamp: s.createdAtUtc || new Date().toISOString(),
        supportId: s.id,
        isOperational: true,
        read: false,
      })
    })

    return items
  }, [bookings, supportRequests])

  // Combine notifications, avoiding duplicates
  const combinedAlerts = useMemo(() => {
    const list = [...operationalItems]
    roleNotifications.forEach((n) => {
      const exists = list.some(
        (op) =>
          (n.bookingId && op.bookingId === n.bookingId && op.type === n.type) ||
          op.id === n.id
      )
      if (!exists) {
        list.push(n)
      }
    })
    return list
  }, [operationalItems, roleNotifications])

  const unreadCount = combinedAlerts.filter((n) => !n.read).length

  // Filtered alerts for display
  const displayAlerts = useMemo(() => {
    if (alertsFilter === 'unread') return combinedAlerts.filter((n) => !n.read)
    if (alertsFilter === 'actions') {
      return combinedAlerts.filter(
        (n) =>
          n.type === 'refund_pending' ||
          n.type === 'reschedule_requested' ||
          n.isOperational ||
          n.bookingId
      )
    }
    return combinedAlerts
  }, [combinedAlerts, alertsFilter])

  // Outside click & Escape to dismiss
  useEffect(() => {
    if (!showAlertsBox) return
    const handleOutsideClick = (e) => {
      if (
        alertsBoxRef.current &&
        !alertsBoxRef.current.contains(e.target) &&
        !alertsBtnRef.current?.contains(e.target)
      ) {
        setShowAlertsBox(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowAlertsBox(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showAlertsBox])

  const handleMarkAllAsRead = () => {
    if (setNotifications) {
      setNotifications((prev) =>
        prev.map((n) => {
          const isTargetRole = isManager
            ? n.role === 'manager' || n.role === 'admin'
            : n.role === 'admin'
          return isTargetRole ? { ...n, read: true } : n
        })
      )
    }
  }

  const handleClearAll = () => {
    if (setNotifications) {
      setNotifications((prev) =>
        prev.filter((n) => {
          const isTargetRole = isManager
            ? n.role === 'manager' || n.role === 'admin'
            : n.role === 'admin'
          return !isTargetRole
        })
      )
    }
  }

  const handleDismissAlert = (id) => {
    if (setNotifications) {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }
  }

  const handleAlertClick = (alert) => {
    if (setNotifications) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === alert.id ? { ...n, read: true } : n))
      )
    }
    setShowAlertsBox(false)
    if (setMobileOpen) setMobileOpen(false)

    if (alert.bookingId) {
      handleSelect('Bookings')
    } else if (alert.supportId || alert.type === 'support') {
      handleSelect('Support')
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'refund_pending':
      case 'refund_confirmed':
        return '💰'
      case 'reschedule_requested':
      case 'reschedule_accepted':
        return '🌧️'
      case 'cancelled':
        return '❌'
      case 'equipment_payment':
        return '🎒'
      case 'support':
        return '💬'
      case 'verified':
        return '✅'
      default:
        return '🔔'
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now'
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return 'Recently'
    const diff = Math.floor((renderNow - date.getTime()) / 60000)
    if (diff < 1) return 'Just now'
    if (diff < 60) return `${diff}m ago`
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
    return date.toLocaleDateString()
  }

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
          id: 'Equipments',
          label: 'Sports Equipment',
          icon: (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          ),
        },
        {
          id: 'Sport Categories',
          label: 'Sport Categories',
          icon: (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M8 12h8M12 8v8" />
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

            {/* Interactive Alerts Button */}
            <button
              ref={alertsBtnRef}
              type="button"
              className={`admin-tool-icon-btn ${showAlertsBox ? 'active-tool' : ''}`}
              onClick={() => setShowAlertsBox((prev) => !prev)}
              title={`${unreadCount} pending alerts`}
              aria-label="Toggle Operations Alerts"
              aria-expanded={showAlertsBox}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="tool-label">Alerts</span>
              {unreadCount > 0 && (
                <span className="admin-tool-badge">{unreadCount}</span>
              )}
            </button>
          </div>

          {/* Admin User Card */}
          <div
            className="admin-profile-card interactive-profile"
            onClick={() => handleSelect('Profile')}
            role="button"
            tabIndex={0}
            title="Open Account Profile & Security Settings"
          >
            <div className="admin-avatar-wrap">
              <div className="admin-user-avatar">{userInitials}</div>
              <span className="admin-online-dot" />
            </div>

            <div className="admin-user-meta">
              <span className="admin-user-name" title={currentUser?.name}>
                {currentUser?.name || 'Administrator'}
              </span>
              <span className="admin-role-badge">
                {isManager ? 'Facility Manager' : 'Executive Admin'}
              </span>
            </div>

            <button
              type="button"
              className="admin-signout-btn"
              onClick={(e) => {
                e.stopPropagation()
                onSignOutClick()
              }}
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

      {/* OPERATIONS ALERTS FLYOUT BOX */}
      {showAlertsBox && (
        <div className="admin-alerts-flyout" ref={alertsBoxRef}>
          {/* Flyout Header */}
          <div className="admin-alerts-header">
            <div className="admin-alerts-header-left">
              <span className="admin-alerts-bell-icon">🔔</span>
              <div>
                <h3 className="admin-alerts-title">Operations Alerts</h3>
                <span className="admin-alerts-role-tag">
                  {isManager ? 'Manager Console' : 'Admin Console'}
                </span>
              </div>
            </div>

            <div className="admin-alerts-header-actions">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="alerts-hdr-btn"
                  onClick={handleMarkAllAsRead}
                  title="Mark all alerts as read"
                >
                  Mark read
                </button>
              )}
              {roleNotifications.length > 0 && (
                <button
                  type="button"
                  className="alerts-hdr-btn clear-btn"
                  onClick={handleClearAll}
                  title="Clear all alerts"
                >
                  Clear all
                </button>
              )}
              <button
                type="button"
                className="admin-alerts-close-btn"
                onClick={() => setShowAlertsBox(false)}
                aria-label="Close alerts panel"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="admin-alerts-filter-bar">
            <button
              type="button"
              className={`alerts-filter-pill ${alertsFilter === 'all' ? 'active' : ''}`}
              onClick={() => setAlertsFilter('all')}
            >
              All ({combinedAlerts.length})
            </button>
            <button
              type="button"
              className={`alerts-filter-pill ${alertsFilter === 'unread' ? 'active' : ''}`}
              onClick={() => setAlertsFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              className={`alerts-filter-pill ${alertsFilter === 'actions' ? 'active' : ''}`}
              onClick={() => setAlertsFilter('actions')}
            >
              Actions Required
            </button>
          </div>

          {/* Scrollable Alerts List */}
          <div className="admin-alerts-list">
            {displayAlerts.length === 0 ? (
              <div className="admin-alerts-empty">
                <span className="empty-sparkle">✨</span>
                <strong>No Pending Alerts</strong>
                <p>All member bookings, cancellation refunds, and support inquiries are up to date.</p>
              </div>
            ) : (
              displayAlerts.map((item) => (
                <div
                  key={item.id}
                  className={`admin-alert-item ${item.read ? 'is-read' : 'is-unread'}`}
                  onClick={() => handleAlertClick(item)}
                >
                  <span className="alert-type-icon">{getIcon(item.type)}</span>
                  <div className="alert-content-body">
                    <div className="alert-top-row">
                      <strong className="alert-item-title">{item.title}</strong>
                      <span className="alert-time-tag">{formatTime(item.timestamp)}</span>
                    </div>
                    <p className="alert-item-message">{item.message}</p>
                    {item.bookingId && (
                      <span className="alert-action-link">
                        Review Booking #{item.bookingId} →
                      </span>
                    )}
                    {item.supportId && (
                      <span className="alert-action-link">
                        Open Support Ticket #{item.supportId} →
                      </span>
                    )}
                  </div>
                  {!item.isOperational && (
                    <button
                      type="button"
                      className="alert-dismiss-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDismissAlert(item.id)
                      }}
                      title="Dismiss alert"
                      aria-label="Dismiss alert"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  )
}

import { useState, useRef, useEffect } from 'react'

const renderNow = Date.now()

export default function NotificationBell({
  currentUser,
  notifications = [],
  onClearAll,
  onDismiss,
  onNotificationClick,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const isAdmin = ['admin', 'manager'].includes(currentUser?.role?.toLowerCase())
  const targetRole = isAdmin ? 'admin' : 'user'

  // Filter notifications strictly for this role
  const roleNotifications = notifications.filter((item) => {
    if (item.targetRole) {
      return item.targetRole === targetRole
    }
    return isAdmin ? item.role === 'admin' : item.role !== 'admin'
  })

  const unreadCount = roleNotifications.filter((n) => !n.read).length

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen])

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

  return (
    <div className="notification-bell-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="notification-bell-btn navbar-icon-btn"
        id="notification-bell-btn"
        aria-label={`${isAdmin ? 'Admin' : 'User'} Notifications`}
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          position: 'relative',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '1px solid rgba(10, 30, 50, 0.1)',
          background: isOpen ? 'rgba(40, 120, 255, 0.12)' : 'rgba(10, 30, 50, 0.03)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.05rem',
          color: 'inherit',
          transition: 'all 0.2s ease',
          padding: 0,
          flexShrink: 0,
        }}
      >
        <span>🔔</span>
        {unreadCount > 0 && (
          <span
            className="notification-count-badge"
            id="notification-badge-count"
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              backgroundColor: isAdmin ? '#ef4444' : '#10b981',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 800,
              minWidth: '17px',
              height: '17px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #ffffff',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
              lineHeight: 1,
              padding: '0 2px',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="notification-dropdown-panel"
          id="notification-dropdown-panel"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: '360px',
            maxWidth: '90vw',
            backgroundColor: 'var(--panel-bg, #ffffff)',
            borderRadius: '14px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--border-color, #e2e8f0)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-subtle, #f8fafc)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '0.92rem' }}>
                {isAdmin ? '🛡️ Admin Notifications' : '👤 My Notifications'}
              </strong>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  backgroundColor: isAdmin ? '#fee2e2' : '#d1fae5',
                  color: isAdmin ? '#b91c1c' : '#047857',
                  fontWeight: 600,
                }}
              >
                {isAdmin ? 'Role: Admin' : 'Role: Member'}
              </span>
            </div>
            {roleNotifications.length > 0 && onClearAll && (
              <button
                type="button"
                onClick={onClearAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Clear all
              </button>
            )}
          </div>

          <div
            className="notification-list-scroll"
            style={{
              maxHeight: '340px',
              overflowY: 'auto',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {roleNotifications.length === 0 ? (
              <div
                style={{
                  padding: '30px 16px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>✨</div>
                No {isAdmin ? 'admin' : 'member'} notifications right now.
              </div>
            ) : (
              roleNotifications.map((item) => (
                <div
                  key={item.id}
                  className="notification-item-card"
                  onClick={() => {
                    if (onNotificationClick) onNotificationClick(item)
                    setIsOpen(false)
                  }}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: item.read ? 'transparent' : 'var(--bg-highlight, rgba(16, 185, 129, 0.05))',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: '2px' }}>
                    {getIcon(item.type)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-main, #1e293b)' }}>
                        {item.title}
                      </strong>
                      <small style={{ fontSize: '0.72rem', color: '#94a3b8', flexShrink: 0 }}>
                        {formatTime(item.timestamp)}
                      </small>
                    </div>
                    <p
                      style={{
                        margin: '3px 0 0',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted, #64748b)',
                        lineHeight: 1.35,
                      }}
                    >
                      {item.message}
                    </p>
                    {item.bookingId && (
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: '#2563eb',
                        }}
                      >
                        View Booking #{item.bookingId} →
                      </span>
                    )}
                  </div>
                  {onDismiss && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDismiss(item.id)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        lineHeight: 1,
                        alignSelf: 'flex-start',
                      }}
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
    </div>
  )
}

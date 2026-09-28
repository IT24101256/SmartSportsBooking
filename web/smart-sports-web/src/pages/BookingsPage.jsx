import { useState, useMemo } from 'react'
import BookingList from '../components/BookingList'
import UserCancelModal from '../components/UserCancelModal'
import UserRescheduleModal from '../components/UserRescheduleModal'
import AdminRescheduleModal from '../components/AdminRescheduleModal'
import AdminConfirmRefundModal from '../components/AdminConfirmRefundModal'

export default function BookingsPage({
  bookings = [],
  facilities = [],
  isAdmin,
  token,
  apiBaseUrl,
  onNewBooking,
  onStatusChange,
  onCancelWithRefund,
  onConfirmRefund,
  onRequestReschedule,
  onRescheduleBooking,
  onViewSlip,
  onReview,
}) {
  const [cancellingBooking, setCancellingBooking] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [userCancellingBooking, setUserCancellingBooking] = useState(null)
  const [userReschedulingBooking, setUserReschedulingBooking] = useState(null)
  const [adminReschedulingBooking, setAdminReschedulingBooking] = useState(null)
  const [confirmingRefundBooking, setConfirmingRefundBooking] = useState(null)

  // Filter toolbar state
  const [selectedFilter, setSelectedFilter] = useState('all') // 'all', 'cancelled', 'reschedule', 'pending', 'confirmed', 'turf', 'to-refund', 'refunded'
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTurf, setSelectedTurf] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Helper to check if a booking has expired (session time passed)
  const isBookingExpired = (booking) => {
    if (booking.isExpired !== undefined) return Boolean(booking.isExpired)
    if (!booking.bookingDate) return false
    const sessionDate = new Date(booking.bookingDate)
    if (isNaN(sessionDate.getTime())) return false
    const [hours, minutes] = (booking.startTime || '00:00').split(':').map(Number)
    const sessionTime = new Date(
      sessionDate.getFullYear(),
      sessionDate.getMonth(),
      sessionDate.getDate(),
      hours || 0,
      minutes || 0
    )
    return sessionTime.getTime() <= Date.now()
  }

  const isToRefundBooking = (b) => b.status === 'Cancelled' && (b.refundStatus === 'To Refund' || (Number(b.refundAmount || 0) > 0 && b.refundStatus !== 'Refunded'))

  const isFullRefundBooking = (b) => {
    if (!isToRefundBooking(b)) return false
    const pct = Number(b.refundPercentage || 0)
    const amt = Number(b.refundAmount || 0)
    const tot = Number(b.totalAmount || 0)
    if (pct === 100) return true
    if (b.refundStatus?.includes('100') || b.refundStatus?.toLowerCase().includes('full')) return true
    if (amt > 0 && tot > 0 && amt >= tot) return true
    return pct > 50
  }

  const isHalfRefundBooking = (b) => {
    if (!isToRefundBooking(b)) return false
    const pct = Number(b.refundPercentage || 0)
    const amt = Number(b.refundAmount || 0)
    const tot = Number(b.totalAmount || 0)
    if (pct === 50) return true
    if (b.refundStatus?.includes('50') || b.refundStatus?.toLowerCase().includes('half') || b.refundStatus?.toLowerCase().includes('partial')) return true
    if (amt > 0 && tot > 0 && amt < tot) return true
    return pct > 0 && pct <= 50
  }

  // Filter computation
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const isReschedule = Boolean(booking.isRescheduleRequested || booking.status === 'RescheduleRequested')
      const status = booking.status || 'Pending'
      const refundStatus = booking.refundStatus || ''
      const facName = (booking.facility?.name || booking.facilityName || booking.name || '').toLowerCase()

      // 1. Date filter
      if (selectedDate) {
        const bDateStr = booking.bookingDate ? booking.bookingDate.slice(0, 10) : ''
        if (bDateStr !== selectedDate) return false
      }

      // 2. Turf / Facility filter
      if (selectedTurf) {
        if (selectedTurf === '__outdoor__') {
          const isOutdoor = ['turf', 'field', 'ground', 'cricket', 'football', 'volleyball'].some((k) => facName.includes(k))
          if (!isOutdoor) return false
        } else if (!facName.includes(selectedTurf.toLowerCase())) {
          return false
        }
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const cust = (booking.customerName || '').toLowerCase()
        const bId = String(booking.id || '')
        if (!facName.includes(q) && !cust.includes(q) && !bId.includes(q)) return false
      }

      // 4. Quick Filter Tabs
      switch (selectedFilter) {
        case 'cancelled':
          return status === 'Cancelled'
        case 'reschedule':
          return isReschedule
        case 'pending':
          return status === 'Pending'
        case 'confirmed':
          return status === 'Confirmed'
        case 'turf':
          return ['turf', 'field', 'ground', 'court', 'cricket', 'football', 'netball'].some((k) => facName.includes(k))
        case 'to-refund':
          return isToRefundBooking(booking)
        case 'full-refund':
          return isFullRefundBooking(booking)
        case 'half-refund':
          return isHalfRefundBooking(booking)
        case 'refunded':
          return refundStatus === 'Refunded'
        default:
          return true
      }
    })
  }, [bookings, selectedDate, selectedTurf, searchQuery, selectedFilter])

  // Pagination calculation
  const totalCount = filteredBookings.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const visibleBookings = filteredBookings.slice(startIndex, startIndex + pageSize)

  // Reset page when filter changes
  const handleFilterChange = (newFilter) => {
    setSelectedFilter(newFilter)
    setPage(1)
  }

  // Admin Cancel Modal handlers
  const handleOpenAdminCancelModal = (booking) => {
    setCancellingBooking(booking)
    setCancelReason('')
  }

  const handleConfirmAdminCancel = () => {
    if (!cancellingBooking) return
    if (onCancelWithRefund) {
      onCancelWithRefund(cancellingBooking, cancelReason.trim())
    } else {
      onStatusChange(cancellingBooking, 'Cancelled', cancelReason.trim())
    }
    setCancellingBooking(null)
    setCancelReason('')
  }

  const filterButtons = [
    { id: 'all', label: 'All Bookings', icon: '📋' },
    { id: 'cancelled', label: 'Cancelled', icon: '❌' },
    { id: 'reschedule', label: 'Reschedule', icon: '🌧️' },
    { id: 'pending', label: 'Pending', icon: '⏳' },
    { id: 'confirmed', label: 'Confirmed', icon: '✅' },
    { id: 'turf', label: 'Turf / Outdoor', icon: '🏟️' },
    { id: 'to-refund', label: 'To Refund (All)', icon: '💰', badge: bookings.filter(isToRefundBooking).length },
    { id: 'full-refund', label: 'Full Refund (100%)', icon: '🟢', badge: bookings.filter(isFullRefundBooking).length },
    { id: 'half-refund', label: 'Half Refund (50%)', icon: '🟡', badge: bookings.filter(isHalfRefundBooking).length },
    { id: 'refunded', label: 'Refunded', icon: '✨' },
  ]

  return (
    <section className="panel full-width-panel" id="bookings-page-panel">
      <div className="panel-header">
        <div>
          <h3>Upcoming bookings</h3>
          <p className="panel-subtitle" style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            {isAdmin
              ? 'Manage facility reservations, verify and confirm refunds, weather adjustments, and transfers.'
              : 'Review your games, free reschedule rain-checks, or request policy cancellations.'}
          </p>
        </div>
        <button className="text-action" type="button" id="new-booking-btn" onClick={onNewBooking}>
          + New booking
        </button>
      </div>

      {/* COMPREHENSIVE FILTER TOOLBAR */}
      <div className="bookings-filter-bar" id="bookings-filter-bar" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.2rem', padding: '16px', background: 'var(--card-bg, #f8fafc)', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)' }}>
        {/* Quick Filter Chips */}
        <div className="filter-chips-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {filterButtons.map((btn) => {
            const isActive = selectedFilter === btn.id
            return (
              <button
                key={btn.id}
                type="button"
                id={`filter-btn-${btn.id}`}
                className={`filter-chip ${isActive ? 'filter-chip-active' : ''}`}
                onClick={() => handleFilterChange(btn.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  border: isActive ? '1px solid #10b981' : '1px solid var(--border-color, #cbd5e1)',
                  backgroundColor: isActive ? 'var(--chip-active-bg, #10b98115)' : 'var(--panel-bg, #ffffff)',
                  color: isActive ? '#059669' : 'inherit',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{btn.icon}</span>
                <span>{btn.label}</span>
                {Boolean(btn.badge) && (
                  <span
                    style={{
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      borderRadius: '999px',
                      padding: '1px 6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                    }}
                  >
                    {btn.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Input filters: Date, Turf dropdown, Search */}
        <div
          className="filter-inputs-row"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>📅 Date:</span>
            <input
              type="date"
              id="booking-date-filter"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setPage(1)
              }}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #cbd5e1)',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
              }}
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  padding: '4px',
                }}
                title="Clear date"
              >
                ✕
              </button>
            )}
          </div>

          {/* Turf / Facility selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>🏟️ Turf:</span>
            <select
              id="booking-turf-filter"
              value={selectedTurf}
              onChange={(e) => {
                setSelectedTurf(e.target.value)
                setPage(1)
              }}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #cbd5e1)',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
                backgroundColor: 'var(--panel-bg, #ffffff)',
              }}
            >
              <option value="">All Facilities & Turfs</option>
              <option value="__outdoor__">All Outdoor Turfs (Rain-Check Eligible)</option>
              {facilities.map((fac) => (
                <option key={fac.id || fac.name} value={fac.name}>
                  {fac.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search box */}
          <div style={{ flex: 1, minWidth: '180px' }}>
            <input
              type="text"
              id="booking-search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search by facility, member, or ID..."
              style={{
                width: '100%',
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #cbd5e1)',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {(selectedDate || selectedTurf || searchQuery || selectedFilter !== 'all') && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setSelectedFilter('all')
                setSelectedDate('')
                setSelectedTurf('')
                setSearchQuery('')
                setPage(1)
              }}
              style={{ fontSize: '0.82rem', padding: '6px 12px' }}
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* BOOKING LIST CONTENT */}
      {isAdmin ? (
        <div className="admin-booking-list" id="admin-booking-list">
          {visibleBookings.length === 0 && (
            <p className="empty-state" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
              No bookings match the selected criteria.
            </p>
          )}

          {visibleBookings.map((booking) => {
            const isExpired = isBookingExpired(booking)
            const isRescheduleRequested = Boolean(
              booking.isRescheduleRequested || booking.status === 'RescheduleRequested'
            )
            const isCancelled = booking.status === 'Cancelled'
            const isConfirmed = booking.status === 'Confirmed'
            const isToRefund = isToRefundBooking(booking)
            const isFullRefund = isToRefund && isFullRefundBooking(booking)
            const isHalfRefund = isToRefund && isHalfRefundBooking(booking)
            const isRefunded = isCancelled && booking.refundStatus === 'Refunded'

            return (
              <article
                className={`admin-booking-row ${isRescheduleRequested && !isExpired ? 'admin-reschedule-row' : ''} ${
                  isExpired ? 'admin-expired-row' : ''
                } ${isToRefund ? 'admin-to-refund-row' : ''}`}
                key={booking.id}
                id={`admin-booking-row-${booking.id}`}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong>{booking.name}</strong>
                    {isExpired && (
                      <span className="expired-badge" id={`admin-expired-badge-${booking.id}`}>
                        🕒 Expired
                      </span>
                    )}
                    {!isExpired && isRescheduleRequested && (
                      <span className="reschedule-flag-badge">
                        🌧️ Reschedule Requested
                      </span>
                    )}
                    {isToRefund && isFullRefund && (
                      <span
                        className="to-refund-badge full-refund-badge"
                        style={{
                          backgroundColor: '#ecfdf5',
                          color: '#065f46',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          border: '1px solid #10b981',
                        }}
                      >
                        🟢 Full 100% Refund: LKR {Number(booking.refundAmount || 0).toLocaleString()} (Verification Required)
                      </span>
                    )}
                    {isToRefund && isHalfRefund && (
                      <span
                        className="to-refund-badge half-refund-badge"
                        style={{
                          backgroundColor: '#fffbeb',
                          color: '#92400e',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          border: '1px solid #f59e0b',
                        }}
                      >
                        🟡 50% Half Refund: LKR {Number(booking.refundAmount || 0).toLocaleString()} (Verification Required)
                      </span>
                    )}
                    {isRefunded && (
                      <span
                        className="refunded-badge"
                        style={{
                          backgroundColor: '#d1fae5',
                          color: '#065f46',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        ✅ Refunded (LKR {Number(booking.refundAmount || 0).toLocaleString()})
                      </span>
                    )}
                  </div>
                  <span>📅 {booking.date} · Customer: <b>{booking.customerName}</b></span>
                  <small>
                    Payment: <b>{booking.paymentMethod || 'Legacy'}</b> / {booking.paymentStatus || booking.status}
                    {booking.totalAmount ? ` · LKR ${Number(booking.totalAmount).toLocaleString()}` : ''}
                  </small>

                  {/* Reschedule alert for admin (only active) */}
                  {!isExpired && isRescheduleRequested && (
                    <div className="admin-reschedule-notice">
                      <strong>Reschedule request sent to member:</strong> {booking.rescheduleReason || 'Heavy rain / weather impact.'}
                    </div>
                  )}

                  {/* Cancellation reason & refund info */}
                  {isCancelled && (
                    <div className="admin-cancel-reason">
                      <div><strong>Cancellation reason:</strong> {booking.cancellationReason || 'No reason provided.'}</div>
                      {booking.refundStatus && (
                        <div style={{ marginTop: '4px' }}>
                          <span className="refund-label">Refund policy: </span>
                          <strong
                            style={{
                              color: isRefunded ? '#10b981' : isFullRefund ? '#059669' : isHalfRefund ? '#d97706' : '#64748b',
                            }}
                          >
                            {isRefunded
                              ? `Refunded (${booking.refundPercentage || 100}%) · LKR ${Number(booking.refundAmount || 0).toLocaleString()}`
                              : isFullRefund
                              ? `Full Refund (100%) · LKR ${Number(booking.refundAmount || 0).toLocaleString()}`
                              : isHalfRefund
                              ? `Half Refund (50%) · LKR ${Number(booking.refundAmount || 0).toLocaleString()}`
                              : `${booking.refundStatus} (${booking.refundPercentage || 0}%) · LKR ${Number(booking.refundAmount || 0).toLocaleString()}`}
                          </strong>
                          {booking.refundConfirmedBy && (
                            <small style={{ display: 'block', color: '#64748b', marginTop: '2px' }}>
                              Verified by: {booking.refundConfirmedBy} {booking.refundNotes ? `· Note: "${booking.refundNotes}"` : ''}
                            </small>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="admin-booking-actions">
                  <span
                    className={
                      isExpired
                        ? 'status expired-chip'
                        : isRescheduleRequested
                        ? 'status reschedule-requested'
                        : isConfirmed
                        ? 'status confirmed'
                        : isCancelled
                        ? 'status cancelled'
                        : 'status pending'
                    }
                  >
                    {isExpired ? 'Expired' : isRescheduleRequested ? 'Reschedule Requested' : booking.status}
                  </span>

                  {/* ADMIN REFUND VERIFICATION BUTTON: Only when cancelled with pending refund */}
                  {isToRefund && (
                    <button
                      className="primary-btn admin-confirm-refund-action-btn"
                      type="button"
                      id={`admin-confirm-refund-btn-${booking.id}`}
                      onClick={() => setConfirmingRefundBooking(booking)}
                      style={{
                        backgroundColor: isFullRefund ? '#10b981' : '#f59e0b',
                        borderColor: isFullRefund ? '#10b981' : '#f59e0b',
                        color: '#ffffff',
                        fontWeight: 700,
                      }}
                      title="Verify and release refund to member"
                    >
                      {isFullRefund ? '💰 Confirm Full Refund (100%)' : '💰 Confirm Half Refund (50%)'}
                    </button>
                  )}

                  {booking.review && (
                    <button className="secondary-btn" type="button" onClick={() => onReview(booking)}>
                      View review
                    </button>
                  )}

                  {booking.bankSlipFileName && (
                    <button className="secondary-btn" type="button" onClick={() => onViewSlip(booking)}>
                      View slip
                    </button>
                  )}

                  {booking.paymentMethod === 'BankTransfer' && !isConfirmed && !isCancelled && (
                    <button
                      className="primary-btn"
                      type="button"
                      onClick={() => onStatusChange(booking, 'Confirmed')}
                    >
                      Verify transfer
                    </button>
                  )}

                  {/* Admin "Ask to Reschedule": Only if NOT cancelled and NOT expired */}
                  {!isCancelled && !isExpired && !isRescheduleRequested && (
                    <button
                      className="secondary-btn admin-ask-reschedule-btn"
                      type="button"
                      id={`ask-reschedule-btn-${booking.id}`}
                      onClick={() => setAdminReschedulingBooking(booking)}
                      title="Ask user to reschedule for free (e.g. heavy rain / weather impact)"
                    >
                      🌧️ Ask to reschedule
                    </button>
                  )}

                  {/* Reschedule waiting indicator */}
                  {!isCancelled && !isExpired && isRescheduleRequested && (
                    <span className="reschedule-waiting-chip">
                      ⏳ Waiting for user
                    </span>
                  )}

                  {/* Cancel button: Only if NOT cancelled and NOT expired */}
                  {!isCancelled && !isExpired && (
                    <button
                      className="secondary-btn danger-hover-btn"
                      type="button"
                      id={`admin-cancel-btn-${booking.id}`}
                      onClick={() => handleOpenAdminCancelModal(booking)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <BookingList
          bookings={visibleBookings}
          onReview={onReview}
          onCancel={(booking) => setUserCancellingBooking(booking)}
          onReschedule={(booking) => setUserReschedulingBooking(booking)}
        />
      )}

      {/* PAGINATION CONTROLS */}
      {totalCount > 0 && (
        <div
          className="bookings-pagination-bar"
          id="bookings-pagination-bar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.2rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Showing <strong>{startIndex + 1}</strong> – <strong>{Math.min(startIndex + pageSize, totalCount)}</strong> of <strong>{totalCount}</strong> bookings
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Rows per page:</span>
            <select
              id="pagination-pagesize-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #cbd5e1)',
                fontSize: '0.82rem',
                backgroundColor: 'var(--panel-bg, #ffffff)',
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>

            <button
              type="button"
              className="secondary-btn"
              id="pagination-prev-btn"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ padding: '5px 12px', fontSize: '0.82rem' }}
            >
              ← Prev
            </button>

            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .map((p, idx, arr) => {
                  const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1
                  return (
                    <span key={p} style={{ display: 'flex', alignItems: 'center' }}>
                      {showEllipsisBefore && <span style={{ padding: '0 4px', color: '#94a3b8' }}>…</span>}
                      <button
                        type="button"
                        className={p === safePage ? 'primary-btn' : 'secondary-btn'}
                        onClick={() => setPage(p)}
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.82rem',
                          minWidth: '32px',
                        }}
                      >
                        {p}
                      </button>
                    </span>
                  )
                })}
            </div>

            <button
              type="button"
              className="secondary-btn"
              id="pagination-next-btn"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: '5px 12px', fontSize: '0.82rem' }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Admin Confirm Refund Modal */}
      {confirmingRefundBooking && (
        <AdminConfirmRefundModal
          booking={confirmingRefundBooking}
          onClose={() => setConfirmingRefundBooking(null)}
          onConfirm={async (booking, notes) => {
            if (onConfirmRefund) {
              await onConfirmRefund(booking, notes)
            }
          }}
        />
      )}

      {/* User Cancellation Modal with Policy Calculation */}
      {userCancellingBooking && (
        <UserCancelModal
          booking={userCancellingBooking}
          token={token}
          apiBaseUrl={apiBaseUrl}
          onClose={() => setUserCancellingBooking(null)}
          onConfirm={async (booking, reason) => {
            if (onCancelWithRefund) {
              await onCancelWithRefund(booking, reason)
            } else {
              await onStatusChange(booking, 'Cancelled', reason)
            }
          }}
        />
      )}

      {/* User Free Reschedule Modal */}
      {userReschedulingBooking && (
        <UserRescheduleModal
          booking={userReschedulingBooking}
          token={token}
          apiBaseUrl={apiBaseUrl}
          onClose={() => setUserReschedulingBooking(null)}
          onConfirm={async (booking, newDate, newStartTime, newEndTime) => {
            if (onRescheduleBooking) {
              await onRescheduleBooking(booking, newDate, newStartTime, newEndTime)
            }
          }}
        />
      )}

      {/* Admin Ask to Reschedule Modal */}
      {adminReschedulingBooking && (
        <AdminRescheduleModal
          booking={adminReschedulingBooking}
          onClose={() => setAdminReschedulingBooking(null)}
          onConfirm={async (booking, reason) => {
            if (onRequestReschedule) {
              await onRequestReschedule(booking, reason)
            }
          }}
        />
      )}

      {/* Admin Confirm Refund Modal */}
      {confirmingRefundBooking && (
        <AdminConfirmRefundModal
          booking={confirmingRefundBooking}
          onClose={() => setConfirmingRefundBooking(null)}
          onConfirm={async (booking, notes) => {
            if (onConfirmRefund) {
              await onConfirmRefund(booking, notes)
            }
          }}
        />
      )}

      {/* Admin Cancellation Reason Modal */}
      {cancellingBooking && (
        <div className="booking-modal-backdrop" onClick={() => setCancellingBooking(null)}>
          <div className="booking-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="booking-modal-header">
              <div>
                <p className="eyebrow subtle" style={{ color: '#ef4444' }}>Admin Cancellation</p>
                <h3>Cancel Booking #{cancellingBooking.id}</h3>
              </div>
              <button type="button" className="close-btn" onClick={() => setCancellingBooking(null)}>×</button>
            </div>
            <div className="booking-form" style={{ marginTop: '1rem' }}>
              <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '0.92rem' }}>
                You are cancelling the booking for <strong>{cancellingBooking.name}</strong> on <strong>{cancellingBooking.date}</strong>.
              </p>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontWeight: 600 }}>Reason for cancellation <small style={{ color: '#ef4444' }}>*</small></span>
                <textarea
                  rows="3"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Court emergency maintenance, bad weather, double booking adjustment..."
                  required
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    fontFamily: 'inherit',
                    fontSize: '0.92rem',
                    resize: 'vertical',
                  }}
                />
              </label>
              <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="secondary-btn" onClick={() => setCancellingBooking(null)}>
                  Keep Booking
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                  disabled={!cancelReason.trim()}
                  onClick={handleConfirmAdminCancel}
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

import { useState, useMemo } from 'react'
import BookingList from '../components/BookingList'
import UserCancelModal from '../components/UserCancelModal'
import UserRescheduleModal from '../components/UserRescheduleModal'
import AdminRescheduleModal from '../components/AdminRescheduleModal'
import AdminConfirmRefundModal from '../components/AdminConfirmRefundModal'
import AddEquipmentPaymentModal from '../components/AddEquipmentPaymentModal'
import { getFacilityIcon } from '../utils/facilityImages'
import TicketQRCode from '../components/TicketQRCode'

function getGateForVenue(name = '') {
  const lower = (name || '').toLowerCase()
  if (lower.includes('badminton')) return 'GATE 1 (HALL B)'
  if (lower.includes('cricket')) return 'EAST PAVILION'
  if (lower.includes('turf') || lower.includes('foot')) return 'NORTH TURF'
  if (lower.includes('swim') || lower.includes('aqua')) return 'AQUATICS LOBBY'
  if (lower.includes('basket')) return 'COURT A (FIBA)'
  if (lower.includes('tennis')) return 'CLUBHOUSE'
  return 'MAIN GATE'
}

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
  onAddAdditionalEquipment,
}) {
  const [cancellingBooking, setCancellingBooking] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [userCancellingBooking, setUserCancellingBooking] = useState(null)
  const [userReschedulingBooking, setUserReschedulingBooking] = useState(null)
  const [adminReschedulingBooking, setAdminReschedulingBooking] = useState(null)
  const [confirmingRefundBooking, setConfirmingRefundBooking] = useState(null)
  const [equipmentModalBooking, setEquipmentModalBooking] = useState(null)

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
    if (booking?.isExpired !== undefined && typeof booking.isExpired === 'boolean') {
      return booking.isExpired
    }
    if (!booking?.bookingDate) return false
    const sessionDate = new Date(booking.bookingDate)
    if (isNaN(sessionDate.getTime())) return false
    const isMidnight = (booking.endTime || '').startsWith('24') || (booking.endTime || '').startsWith('1.')
    const hours = isMidnight ? 24 : Number((booking.endTime || booking.startTime || '00:00').slice(0, 2)) || 0
    const minutes = isMidnight ? 0 : Number((booking.endTime || booking.startTime || '00:00').slice(3, 5)) || 0
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
      const expired = isBookingExpired(booking)

      // Expired bookings rule:
      // When 'expired' tab is chosen, ONLY show expired bookings.
      // In all other tabs, expired bookings are excluded so they don't clutter the active list.
      if (selectedFilter === 'expired') {
        if (!expired) return false
      } else {
        if (expired) return false
      }

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
        case 'expired':
          return true
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

  // Show the last booking at first (newest ID / most recently booked at top)
  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort((a, b) => {
      const idA = Number(a.id) || 0
      const idB = Number(b.id) || 0
      if (idB !== idA) return idB - idA
      const dateA = new Date(a.bookingDate || 0).getTime()
      const dateB = new Date(b.bookingDate || 0).getTime()
      return dateB - dateA
    })
  }, [filteredBookings])

  // Pagination calculation
  const totalCount = sortedBookings.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const visibleBookings = sortedBookings.slice(startIndex, startIndex + pageSize)

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

  const expiredCount = useMemo(() => bookings.filter(isBookingExpired).length, [bookings])
  const activeBookings = useMemo(() => bookings.filter((b) => !isBookingExpired(b)), [bookings])
  const toRefundCount = useMemo(() => activeBookings.filter(isToRefundBooking).length, [activeBookings])
  const rescheduleCount = useMemo(
    () => activeBookings.filter((b) => b.isRescheduleRequested || b.status === 'RescheduleRequested').length,
    [activeBookings]
  )

  const filterTabs = useMemo(() => {
    const tabs = [
      { id: 'all', label: 'All Bookings', count: activeBookings.length },
      { id: 'confirmed', label: 'Confirmed', count: activeBookings.filter((b) => b.status === 'Confirmed').length },
      {
        id: 'pending',
        label: 'Pending',
        count: activeBookings.filter((b) => b.status === 'Pending' || !b.status).length,
      },
      {
        id: 'reschedule',
        label: 'Reschedule',
        count: rescheduleCount,
        badge: rescheduleCount > 0 ? rescheduleCount : null,
      },
      { id: 'cancelled', label: 'Cancelled', count: activeBookings.filter((b) => b.status === 'Cancelled').length },
    ]

    if (isAdmin && toRefundCount > 0) {
      tabs.push({
        id: 'to-refund',
        label: 'Needs Refund',
        icon: '💰',
        badge: toRefundCount,
        isAlert: true,
      })
    }

    tabs.push({
      id: 'expired',
      label: 'Expired',
      icon: '⏱️',
      count: expiredCount,
      badge: expiredCount > 0 ? expiredCount : null,
      isExpired: true,
    })

    return tabs
  }, [activeBookings, isAdmin, toRefundCount, rescheduleCount, expiredCount])

  const getFacilityIcon = (facilityName) => {
    const name = (facilityName || '').toLowerCase()
    if (name.includes('badminton')) return '🏸'
    if (name.includes('cricket')) return '🏏'
    if (name.includes('table')) return '🏓'
    if (name.includes('tennis')) return '🎾'
    if (name.includes('basket')) return '🏀'
    if (name.includes('swim') || name.includes('aqua')) return '🏊'
    if (name.includes('football') || name.includes('turf') || name.includes('soccer')) return '⚽'
    if (name.includes('gym') || name.includes('fitness')) return '🏋️'
    return '🏟️'
  }

  return (
    <section className="bookings-page-wrapper" id="bookings-page-panel">
      {/* 1. TEXT-DRIVEN HERO SECTION */}
      <section className="facilities-text-hero bookings-text-hero">
        <div className="facilities-hero-inner">
          <div className="bookings-hero-top-bar">
            <div className="facilities-hero-badge-pill">
              <span className="hub-pulse-dot" />
              <span className="hub-badge-text">OFFICIAL ARENA PASSES</span>
              <span className="hub-badge-sep">•</span>
              <span className="hub-badge-status">
                {activeBookings.length} {activeBookings.length === 1 ? 'Active Pass' : 'Active Passes'}
              </span>
            </div>

            <button
              className="primary-btn new-booking-cta-btn"
              type="button"
              id="new-booking-btn"
              onClick={onNewBooking}
            >
              ＋ New booking
            </button>
          </div>

          <h1 className="facilities-hero-main-title">
            {isAdmin ? (
              <>
                Arena Pass Registry <span className="hub-title-highlight">& Turnstile Operations</span>
              </>
            ) : (
              <>
                Your Arena Passes <span className="hub-title-highlight">& Match Reservations</span>
              </>
            )}
          </h1>

          <p className="facilities-hero-narrative">
            {isAdmin
              ? 'Manage championship facility reservations, audit turnstile digital passes, confirm payment slips, and verify member cancellation refunds in real-time.'
              : 'Access your verified tournament passes, turnstile entry QR codes, court schedules, and weather rain-check rebooking credentials in one unified passbook.'}
          </p>
        </div>
      </section>

      {/* 2. STREAMLINED & EFFECTIVE FILTER TOOLBAR */}
      <div className="bookings-filter-bar" id="bookings-filter-bar">
        {/* Top: Clean Segmented Status Tabs + Active Pass Counter */}
        <div className="filter-top-row">
          <div className="filter-chips-row" role="tablist" aria-label="Filter bookings by status">
            {filterTabs.map((tab) => {
              const isActive = selectedFilter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  id={`filter-btn-${tab.id}`}
                  className={`filter-chip ${isActive ? 'filter-chip-active' : ''} ${
                    tab.isAlert ? 'filter-chip-alert' : ''
                  } ${tab.isExpired ? 'filter-chip-expired' : ''}`}
                  onClick={() => handleFilterChange(tab.id)}
                >
                  {tab.icon && <span className="chip-icon">{tab.icon}</span>}
                  <span className="chip-label">{tab.label}</span>
                  {tab.badge !== undefined && tab.badge !== null ? (
                    <span className="chip-badge">{tab.badge}</span>
                  ) : tab.count !== undefined ? (
                    <span className="chip-count">({tab.count})</span>
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="filter-summary-text">
            Showing <strong>{filteredBookings.length}</strong> {selectedFilter === 'expired' ? 'expired' : 'active'} {filteredBookings.length === 1 ? 'pass' : 'passes'}
          </div>
        </div>

        {/* Bottom: Fast Search, Venue Dropdown, Date Selector, & Clear */}
        <div className="filter-inputs-row">
          {/* Prominent Search box */}
          <div className="filter-input-group search-group">
            <span className="input-group-label" aria-hidden="true">🔍</span>
            <input
              type="text"
              id="booking-search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search by facility, member, or pass ID..."
              className="filter-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="filter-clear-btn"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Turf / Facility selector */}
          <div className="filter-input-group turf-select-group">
            <span className="input-group-label" aria-hidden="true">🏟️ Venue</span>
            <select
              id="booking-turf-filter"
              value={selectedTurf}
              onChange={(e) => {
                setSelectedTurf(e.target.value)
                setPage(1)
              }}
              className="filter-select-input"
            >
              <option value="">All Venues</option>
              <option value="__outdoor__">Outdoor Turfs (Rain-Check Eligible)</option>
              {facilities.map((fac) => (
                <option key={fac.id || fac.name} value={fac.name}>
                  {fac.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="filter-input-group date-picker-group">
            <span className="input-group-label" aria-hidden="true">📅 Date</span>
            <input
              type="date"
              id="booking-date-filter"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setPage(1)
              }}
              className="filter-date-input"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="filter-clear-btn"
                title="Clear date"
              >
                ✕
              </button>
            )}
          </div>

          {/* Reset Filters CTA if any filter is active */}
          {(selectedDate || selectedTurf || searchQuery || selectedFilter !== 'all') && (
            <button
              type="button"
              className="filter-reset-btn"
              onClick={() => {
                setSelectedFilter('all')
                setSelectedDate('')
                setSelectedTurf('')
                setSearchQuery('')
                setPage(1)
              }}
              title="Reset all filters"
            >
              ✕ Reset
            </button>
          )}
        </div>
      </div>

      {/* BOOKING LIST CONTENT */}
      {isAdmin ? (
        <div className="admin-booking-list" id="admin-booking-list">
          {visibleBookings.length === 0 && (
            <p className="empty-state" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
              {selectedFilter === 'expired'
                ? 'No expired passes found.'
                : 'No bookings match the selected criteria.'}
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
                className={`admin-booking-row sports-arena-ticket ${
                  isRescheduleRequested && !isExpired ? 'ticket-reschedule' : ''
                } ${isExpired ? 'ticket-expired' : ''} ${isCancelled ? 'ticket-cancelled' : ''} ${
                  isConfirmed ? 'ticket-confirmed' : 'ticket-pending'
                }`}
                key={booking.id}
                id={`admin-booking-row-${booking.id}`}
              >
                {/* ================= LEFT: MAIN TICKET PASS ================= */}
                <div className="ticket-main-body">
                  {/* Holographic Security Strip */}
                  <div className="ticket-hologram-strip" aria-hidden="true">
                    <span className="hologram-shimmer" />
                    <span className="hologram-text">★ SMART SPORTS PASS • OFFICIAL ARENA ACCESS • ADMIN CONSOLE ★</span>
                  </div>

                  {/* Top Security & Serial Ribbon */}
                  <div className="ticket-top-ribbon">
                    <div className="ticket-brand-badge">
                      <span className="ticket-brand-icon">🎟️</span>
                      <span className="ticket-brand-text">OFFICIAL ARENA PASS</span>
                      <span className="ticket-brand-sep">•</span>
                      <span className="ticket-brand-sub">ADMIN CONSOLE</span>
                    </div>
                    <div className="ticket-serial-badge">
                      <span className="serial-label">PASS REF:</span>
                      <span className="serial-num">#BK-{String(booking.id).padStart(5, '0')}</span>
                    </div>
                  </div>

                  {/* Venue Title & Inked Status Stamp Row */}
                  <div className="ticket-venue-row">
                    <div className="ticket-venue-left">
                      <div className="ticket-sport-icon" aria-hidden="true">
                        {getFacilityIcon(booking.name)}
                      </div>
                      <div className="ticket-venue-texts">
                        <span className="ticket-court-category">CHAMPIONSHIP SPORTING COMPLEX</span>
                        <h3 className="ticket-venue-title">{booking.name}</h3>
                      </div>
                    </div>

                    <div className="ticket-stamp-col">
                      {/* Authentic Inked Rubber Stamp */}
                      <div
                        className={`ticket-ink-stamp ${
                          isExpired
                            ? 'stamp-expired'
                            : isRescheduleRequested
                            ? 'stamp-reschedule'
                            : isConfirmed
                            ? 'stamp-confirmed'
                            : isCancelled
                            ? 'stamp-cancelled'
                            : 'stamp-pending'
                        }`}
                        id={`admin-stamp-status-${booking.id}`}
                      >
                        <span className="stamp-inner-text">
                          {isExpired
                            ? 'EXPIRED'
                            : isRescheduleRequested
                            ? 'RESCHEDULE'
                            : isConfirmed
                            ? 'CONFIRMED PASS'
                            : isCancelled
                            ? 'CANCELLED'
                            : 'PENDING'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stadium Turnstile & Access Matrix */}
                  <div className="ticket-access-matrix">
                    <div className="matrix-pill">
                      <span className="m-label">GATE</span>
                      <span className="m-val">{getGateForVenue(booking.name)}</span>
                    </div>
                    <div className="matrix-pill">
                      <span className="m-label">ZONE</span>
                      <span className="m-val">{booking.name?.split(' ')[0] || 'COURT'} #01</span>
                    </div>
                    <div className="matrix-pill">
                      <span className="m-label">ACCESS</span>
                      <span className="m-val">PRIORITY PASS</span>
                    </div>
                    <div className="matrix-pill">
                      <span className="m-label">TURNSTILE</span>
                      <span className="m-val">AUTOMATED</span>
                    </div>
                  </div>

                  {/* Ticket 4-Column Meta Grid */}
                  <div className="ticket-meta-grid">
                    <div className="ticket-meta-cell">
                      <span className="cell-label">SESSION DATE & TIME</span>
                      <div className="cell-value date-value">
                        <span className="cell-icon">📅</span>
                        <strong>{booking.date}</strong>
                      </div>
                    </div>

                    <div className="ticket-meta-cell">
                      <span className="cell-label">RESERVED MEMBER</span>
                      <div className="cell-value">
                        <span className="cell-icon">👤</span>
                        <strong>{booking.customerName || 'Club Member'}</strong>
                      </div>
                    </div>

                    <div className="ticket-meta-cell">
                      <span className="cell-label">PAYMENT METHOD</span>
                      <div className="cell-value">
                        <span className="cell-icon">💳</span>
                        <span>
                          <strong>{booking.paymentMethod || 'Legacy'}</strong>
                          <span className={`ticket-pay-pill ${(booking.paymentStatus || booking.status || '').toLowerCase()}`}>
                            {booking.paymentStatus || (isConfirmed ? 'Approved' : 'Pending')}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="ticket-meta-cell fare-cell">
                      <span className="cell-label">TOTAL FARE</span>
                      <div className="cell-value fare-value">
                        <strong>
                          {booking.totalAmount ? `LKR ${Number(booking.totalAmount).toLocaleString()}` : '—'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Additional Equipment Payments / On-site Receipts */}
                  {booking.equipmentPayments && booking.equipmentPayments.length > 0 && (
                    <div className="ticket-equipment-receipt-card">
                      <div className="receipt-card-header">
                        <div className="receipt-header-left">
                          <span className="receipt-gear-icon">🎒</span>
                          <div>
                            <span className="receipt-title">ADDITIONAL GEAR & ACCESSORIES</span>
                            <span className="receipt-sub">Issued on-site at court reception ({booking.equipmentPayments.length} {booking.equipmentPayments.length === 1 ? 'item' : 'items'})</span>
                          </div>
                        </div>

                        <div className="receipt-header-right">
                          <span className="receipt-badge-status">PAID & SETTLED</span>
                          <strong className="receipt-total-val">
                            + LKR {booking.equipmentPayments.reduce((sum, ep) => sum + Number(ep.totalAmount || 0), 0).toLocaleString()}
                          </strong>
                        </div>
                      </div>

                      <div className="receipt-items-grid">
                        {booking.equipmentPayments.map((ep, epIdx) => (
                          <div key={ep.id || epIdx} className="receipt-item-row">
                            <div className="receipt-item-left">
                              <span className="receipt-check-dot">✓</span>
                              <div className="receipt-item-details">
                                <span className="receipt-item-name">
                                  <strong>{ep.equipmentName}</strong>
                                  <span className="receipt-item-qty">×{ep.quantity}</span>
                                </span>
                                <span className="receipt-item-formula">
                                  {ep.hours} {ep.hours === 1 ? 'hr' : 'hrs'} duration @ LKR {Number(ep.hourlyRate || 0).toLocaleString()} / hr
                                </span>
                              </div>
                            </div>

                            <div className="receipt-item-right">
                              <span className={`receipt-method-pill ${ep.paymentMethod === 'Cash in hand' ? 'cash-method' : 'card-method'}`}>
                                {ep.paymentMethod === 'Cash in hand' ? '💵 Cash in hand' : '💳 Card (machine)'}
                              </span>
                              <strong className="receipt-item-amount">
                                LKR {Number(ep.totalAmount || 0).toLocaleString()}
                              </strong>
                              {ep.collectedBy && (
                                <span className="receipt-collector-stamp">by {ep.collectedBy}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Special Notices & Admin Riders */}
                  {!isExpired && isRescheduleRequested && (
                    <div className="ticket-rider alert-rider">
                      <span className="rider-icon">🌧️</span>
                      <div className="rider-text">
                        <strong>Reschedule Request Sent to Member:</strong>
                        <p>{booking.rescheduleReason || 'Heavy rain / weather impact.'}</p>
                      </div>
                    </div>
                  )}

                  {isCancelled && (
                    <div className="ticket-rider cancel-rider">
                      <div className="rider-line">
                        <span className="rider-label">Cancellation Reason:</span>
                        <span>{booking.cancellationReason || 'No reason provided.'}</span>
                      </div>
                      {booking.refundStatus && (
                        <div className="rider-line refund-line">
                          <span className="rider-label">Refund Policy:</span>
                          <strong
                            className={`refund-status-highlight ${
                              isRefunded ? 'refund-green' : isFullRefund ? 'refund-emerald' : isHalfRefund ? 'refund-amber' : ''
                            }`}
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
                            <div className="refund-audit-text">
                              Verified by: <strong>{booking.refundConfirmedBy}</strong>{' '}
                              {booking.refundNotes ? `· Note: "${booking.refundNotes}"` : ''}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ================= VERTICAL PERFORATION LINE WITH ANCHORED NOTCHES ================= */}
                <div className="ticket-perforation" aria-hidden="true">
                  <div className="ticket-notch notch-top" />
                  <div className="perforation-dashed-line" />
                  <span className="perforation-cut-text">TEAR LINE</span>
                  <div className="ticket-notch notch-bottom" />
                </div>

                {/* ================= RIGHT: TEAR-OFF ENTRY STUB ================= */}
                <div className="ticket-entry-stub">
                  <div className="stub-header">
                    <span className="stub-title">GATE STUB</span>
                    <span className="stub-badge">ADMIT 1</span>
                  </div>

                  {/* Turnstile Scannable QR Code */}
                  <div className="stub-qr-box">
                    <div className="qr-frame">
                      <TicketQRCode
                        value={`SMARTSPORTS-PASS:#BK-${booking.id}|${booking.name}|${booking.date}`}
                        size={110}
                      />
                      <div className="qr-corner qr-corner-tl" />
                      <div className="qr-corner qr-corner-tr" />
                      <div className="qr-corner qr-corner-bl" />
                      <div className="qr-corner qr-corner-br" />
                    </div>
                    <div className="qr-pass-id-chip">
                      PASS ID: <strong>#BK-{String(booking.id).padStart(5, '0')}</strong>
                    </div>
                    <div className="qr-scan-label">
                      <span className="scan-icon">📲</span>
                      <span>SCAN FOR ENTRY</span>
                    </div>
                  </div>

                  {/* Admin Action Buttons */}
                  <div className="stub-actions">
                    {/* ADMIN REFUND VERIFICATION BUTTON: Only when cancelled with pending refund */}
                    {isToRefund && (
                      <button
                        className="primary-btn admin-confirm-refund-action-btn stub-btn"
                        type="button"
                        id={`admin-confirm-refund-btn-${booking.id}`}
                        onClick={() => setConfirmingRefundBooking(booking)}
                        title="Verify and release refund to member"
                      >
                        {isFullRefund ? '💰 Confirm Full (100%)' : '💰 Confirm Half (50%)'}
                      </button>
                    )}

                    {booking.review && (
                      <button className="secondary-btn stub-btn" type="button" onClick={() => onReview(booking)}>
                        ⭐ View review
                      </button>
                    )}

                    {booking.bankSlipFileName && (
                      <button className="secondary-btn stub-btn" type="button" onClick={() => onViewSlip(booking)}>
                        📄 View slip
                      </button>
                    )}

                    {booking.paymentMethod === 'BankTransfer' && !isConfirmed && !isCancelled && (
                      <button
                        className="primary-btn stub-btn"
                        type="button"
                        onClick={() => onStatusChange(booking, 'Confirmed')}
                      >
                        ✓ Verify transfer
                      </button>
                    )}

                    {/* Admin "Ask to Reschedule": Only if NOT cancelled and NOT expired */}
                    {!isCancelled && !isExpired && !isRescheduleRequested && (
                      <button
                        className="secondary-btn admin-ask-reschedule-btn stub-btn"
                        type="button"
                        id={`ask-reschedule-btn-${booking.id}`}
                        onClick={() => setAdminReschedulingBooking(booking)}
                        title="Ask user to reschedule for free (e.g. heavy rain / weather impact)"
                      >
                        🌧️ Ask reschedule
                      </button>
                    )}

                    {/* Admin & Manager ONLY: Add Additional Equipment */}
                    {isAdmin && !isCancelled && !isExpired && (
                      <button
                        className="primary-btn admin-add-equipment-btn stub-btn"
                        type="button"
                        id={`add-equipment-btn-${booking.id}`}
                        onClick={() => setEquipmentModalBooking(booking)}
                        title="Add additional equipment requested by player and collect cash in hand or card machine payment"
                      >
                        ➕ Add Equipment
                      </button>
                    )}

                    {/* Reschedule waiting indicator */}
                    {!isCancelled && !isExpired && isRescheduleRequested && (
                      <span className="reschedule-waiting-chip">
                        ⏳ Waiting member
                      </span>
                    )}

                    {/* Cancel button: Only if NOT cancelled and NOT expired */}
                    {!isCancelled && !isExpired && (
                      <button
                        className="secondary-btn danger-hover-btn stub-btn"
                        type="button"
                        id={`admin-cancel-btn-${booking.id}`}
                        onClick={() => handleOpenAdminCancelModal(booking)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
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
          emptyMessage={
            selectedFilter === 'expired'
              ? 'No expired passes found.'
              : 'No active bookings match the selected criteria.'
          }
        />
      )}

      {/* PAGINATION CONTROLS */}
      {totalCount > 0 && (
        <div className="bookings-pagination-bar" id="bookings-pagination-bar">
          <div className="pagination-summary">
            Showing <strong>{startIndex + 1}</strong> – <strong>{Math.min(startIndex + pageSize, totalCount)}</strong> of{' '}
            <strong>{totalCount}</strong> bookings
          </div>

          <div className="pagination-nav-group">
            <span className="pagination-page-size-label">Rows per page:</span>
            <select
              id="pagination-pagesize-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="pagination-pagesize-select"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>

            <button
              type="button"
              className="secondary-btn pagination-btn"
              id="pagination-prev-btn"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Prev
            </button>

            <div className="pagination-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .map((p, idx, arr) => {
                  const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1
                  return (
                    <span key={p} className="pagination-page-span">
                      {showEllipsisBefore && <span className="pagination-ellipsis">…</span>}
                      <button
                        type="button"
                        id={`pagination-page-${p}`}
                        className={`pagination-num-btn ${p === safePage ? 'active' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    </span>
                  )
                })}
            </div>

            <button
              type="button"
              className="secondary-btn pagination-btn"
              id="pagination-next-btn"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        </div>
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

      {/* Add Additional Equipment Modal (Admin & Manager Only) */}
      {equipmentModalBooking && (
        <AddEquipmentPaymentModal
          booking={equipmentModalBooking}
          facilities={facilities}
          onClose={() => setEquipmentModalBooking(null)}
          onSubmit={async (bookingId, paymentData) => {
            if (onAddAdditionalEquipment) {
              await onAddAdditionalEquipment(bookingId, paymentData)
            }
          }}
        />
      )}
    </section>
  )
}

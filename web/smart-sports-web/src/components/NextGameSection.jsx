import { getFacilityIcon } from '../utils/facilityImages'
import TicketQRCode from './TicketQRCode'

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

export default function NextGameSection({
  bookings = [],
  onBookings,
  onBooking,
  onReview,
  onCancel,
  onReschedule,
}) {
  // Helper to check if a booking's session has already ended/passed
  const isBookingExpired = (booking) => {
    if (booking.isExpired !== undefined && typeof booking.isExpired === 'boolean') {
      return booking.isExpired
    }
    if (!booking.bookingDate) return false
    const sessionDate = new Date(booking.bookingDate)
    if (isNaN(sessionDate.getTime())) return false
    const [hours, minutes] = (booking.endTime || booking.startTime || '00:00').split(':').map(Number)
    const sessionTime = new Date(
      sessionDate.getFullYear(),
      sessionDate.getMonth(),
      sessionDate.getDate(),
      hours || 0,
      minutes || 0
    )
    return sessionTime.getTime() <= Date.now()
  }

  // Find the next upcoming active booking (strictly not cancelled and not expired)
  const upcomingBookings = bookings.filter((b) => b.status !== 'Cancelled' && !isBookingExpired(b))
  const nextBooking = upcomingBookings.length > 0 ? upcomingBookings[0] : null

  return (
    <section className="next-game-section" id="next-game-panel">
      <div className="section-header-compact">
        <div>
          <span className="section-eyebrow">MATCH SCHEDULE</span>
          <h3 className="section-title">YOUR NEXT GAME</h3>
        </div>
        {bookings.length > 0 && onBookings && (
          <button
            type="button"
            className="view-all-text-btn"
            onClick={onBookings}
            id="next-game-all-bookings-btn"
          >
            <span>All Bookings ({bookings.length})</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {nextBooking ? (
        (() => {
          const isExpired = isBookingExpired(nextBooking)
          const isRescheduleRequested = Boolean(
            nextBooking.isRescheduleRequested || nextBooking.status === 'RescheduleRequested'
          )
          const isCancelled = nextBooking.status === 'Cancelled'
          const isConfirmed = nextBooking.status === 'Confirmed'

          return (
            <article
              className={`sports-arena-ticket next-game-arena-pass ${
                isRescheduleRequested && !isExpired ? 'ticket-reschedule' : ''
              } ${isExpired ? 'ticket-expired' : ''} ${isCancelled ? 'ticket-cancelled' : ''} ${
                isConfirmed ? 'ticket-confirmed' : 'ticket-pending'
              }`}
              id={`next-game-ticket-${nextBooking.id}`}
            >
              {/* ================= LEFT: MAIN TICKET PASS ================= */}
              <div className="ticket-main-body">
                {/* Holographic Security Foil Strip */}
                <div className="ticket-hologram-strip" aria-hidden="true">
                  <span className="hologram-shimmer" />
                  <span className="hologram-text">★ SMART SPORTS PASS • OFFICIAL ARENA ACCESS • NEXT MATCH ★</span>
                </div>

                {/* Top Security & Serial Ribbon */}
                <div className="ticket-top-ribbon">
                  <div className="ticket-brand-badge">
                    <span className="ticket-brand-icon">🎟️</span>
                    <span className="ticket-brand-text">OFFICIAL ARENA PASS</span>
                    <span className="ticket-brand-sep">•</span>
                    <span className="ticket-brand-sub">UPCOMING MATCH RESERVATION</span>
                  </div>
                  <div className="ticket-serial-badge">
                    <span className="serial-label">PASS REF:</span>
                    <span className="serial-num">#BK-{String(nextBooking.id).padStart(5, '0')}</span>
                  </div>
                </div>

                {/* Venue Title & Inked Status Stamp Row */}
                <div className="ticket-venue-row">
                  <div className="ticket-venue-left">
                    <div className="ticket-sport-icon" aria-hidden="true">
                      {getFacilityIcon(nextBooking.name)}
                    </div>
                    <div className="ticket-venue-texts">
                      <span className="ticket-court-category">CHAMPIONSHIP SPORTING COMPLEX</span>
                      <h3 className="ticket-venue-title">{nextBooking.name}</h3>
                    </div>
                  </div>

                  <div className="ticket-stamp-col">
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
                      id={`next-game-stamp-${nextBooking.id}`}
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
                    <span className="m-val">{getGateForVenue(nextBooking.name)}</span>
                  </div>
                  <div className="matrix-pill">
                    <span className="m-label">ZONE</span>
                    <span className="m-val">{nextBooking.name?.split(' ')[0] || 'COURT'} #01</span>
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

                {/* Ticket 4-Column Structured Meta Grid */}
                <div className="ticket-meta-grid">
                  <div className="ticket-meta-cell">
                    <span className="cell-label">SESSION DATE & TIME</span>
                    <div className="cell-value date-value">
                      <span className="cell-icon">📅</span>
                      <strong>{nextBooking.date} • {nextBooking.startTime || '18:00'}</strong>
                    </div>
                  </div>

                  <div className="ticket-meta-cell">
                    <span className="cell-label">PASS HOLDER</span>
                    <div className="cell-value">
                      <span className="cell-icon">👤</span>
                      <strong>{nextBooking.customerName || 'Club Member'}</strong>
                    </div>
                  </div>

                  <div className="ticket-meta-cell">
                    <span className="cell-label">PAYMENT METHOD</span>
                    <div className="cell-value">
                      <span className="cell-icon">💳</span>
                      <span>
                        <strong>{nextBooking.paymentMethod || 'Confirmed'}</strong>
                        <span className={`ticket-pay-pill ${(nextBooking.paymentStatus || nextBooking.status || '').toLowerCase()}`}>
                          {nextBooking.paymentStatus || (isConfirmed ? 'Paid' : 'Pending')}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="ticket-meta-cell fare-cell">
                    <span className="cell-label">TOTAL FARE</span>
                    <div className="cell-value fare-value">
                      <strong>
                        {nextBooking.totalAmount ? `LKR ${Number(nextBooking.totalAmount).toLocaleString()}` : '—'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Rain-Check Reschedule Notice */}
                {!isExpired && isRescheduleRequested && (
                  <div className="ticket-rider alert-rider" id={`next-game-reschedule-alert-${nextBooking.id}`}>
                    <span className="rider-icon">🌧️</span>
                    <div className="rider-text">
                      <strong>100% Free Rain-Check Reschedule Requested:</strong>
                      <p>{nextBooking.rescheduleReason || 'Adverse weather impact. Please pick a new date & time.'}</p>
                    </div>
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
                      value={`SMARTSPORTS-PASS:#BK-${nextBooking.id}|${nextBooking.name}|${nextBooking.date}`}
                      size={110}
                    />
                    <div className="qr-corner qr-corner-tl" />
                    <div className="qr-corner qr-corner-tr" />
                    <div className="qr-corner qr-corner-bl" />
                    <div className="qr-corner qr-corner-br" />
                  </div>
                  <div className="qr-pass-id-chip">
                    PASS ID: <strong>#BK-{String(nextBooking.id).padStart(5, '0')}</strong>
                  </div>
                  <div className="qr-scan-label">
                    <span className="scan-icon">📲</span>
                    <span>SCAN FOR ENTRY</span>
                  </div>
                </div>

                {/* Stub Action Buttons */}
                <div className="stub-actions">
                  <button
                    type="button"
                    className="primary-btn stub-btn"
                    id={`next-game-view-btn-${nextBooking.id}`}
                    onClick={onBookings}
                  >
                    View booking details
                  </button>
                  {isConfirmed && onReview && (
                    <button
                      type="button"
                      className="secondary-btn stub-btn"
                      id={`next-game-review-btn-${nextBooking.id}`}
                      onClick={() => onReview(nextBooking)}
                    >
                      {nextBooking.review ? 'View review' : '★ Leave a review'}
                    </button>
                  )}
                  {isRescheduleRequested && onReschedule && (
                    <button
                      type="button"
                      className="primary-btn stub-btn"
                      id={`next-game-reschedule-btn-${nextBooking.id}`}
                      onClick={() => onReschedule(nextBooking)}
                      style={{ background: '#f59e0b', borderColor: '#d97706' }}
                    >
                      🔄 Reschedule (Free)
                    </button>
                  )}
                </div>
              </div>
            </article>
          )
        })()
      ) : (
        <div className="empty-game-state-card">
          <div className="empty-icon-shield">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
          </div>
          <h4 className="empty-state-title">No games booked yet</h4>
          <p className="empty-state-desc">Your next match is waiting. Pick a court or field and lock in your session.</p>
          <button
            type="button"
            className="primary-btn empty-state-cta"
            onClick={onBooking}
            id="next-game-book-now-cta"
          >
            + Book a facility now
          </button>
        </div>
      )}
    </section>
  )
}

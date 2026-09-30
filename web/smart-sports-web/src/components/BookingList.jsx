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

export default function BookingList({ bookings = [], onReview, onCancel, onReschedule, emptyMessage }) {
  const isBookingExpired = (booking) => {
    if (booking?.isExpired !== undefined && typeof booking.isExpired === 'boolean') {
      return booking.isExpired
    }
    if (!booking?.bookingDate) return false
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

  return (
    <div className="booking-list" id="booking-list-container">
      {bookings.length === 0 && (
        <p className="empty-state" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
          {emptyMessage || 'No bookings match the selected criteria.'}
        </p>
      )}

      {bookings.map((booking) => {
        const isExpired = isBookingExpired(booking)
        const isRescheduleRequested = Boolean(
          booking.isRescheduleRequested || booking.status === 'RescheduleRequested'
        )
        const isCancelled = booking.status === 'Cancelled'
        const isConfirmed = booking.status === 'Confirmed'

        return (
          <article
            key={booking.id ?? `${booking.name}-${booking.date}`}
            className={`booking-item sports-arena-ticket ${
              isRescheduleRequested && !isExpired ? 'ticket-reschedule' : ''
            } ${isExpired ? 'ticket-expired' : ''} ${isCancelled ? 'ticket-cancelled' : ''} ${
              isConfirmed ? 'ticket-confirmed' : 'ticket-pending'
            }`}
            id={`booking-item-${booking.id}`}
          >
            {/* ================= LEFT: MAIN TICKET PASS ================= */}
            <div className="ticket-main-body">
              {/* Holographic Security Strip */}
              <div className="ticket-hologram-strip" aria-hidden="true">
                <span className="hologram-shimmer" />
                <span className="hologram-text">★ SMART SPORTS PASS • OFFICIAL ARENA ACCESS • AUTHENTICATED ★</span>
              </div>

              {/* Top Security & Serial Ribbon */}
              <div className="ticket-top-ribbon">
                <div className="ticket-brand-badge">
                  <span className="ticket-brand-icon">🎟️</span>
                  <span className="ticket-brand-text">OFFICIAL ARENA PASS</span>
                  <span className="ticket-brand-sep">•</span>
                  <span className="ticket-brand-sub">CLUB RESERVATION</span>
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
                    id={`stamp-status-${booking.id}`}
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
                  <span className="cell-label">PASS HOLDER</span>
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
                        {booking.paymentStatus || (isConfirmed ? 'Paid' : 'Pending')}
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

              {/* Special Notices & Riders */}
              {!isExpired && isRescheduleRequested && (
                <div className="ticket-rider alert-rider" id={`reschedule-alert-${booking.id}`}>
                  <span className="rider-icon">🌧️</span>
                  <div className="rider-text">
                    <strong>100% Free Rain-Check Reschedule Requested:</strong>
                    <p>{booking.rescheduleReason || 'Adverse weather impact. Please pick a new date & time.'}</p>
                  </div>
                </div>
              )}

              {isCancelled && (
                <div className="ticket-rider cancel-rider" id={`cancel-notice-${booking.id}`}>
                  <div className="rider-line">
                    <span className="rider-label">Cancellation Reason:</span>
                    <span>{booking.cancellationReason || 'Cancelled by member.'}</span>
                  </div>
                  {booking.refundStatus && (
                    <div className="rider-line refund-line">
                      <span className="rider-label">Refund Status:</span>
                      {booking.refundStatus === 'Refunded' ? (
                        <strong className="refund-tag-green">
                          ✅ Refunded ({booking.refundPercentage || 100}%) · LKR {Number(booking.refundAmount || 0).toLocaleString()}
                        </strong>
                      ) : (booking.refundStatus === 'To Refund' || Number(booking.refundAmount || 0) > 0) ? (
                        booking.refundPercentage === 100 ||
                        (Number(booking.refundAmount || 0) >= Number(booking.totalAmount || 0) &&
                          Number(booking.totalAmount || 0) > 0) ? (
                          <strong className="refund-tag-emerald">
                            ⏳ Full Refund (100% - Awaiting Admin Verification) · LKR {Number(booking.refundAmount || 0).toLocaleString()}
                          </strong>
                        ) : (
                          <strong className="refund-tag-amber">
                            ⏳ Half Refund (50% - Awaiting Admin Verification) · LKR {Number(booking.refundAmount || 0).toLocaleString()}
                          </strong>
                        )
                      ) : (
                        <strong className="refund-tag-muted">Non-refundable (0%)</strong>
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

              {/* Stub Action Buttons */}
              <div className="stub-actions">
                {isExpired ? (
                  <span className="stub-chip expired-chip" id={`status-expired-${booking.id}`}>
                    Session Expired
                  </span>
                ) : isRescheduleRequested ? (
                  <button
                    type="button"
                    className="primary-btn stub-btn"
                    id={`user-reschedule-action-btn-${booking.id}`}
                    onClick={() => onReschedule && onReschedule(booking)}
                  >
                    🔄 Reschedule (Free)
                  </button>
                ) : (
                  <>
                    {!isCancelled && onCancel && (
                      <button
                        type="button"
                        className="secondary-btn danger-hover-btn stub-btn"
                        id={`cancel-btn-${booking.id}`}
                        onClick={() => onCancel(booking)}
                      >
                        Cancel Booking
                      </button>
                    )}

                    {onReview && isConfirmed && (
                      <button
                        type="button"
                        className="secondary-btn stub-btn"
                        onClick={() => onReview(booking)}
                      >
                        ⭐ {booking.review ? 'View review' : 'Leave review'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

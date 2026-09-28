export default function BookingList({ bookings = [], onReview, onCancel, onReschedule }) {
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

  return (
    <div className="booking-list" id="booking-list-container">
      {bookings.length === 0 && (
        <p className="empty-state" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
          No bookings match the selected criteria.
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
          <div
            key={booking.id ?? `${booking.name}-${booking.date}`}
            className={`booking-item ${isRescheduleRequested && !isExpired ? 'reschedule-required-item' : ''} ${
              isExpired ? 'booking-expired-item' : ''
            }`}
            id={`booking-item-${booking.id}`}
          >
            <div className="booking-dot" style={isExpired ? { backgroundColor: '#94a3b8' } : {}} />

            <div className="booking-copy">
              <div className="booking-top-line" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <strong>{booking.name}</strong>
                {isExpired && (
                  <span className="expired-badge" id={`expired-badge-${booking.id}`}>
                    🕒 Expired Session
                  </span>
                )}
                {!isExpired && isRescheduleRequested && (
                  <span className="reschedule-flag-badge">
                    🌧️ Free Reschedule Offered
                  </span>
                )}
              </div>
              <span className="booking-date-text">📅 {booking.date}</span>

              {/* Management Reschedule Banner (Only if not expired!) */}
              {!isExpired && isRescheduleRequested && (
                <div className="user-reschedule-alert-box" id={`reschedule-alert-${booking.id}`}>
                  <span className="alert-icon">⚠️</span>
                  <div className="alert-text">
                    <strong>Reschedule Requested by Management:</strong>
                    <p>{booking.rescheduleReason || 'Heavy rain / Adverse weather impact. Please choose a new date & time.'}</p>
                    <small>100% Free Rain-Check Reschedule eligible. No extra payment required.</small>
                  </div>
                </div>
              )}

              {/* Cancellation & Refund Notice */}
              {isCancelled && (
                <div className="user-cancellation-notice" id={`cancel-notice-${booking.id}`}>
                  <div className="cancel-notice-row">
                    <span className="user-cancellation-label">Cancellation Reason:</span>
                    <span>{booking.cancellationReason || 'Cancelled by member.'}</span>
                  </div>
                  {booking.refundStatus && (
                    <div className="refund-summary-chip">
                      <span className="refund-label">Refund Status:</span>
                      {booking.refundStatus === 'Refunded' ? (
                        <strong className="refund-green" style={{ color: '#10b981' }}>
                          ✅ Refunded ({booking.refundPercentage || 100}%) · LKR {Number(booking.refundAmount || 0).toLocaleString()}
                        </strong>
                      ) : (booking.refundStatus === 'To Refund' || Number(booking.refundAmount || 0) > 0) ? (
                        (booking.refundPercentage === 100 || (Number(booking.refundAmount || 0) >= Number(booking.totalAmount || 0) && Number(booking.totalAmount || 0) > 0)) ? (
                          <strong className="refund-orange" style={{ color: '#059669', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #10b98130' }}>
                            ⏳ Full Refund (100% - Awaiting Admin Verification) · LKR {Number(booking.refundAmount || 0).toLocaleString()}
                          </strong>
                        ) : (
                          <strong className="refund-orange" style={{ color: '#d97706', backgroundColor: '#fffbeb', padding: '2px 8px', borderRadius: '4px', border: '1px solid #f59e0b30' }}>
                            ⏳ Half Refund (50% - Awaiting Admin Verification) · LKR {Number(booking.refundAmount || 0).toLocaleString()}
                          </strong>
                        )
                      ) : (
                        <strong className="refund-muted" style={{ color: '#64748b' }}>
                          Non-refundable (0%)
                        </strong>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="booking-item-actions">
              {/* When expired: NO cancel button and NO reschedule button! */}
              {isExpired ? (
                <span className="status expired-chip" id={`status-expired-${booking.id}`}>
                  Expired
                </span>
              ) : isRescheduleRequested ? (
                /* When reschedule is requested on active booking: show Reschedule button */
                <button
                  type="button"
                  className="primary-btn user-reschedule-btn"
                  id={`user-reschedule-action-btn-${booking.id}`}
                  onClick={() => onReschedule && onReschedule(booking)}
                >
                  🔄 Reschedule Booking (Free)
                </button>
              ) : (
                <>
                  <span
                    className={
                      isConfirmed
                        ? 'status confirmed'
                        : isCancelled
                        ? 'status cancelled'
                        : 'status pending'
                    }
                  >
                    {booking.status}
                  </span>

                  {/* Cancel Booking button ONLY for active non-expired, non-cancelled booking */}
                  {!isCancelled && onCancel && (
                    <button
                      type="button"
                      className="cancel-booking-link-btn"
                      id={`cancel-btn-${booking.id}`}
                      onClick={() => onCancel(booking)}
                    >
                      Cancel Booking
                    </button>
                  )}

                  {onReview && isConfirmed && (
                    <button
                      type="button"
                      className="review-link"
                      onClick={() => onReview(booking)}
                    >
                      {booking.review ? 'View review' : 'Leave a review'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

import { useState } from 'react'
import BookingList from '../components/BookingList'

export default function BookingsPage({ bookings, isAdmin, onNewBooking, onStatusChange, onViewSlip, onReview }) {
  const visibleBookings = bookings
  const [cancellingBooking, setCancellingBooking] = useState(null)
  const [cancelReason, setCancelReason] = useState('')

  const handleOpenCancelModal = (booking) => {
    setCancellingBooking(booking)
    setCancelReason('')
  }

  const handleConfirmCancel = () => {
    if (!cancellingBooking) return
    onStatusChange(cancellingBooking, 'Cancelled', cancelReason.trim())
    setCancellingBooking(null)
    setCancelReason('')
  }

  return (
    <section className="panel full-width-panel">
      <div className="panel-header">
        <h3>Upcoming bookings</h3>
        <button className="text-action" type="button" onClick={onNewBooking}>New booking</button>
      </div>

      {isAdmin ? (
        <div className="admin-booking-list">
          {visibleBookings.map((booking) => (
            <article className="admin-booking-row" key={booking.id}>
              <div>
                <strong>{booking.name}</strong>
                <span>{booking.date}</span>
                <small>Payment: {booking.paymentMethod || 'Legacy'} / {booking.paymentStatus || booking.status}</small>
                {booking.status === 'Cancelled' && (
                  <div className="admin-cancel-reason">
                    <strong>Cancellation reason:</strong> {booking.cancellationReason || 'No reason provided by management.'}
                  </div>
                )}
              </div>
              <div className="admin-booking-actions">
                <span className={booking.status === 'Confirmed' ? 'status confirmed' : booking.status === 'Cancelled' ? 'status cancelled' : 'status pending'}>
                  {booking.status}
                </span>
                {booking.review && (
                  <button className="secondary-btn" type="button" onClick={() => onReview(booking)}>View review</button>
                )}
                {!isAdmin && !booking.review && booking.status === 'Confirmed' && (
                  <button className="secondary-btn" type="button" onClick={() => onReview(booking)}>Leave a review</button>
                )}
                {booking.bankSlipFileName && (
                  <button className="secondary-btn" type="button" onClick={() => onViewSlip(booking)}>View slip</button>
                )}
                {booking.paymentMethod === 'BankTransfer' && booking.status !== 'Confirmed' && booking.status !== 'Cancelled' && (
                  <button className="primary-btn" type="button" onClick={() => onStatusChange(booking, 'Confirmed')}>Verify transfer</button>
                )}
                {booking.status !== 'Cancelled' && (
                  <button className="secondary-btn" type="button" onClick={() => handleOpenCancelModal(booking)}>
                    Cancel
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <BookingList bookings={visibleBookings} onReview={onReview} />
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
                    resize: 'vertical'
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
                  onClick={handleConfirmCancel}
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

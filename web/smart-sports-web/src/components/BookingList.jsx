export default function BookingList({ bookings, onReview }) {
  return (
    <div className="booking-list">
      {bookings.map((booking) => (
        <div key={booking.id ?? `${booking.name}-${booking.date}`} className="booking-item">
          <div className="booking-dot" />
          <div className="booking-copy">
            <strong>{booking.name}</strong>
            <span>{booking.date}</span>
            {booking.status === 'Cancelled' && (
              <div className="user-cancellation-notice">
                <span className="user-cancellation-label">Cancellation Reason:</span>
                {booking.cancellationReason || 'Cancelled by management.'}
              </div>
            )}
          </div>
          <div className="booking-item-actions">
            <span className={booking.status === 'Confirmed' ? 'status confirmed' : booking.status === 'Cancelled' ? 'status cancelled' : 'status pending'}>
              {booking.status}
            </span>
            {onReview && booking.status === 'Confirmed' && (
              <button type="button" className="review-link" onClick={() => onReview(booking)}>
                {booking.review ? 'View review' : 'Leave a review'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

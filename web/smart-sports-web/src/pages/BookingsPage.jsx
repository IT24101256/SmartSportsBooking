import BookingList from '../components/BookingList'

export default function BookingsPage({ bookings, isAdmin, onNewBooking, onStatusChange, onViewSlip, onReview }) {
  const visibleBookings = bookings

  return (
    <section className="panel full-width-panel">
      <div className="panel-header">
        <h3>Upcoming bookings</h3>
        <button className="text-action" type="button" onClick={onNewBooking}>New booking</button>
      </div>
      {isAdmin ? <div className="admin-booking-list">{visibleBookings.map((booking) => <article className="admin-booking-row" key={booking.id}>
        <div><strong>{booking.name}</strong><span>{booking.date}</span><small>Payment: {booking.paymentMethod || 'Legacy'} / {booking.paymentStatus || booking.status}</small></div>
        <div className="admin-booking-actions"><span className={booking.status === 'Confirmed' ? 'status confirmed' : 'status pending'}>{booking.status}</span>{booking.review && <button className="secondary-btn" type="button" onClick={() => onReview(booking)}>View review</button>}{!isAdmin && !booking.review && booking.status === 'Confirmed' && <button className="secondary-btn" type="button" onClick={() => onReview(booking)}>Leave a review</button>}{booking.bankSlipFileName && <button className="secondary-btn" type="button" onClick={() => onViewSlip(booking)}>View slip</button>}{booking.paymentMethod === 'BankTransfer' && booking.status !== 'Confirmed' && <button className="primary-btn" type="button" onClick={() => onStatusChange(booking, 'Confirmed')}>Verify transfer</button>}{booking.status !== 'Cancelled' && <button className="secondary-btn" type="button" onClick={() => onStatusChange(booking, 'Cancelled')}>Cancel</button>}</div>
      </article>)}</div> : <BookingList bookings={visibleBookings} onReview={onReview} />}
    </section>
  )
}

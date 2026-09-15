export default function BookingList({ bookings }) {
  return (
    <div className="booking-list">
      {bookings.map((booking) => (
        <div key={booking.id ?? `${booking.name}-${booking.date}`} className="booking-item">
          <div className="booking-dot" />
          <div className="booking-copy">
            <strong>{booking.name}</strong>
            <span>{booking.date}</span>
          </div>
          <span className={booking.status === 'Confirmed' ? 'status confirmed' : 'status pending'}>{booking.status}</span>
        </div>
      ))}
    </div>
  )
}

import BookingList from '../components/BookingList'

export default function BookingsPage({ bookings, onNewBooking }) {
  return (
    <section className="panel full-width-panel">
      <div className="panel-header">
        <h3>Upcoming bookings</h3>
        <button className="text-action" type="button" onClick={onNewBooking}>New booking</button>
      </div>
      <BookingList bookings={bookings} />
    </section>
  )
}

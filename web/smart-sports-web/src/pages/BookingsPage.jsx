import BookingList from '../components/BookingList'
import { useState } from 'react'

export default function BookingsPage({ bookings, onNewBooking }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('date')
  const visibleBookings = bookings
    .filter((booking) => booking.name.toLowerCase().includes(search.toLowerCase()))
    .filter((booking) => status === 'all' || booking.status.toLowerCase() === status)
    .sort((left, right) => sort === 'status' ? left.status.localeCompare(right.status) : left.date.localeCompare(right.date))

  return (
    <section className="panel full-width-panel">
      <div className="panel-header">
        <h3>Upcoming bookings</h3>
        <button className="text-action" type="button" onClick={onNewBooking}>New booking</button>
      </div>
      <div className="filter-row">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search bookings" aria-label="Search bookings" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter bookings by status">
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort bookings">
          <option value="date">Sort by date</option>
          <option value="status">Sort by status</option>
        </select>
      </div>
      <BookingList bookings={visibleBookings} />
    </section>
  )
}

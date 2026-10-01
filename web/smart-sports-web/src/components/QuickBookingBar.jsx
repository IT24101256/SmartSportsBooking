import { useState } from 'react'

const localDateString = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function QuickBookingBar({
  facilities = [],
  onBooking,
}) {
  const [selectedFacility, setSelectedFacility] = useState(() => facilities[0]?.name || 'Badminton Court')
  const [selectedDate, setSelectedDate] = useState(localDateString())
  const [selectedTime, setSelectedTime] = useState('18:00')
  const [hoursNeeded, setHoursNeeded] = useState('1')

  const timeOptions = [
    { value: '07:00', label: '07:00 AM (Morning)' },
    { value: '09:00', label: '09:00 AM' },
    { value: '11:00', label: '11:00 AM' },
    { value: '14:00', label: '02:00 PM' },
    { value: '16:00', label: '04:00 PM' },
    { value: '17:00', label: '05:00 PM (Peak)' },
    { value: '18:00', label: '06:00 PM (Peak)' },
    { value: '19:00', label: '07:00 PM (Floodlit)' },
    { value: '20:00', label: '08:00 PM (Evening)' },
    { value: '21:00', label: '09:00 PM (Night)' },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    onBooking({
      facility: selectedFacility || facilities[0]?.name || 'Badminton Court',
      date: selectedDate,
      time: selectedTime,
      hoursNeeded: Number(hoursNeeded) || 1,
    })
  }

  return (
    <section className="quick-booking-bar-wrapper">
      <div className="quick-booking-bar-container">
        <div className="quick-booking-header">
          <div className="quick-booking-title-group">
            <span className="quick-booking-eyebrow">INSTANT RESERVATION</span>
            <h3 className="quick-booking-title">BOOK YOUR NEXT GAME</h3>
          </div>
          <span className="quick-booking-hint">⚡ Live availability & instant slot confirmation</span>
        </div>

        <form className="quick-booking-form" onSubmit={handleSubmit}>
          {/* Field 1: Facility */}
          <div className="booking-bar-field">
            <label htmlFor="quick-facility-select">
              <span className="field-icon">🏟️</span>
              <span className="field-label-text">Facility</span>
            </label>
            <select
              id="quick-facility-select"
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="booking-bar-select"
            >
              {facilities.map((fac) => (
                <option key={fac.id || fac.name} value={fac.name}>
                  {fac.name} ({fac.type || 'Court'})
                </option>
              ))}
            </select>
          </div>

          <div className="bar-divider" />

          {/* Field 2: Date */}
          <div className="booking-bar-field">
            <label htmlFor="quick-date-select">
              <span className="field-icon">📅</span>
              <span className="field-label-text">Date</span>
            </label>
            <input
              id="quick-date-select"
              type="date"
              min={localDateString()}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="booking-bar-input"
            />
          </div>

          <div className="bar-divider" />

          {/* Field 3: Time */}
          <div className="booking-bar-field">
            <label htmlFor="quick-time-select">
              <span className="field-icon">⏰</span>
              <span className="field-label-text">Time</span>
            </label>
            <select
              id="quick-time-select"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="booking-bar-select"
            >
              {timeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bar-divider" />

          {/* Field 4: Duration / Hours */}
          <div className="booking-bar-field">
            <label htmlFor="quick-duration-select">
              <span className="field-icon">⏱️</span>
              <span className="field-label-text">Duration</span>
            </label>
            <select
              id="quick-duration-select"
              value={hoursNeeded}
              onChange={(e) => setHoursNeeded(e.target.value)}
              className="booking-bar-select"
            >
              <option value="1">1 Hour session</option>
              <option value="2">2 Hours session</option>
              <option value="3">3 Hours match</option>
              <option value="4">4 Hours half-day</option>
            </select>
          </div>

          {/* Submit CTA */}
          <div className="booking-bar-action">
            <button
              type="submit"
              className="quick-booking-cta-btn"
              id="quick-check-availability-btn"
            >
              <span>Check Availability</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

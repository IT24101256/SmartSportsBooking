import { useEffect, useState } from 'react'

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function UserRescheduleModal({ booking, token, apiBaseUrl, onClose, onConfirm }) {
  const [newDate, setNewDate] = useState(() => {
    const existingDate = String(booking.bookingDate || '').slice(0, 10)
    return existingDate && existingDate >= today() ? existingDate : today()
  })
  const [newStartTime, setNewStartTime] = useState('')
  const [availability, setAvailability] = useState(null)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const hoursNeeded = Number(booking.hoursNeeded || 1)
  const facilityId = booking.facilityId || booking.facility?.id

  useEffect(() => {
    if (!facilityId || !newDate) return
    let isMounted = true
    setLoadingAvailability(true)
    setErrorMsg('')
    setNewStartTime('')

    const loadSlots = async () => {
      try {
        const clientTime = new Date().toTimeString().slice(0, 8)
        const response = await fetch(
          `${apiBaseUrl}/bookings/availability?facilityId=${facilityId}&date=${newDate}&clientTime=${encodeURIComponent(clientTime)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        )
        if (response.ok && isMounted) {
          const data = await response.json()
          setAvailability(data)
        } else if (isMounted) {
          setErrorMsg('Failed to load available slots for this date.')
        }
      } catch {
        if (isMounted) setErrorMsg('Could not connect to availability service.')
      } finally {
        if (isMounted) setLoadingAvailability(false)
      }
    }

    loadSlots()

    return () => {
      isMounted = false
    }
  }, [apiBaseUrl, facilityId, newDate, token])

  const calculateEndTime = (start) => {
    if (!start) return ''
    const startHour = Number(start.slice(0, 2))
    const endHour = startHour + hoursNeeded
    if (endHour === 24) return '24:00 (Midnight)'
    if (endHour > 24) return '24:00'
    return `${String(endHour).padStart(2, '0')}:00`
  }

  const conflictSlot = (() => {
    if (!newStartTime || !availability?.slots) return null
    const startHour = Number(newStartTime.slice(0, 2))
    for (let i = 0; i < hoursNeeded; i++) {
      const h = startHour + i
      if (h >= 24) return 'Midnight (Facility closes at 24:00)'
      const timePrefix = `${String(h).padStart(2, '0')}:`
      const s = availability.slots.find((slot) => slot.startTime.startsWith(timePrefix))
      if (!s || String(s.status).toLowerCase() !== 'available') {
        return `${String(h).padStart(2, '0')}:00 (${s?.status || 'Unavailable'})`
      }
    }
    return null
  })()

  const selectedSlot = availability?.slots?.find(
    (slot) => slot.startTime.slice(0, 5) === newStartTime && String(slot.status).toLowerCase() === 'available'
  )

  const canSubmit = Boolean(newStartTime && selectedSlot && !conflictSlot && !submitting)

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setErrorMsg('')
    try {
      const startHour = Number(newStartTime.slice(0, 2))
      const endHour = startHour + hoursNeeded
      const apiEnd = endHour === 24 ? '24:00:00' : `${String(endHour).padStart(2, '0')}:00:00`
      await onConfirm(booking, newDate, `${newStartTime}:00`, apiEnd)
      onClose()
    } catch (err) {
      setErrorMsg(err?.message || 'Could not reschedule booking. Please try another slot.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="booking-modal-backdrop" onClick={onClose} id="user-reschedule-modal-backdrop">
      <div
        className="booking-modal reschedule-modal"
        onClick={(e) => e.stopPropagation()}
        id="user-reschedule-modal"
        style={{ maxWidth: '620px' }}
      >
        <div className="booking-modal-header">
          <div>
            <span className="chip" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
              🌧️ Free Weather / Management Rain-Check
            </span>
            <h3 style={{ marginTop: '4px' }}>Reschedule Booking #{booking.id}</h3>
          </div>
          <button type="button" className="close-btn" id="close-reschedule-modal-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleRescheduleSubmit} className="reschedule-modal-body">
          {/* Admin reason callout */}
          <div className="reschedule-admin-reason-banner">
            <div className="banner-icon">⚠️</div>
            <div className="banner-content">
              <strong>Management Reschedule Request:</strong>
              <p>{booking.rescheduleReason || 'Adverse weather / heavy rain impact or facility maintenance.'}</p>
              <small>You are entitled to a 100% free reschedule for this booking at no additional charge.</small>
            </div>
          </div>

          <div className="original-booking-card">
            <span>Current Facility & Time:</span>
            <strong>{booking.facilityName || booking.name}</strong>
            <p>Originally booked for: <b>{booking.date}</b> ({hoursNeeded} hr{hoursNeeded > 1 ? 's' : ''})</p>
          </div>

          {errorMsg && <div className="auth-feedback" style={{ margin: '8px 0' }}>{errorMsg}</div>}

          <div className="reschedule-date-selector">
            <label>
              <span style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Select New Date</span>
              <input
                type="date"
                id="reschedule-new-date"
                min={today()}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem',
                }}
              />
            </label>
          </div>

          <div className="availability-panel" style={{ marginTop: '14px' }}>
            <div className="availability-heading">
              <strong>Choose an Available Time Slot</strong>
              <span>{loadingAvailability ? 'Checking slots...' : 'Green = Available'}</span>
            </div>

            <div className="availability-slots" style={{ maxHeight: '180px', overflowY: 'auto', marginTop: '10px' }}>
              {availability?.slots?.map((slot) => {
                const timeKey = slot.startTime.slice(0, 5)
                const isSelected = timeKey === newStartTime
                const startH = Number(timeKey.slice(0, 2))
                let hasConsecutive = String(slot.status).toLowerCase() === 'available' && startH + hoursNeeded <= 24
                if (hasConsecutive && hoursNeeded > 1) {
                  for (let i = 1; i < hoursNeeded; i++) {
                    const nextH = startH + i
                    const nextPrefix = `${String(nextH).padStart(2, '0')}:`
                    const nextSlot = availability.slots.find((s) => s.startTime.startsWith(nextPrefix))
                    if (!nextSlot || String(nextSlot.status).toLowerCase() !== 'available') {
                      hasConsecutive = false
                      break
                    }
                  }
                }
                const isAvailable = hasConsecutive
                return (
                  <button
                    key={slot.startTime}
                    type="button"
                    disabled={!isAvailable}
                    className={`availability-slot ${slot.status.toLowerCase()} ${isSelected ? 'selected' : ''}`}
                    onClick={() => setNewStartTime(timeKey)}
                    style={
                      isSelected
                        ? { borderColor: '#10b981', backgroundColor: '#ecfdf5', outline: '2px solid #10b981' }
                        : {}
                    }
                  >
                    <strong>{timeKey}</strong>
                    <small>{!hasConsecutive && String(slot.status).toLowerCase() === 'available' ? 'Partial' : slot.status}</small>
                  </button>
                )
              })}
            </div>
          </div>

          {conflictSlot && (
            <div className="duration-conflict-warning" style={{ marginTop: '12px' }}>
              <span className="warning-icon">⚠️</span>
              <div className="warning-content">
                <strong>Schedule Conflict</strong>
                <p>
                  Rescheduling for {hoursNeeded} hr(s) cannot start at {newStartTime} because the slot at <strong>{conflictSlot}</strong> is unavailable. Please pick a start time with {hoursNeeded} consecutive hours available.
                </p>
              </div>
            </div>
          )}

          {newStartTime && (
            <div className="reschedule-summary-box">
              <div className="reschedule-summary-header">
                <strong>New Selected Reservation:</strong>
                <span>
                  {newDate} • {newStartTime} to {calculateEndTime(newStartTime)}
                </span>
              </div>
              <div className="calc-divider" style={{ margin: '8px 0' }} />
              <div className="price-row">
                <span>Standard Booking Fee:</span>
                <span>LKR {Number(booking.totalAmount || 0).toLocaleString()}</span>
              </div>
              <div className="price-row" style={{ color: '#10b981', fontWeight: 600 }}>
                <span>Weather Rain-Check Voucher Discount:</span>
                <span>-100% (FREE)</span>
              </div>
              <div className="price-row total-free-row">
                <span>Total Due Now:</span>
                <strong style={{ color: '#059669', fontSize: '1.2rem' }}>LKR 0 (FREE RESCHEDULE)</strong>
              </div>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button type="button" className="secondary-btn" id="cancel-reschedule-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              id="confirm-free-reschedule-btn"
              disabled={!canSubmit}
              style={{
                backgroundColor: canSubmit ? '#10b981' : undefined,
                borderColor: canSubmit ? '#10b981' : undefined,
              }}
            >
              {submitting ? 'Confirming Reschedule...' : 'Confirm Free Reschedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

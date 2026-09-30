import { useEffect, useState } from 'react'

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const initialPayment = { method: 'BankTransfer', cardNumber: '', expiry: '', cvv: '', slip: null }
const nicPattern = /^(\d{9}[vVxX]|\d{12})$/

export default function BookingWizard({
  facilities = [],
  initialFacilityName,
  initialDate,
  initialStartTime,
  initialHoursNeeded,
  customer,
  skipCustomerDetails,
  token,
  apiBaseUrl,
  isAdmin,
  onClose,
  onCreated,
}) {
  const [step, setStep] = useState(1)
  const [facilityName, setFacilityName] = useState(() => {
    if (initialFacilityName && facilities.some((item) => item.name === initialFacilityName)) {
      return initialFacilityName
    }
    return facilities[0]?.name || ''
  })
  const [date, setDate] = useState(initialDate && initialDate >= today() ? initialDate : today())
  const [startTime, setStartTime] = useState(initialStartTime || '')
  const [hoursNeeded, setHoursNeeded] = useState(initialHoursNeeded || 1)
  const [availability, setAvailability] = useState(null)
  const [details, setDetails] = useState({
    name: customer?.name || '',
    nic: customer?.nicNumber || '',
    contact: customer?.contactNumber || '',
  })
  const [payment, setPayment] = useState(initialPayment)
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (facilities.length > 0 && !facilities.some((item) => item.name === facilityName)) {
      setFacilityName(facilities[0].name)
    }
  }, [facilities, facilityName])

  const facility = facilities.find((item) => item.name === facilityName) || facilities[0]
  const selectedSlot = availability?.slots?.find(
    (slot) => slot.startTime.slice(0, 5) === startTime && String(slot.status).toLowerCase() === 'available'
  )
  const requiredHours = Number(hoursNeeded)
  const total = Number(facility?.hourlyRate || 0) * Number(hoursNeeded)
  const endTime = startTime
    ? Number(startTime.slice(0, 2)) + Number(hoursNeeded) === 24
      ? '1.00:00'
      : `${String(Number(startTime.slice(0, 2)) + Number(hoursNeeded)).padStart(2, '0')}:00`
    : ''

  useEffect(() => {
    const selectedFacility = facilities.find((item) => item.name === facilityName)
    if (!selectedFacility || !date) return
    const loadAvailability = async () => {
      setNotice('')
      if (!initialStartTime) setStartTime('')
      setAvailability(null)
      const clientTime = new Date().toTimeString().slice(0, 8)
      const response = await fetch(
        `${apiBaseUrl}/bookings/availability?facilityId=${selectedFacility.id}&date=${date}&clientTime=${encodeURIComponent(clientTime)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      )
      if (!response.ok) {
        setNotice('Availability could not be loaded.')
        return
      }
      setAvailability(await response.json())
    }
    loadAvailability().catch(() => setNotice('The API is unavailable. Start the backend and try again.'))
  }, [apiBaseUrl, date, facilities, facilityName, token, initialStartTime])

  const canContinueReserve =
    Boolean(selectedSlot) &&
    Number(hoursNeeded) >= 1 &&
    Number.isInteger(Number(hoursNeeded)) &&
    Number(startTime.slice(0, 2)) + Number(hoursNeeded) <= 24

  const submitBooking = async (event) => {
    event.preventDefault()
    setNotice('')
    if (!startTime || !Number.isInteger(requiredHours) || requiredHours < 1) {
      setNotice('Please choose a valid booking time and duration.')
      return
    }
    if (!details.name.trim() || !nicPattern.test(details.nic.trim())) {
      setNotice('NIC must be 12 digits or 9 digits followed by V or X.')
      return
    }
    if (!/^\d{10}$/.test(details.contact.trim())) {
      setNotice('Contact number must contain exactly 10 digits.')
      return
    }
    if (payment.method === 'BankTransfer' && !payment.slip) {
      setNotice('Please upload the bank transfer slip.')
      return
    }
    const [expiryMonth, expiryYear] = payment.expiry.split('/').map(Number)
    const currentYear = new Date().getFullYear()
    if (
      payment.method === 'Card' &&
      (!/^\d{16}$/.test(payment.cardNumber) ||
        !Number.isInteger(expiryMonth) ||
        expiryMonth < 1 ||
        expiryMonth > 12 ||
        !Number.isInteger(expiryYear) ||
        expiryYear < currentYear ||
        expiryYear > currentYear + 10 ||
        (expiryYear === currentYear && expiryMonth < new Date().getMonth() + 1) ||
        !/^\d{3}$/.test(payment.cvv))
    ) {
      setNotice(`Card number must be 16 digits, expiry must be MM/${currentYear}-${currentYear + 10}, and CVV must be 3 digits.`)
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('facilityId', String(facility.id))
      formData.append('bookingDate', `${date}T00:00:00.000Z`)
      formData.append('startTime', `${startTime}:00`)
      formData.append('endTime', `${endTime}:00`)
      formData.append('hoursNeeded', String(hoursNeeded))
      formData.append('customerName', details.name.trim())
      formData.append('nicNumber', details.nic.trim())
      formData.append('contactNumber', details.contact.trim())
      formData.append('paymentMethod', payment.method)
      if (payment.method === 'Card') {
        formData.append('cardNumber', payment.cardNumber)
        formData.append('expiryMonth', String(expiryMonth))
        formData.append('expiryYear', String(expiryYear))
        formData.append('cvv', payment.cvv)
        formData.append('cardLastFour', payment.cardNumber.slice(-4))
      }
      if (payment.slip) formData.append('bankSlip', payment.slip)

      const response = await fetch(`${apiBaseUrl}/bookings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!response.ok) {
        const error = await response.text()
        setNotice(error || 'Booking could not be saved.')
        return
      }
      onCreated(await response.json())
      setStep(4)
    } catch {
      setNotice('The API is unavailable. Start the backend and try again.')
    } finally {
      setSaving(false)
    }
  }

  const stepLabels = [
    { num: 1, title: 'Venue & Slot', icon: '🏟️' },
    { num: 2, title: 'Player Details', icon: '👤' },
    { num: 3, title: 'Payment', icon: '💳' },
    { num: 4, title: 'Confirmed', icon: '✅' },
  ]

  return (
    <div className="booking-modal-backdrop" onClick={onClose}>
      <div
        className="booking-modal booking-wizard-modal awesome-modal"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header with Visual Sports Badge and Clean Close */}
        <div className="awesome-modal-header">
          <div className="modal-title-group">
            <div className="modal-eyebrow-pill">
              <span className="live-dot" />
              <span>LIVE COURT RESERVATION</span>
            </div>
            <h3 className="modal-headline">
              {step === 1
                ? 'Select Venue & Time'
                : step === 2
                ? 'Player Information'
                : step === 3
                ? 'Choose Payment Method'
                : 'Booking Confirmed!'}
            </h3>
          </div>
          <button
            type="button"
            className="awesome-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Visual Stepper Tracker */}
        <div className="wizard-stepper-row" aria-label="Booking steps">
          {stepLabels.map((s) => {
            const isDone = s.num < step
            const isCurrent = s.num === step
            return (
              <div
                key={s.num}
                className={`wizard-step-pill ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}`}
              >
                <div className="step-circle">
                  {isDone ? '✓' : s.num}
                </div>
                <span className="step-title">{s.title}</span>
              </div>
            )
          })}
        </div>

        {notice && <div className="auth-feedback awesome-feedback">{notice}</div>}

        {/* STEP 1: Venue, Date, Slots & Duration */}
        {step === 1 && (
          <div className="booking-form awesome-step-form">
            {/* Row 1: Facility Select & Date Picker side-by-side */}
            <div className="form-fields-grid-2">
              <label className="awesome-field">
                <span className="field-label-text">
                  <span className="field-emoji">🏟️</span> Sport Facility
                </span>
                <select
                  value={facilityName}
                  onChange={(event) => setFacilityName(event.target.value)}
                  className="awesome-input-select"
                >
                  {facilities.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name} ({item.type || 'Court'})
                    </option>
                  ))}
                </select>
              </label>

              <label className="awesome-field">
                <span className="field-label-text">
                  <span className="field-emoji">📅</span> Match Date
                </span>
                <input
                  type="date"
                  min={today()}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="awesome-input-date"
                />
              </label>
            </div>

            {/* Availability Slots Grid */}
            <div className="awesome-availability-card">
              <div className="availability-card-header">
                <div className="avail-title-box">
                  <strong>Available Time Slots</strong>
                  <small>Pick your match start time</small>
                </div>
                <span className="hourly-rate-pill">
                  {availability
                    ? `LKR ${Number(availability.hourlyRate).toLocaleString()} / hr`
                    : 'Loading rate...'}
                </span>
              </div>

              <div className="awesome-slots-grid">
                {availability?.slots ? (
                  availability.slots.map((slot) => {
                    const timeKey = slot.startTime.slice(0, 5)
                    const isAvailable = slot.status === 'Available'
                    const isSelected = timeKey === startTime

                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={!isAvailable}
                        className={`awesome-slot-btn ${
                          isSelected
                            ? 'selected'
                            : isAvailable
                            ? 'available'
                            : 'booked'
                        }`}
                        onClick={() => setStartTime(timeKey)}
                      >
                        <span className="slot-time-text">{timeKey}</span>
                        <span className="slot-status-text">
                          {isSelected ? '✓ Selected' : slot.status}
                        </span>
                      </button>
                    )
                  })
                ) : (
                  <div className="loading-slots-notice">
                    Checking court availability...
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Selected Slot & Duration & Price calculation */}
            <div className="form-fields-grid-2">
              <label className="awesome-field">
                <span className="field-label-text">
                  <span className="field-emoji">⏰</span> Start Time
                </span>
                <input
                  type="time"
                  step="3600"
                  min="08:00"
                  max="23:00"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="awesome-input-time"
                  placeholder="Select slot above"
                />
              </label>

              <label className="awesome-field">
                <span className="field-label-text">
                  <span className="field-emoji">⏱️</span> Duration (Hours)
                </span>
                <input
                  type="number"
                  min="1"
                  max="16"
                  step="1"
                  value={hoursNeeded}
                  onChange={(event) => setHoursNeeded(event.target.value)}
                  className="awesome-input-duration"
                />
              </label>
            </div>

            {/* Total Strip */}
            <div className="awesome-total-strip">
              <div className="total-calculation-desc">
                <span>Reservation Total:</span>
                <small>
                  {hoursNeeded} hr{Number(hoursNeeded) > 1 ? 's' : ''} × LKR{' '}
                  {Number(facility?.hourlyRate || 0).toLocaleString()}
                  {startTime ? ` (${startTime} – ${endTime})` : ''}
                </small>
              </div>
              <strong className="total-highlight-amount">
                LKR {total.toLocaleString()}
              </strong>
            </div>

            {/* Modal Actions */}
            <div className="awesome-modal-actions">
              <button
                type="button"
                className="secondary-btn modal-cancel-btn"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn modal-submit-btn"
                disabled={!canContinueReserve}
                onClick={() => setStep(skipCustomerDetails ? 3 : 2)}
              >
                Continue to Details →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Player Details */}
        {!skipCustomerDetails && step === 2 && (
          <div className="booking-form awesome-step-form">
            <div className="awesome-info-banner">
              <span>👤 Member Details</span>
              <small>Reservation updates and check-in pass will be issued to these details.</small>
            </div>

            <label className="awesome-field">
              <span className="field-label-text">Full Name</span>
              <input
                value={details.name}
                onChange={(event) =>
                  setDetails({ ...details, name: event.target.value })
                }
                placeholder="e.g. John Doe"
                required
              />
            </label>

            <div className="form-fields-grid-2">
              <label className="awesome-field">
                <span className="field-label-text">NIC Number</span>
                <input
                  maxLength="12"
                  value={details.nic}
                  onChange={(event) =>
                    setDetails({
                      ...details,
                      nic: event.target.value.replace(/[^0-9vVxX]/g, '').slice(0, 12),
                    })
                  }
                  placeholder="e.g. 199512345678 or 951234567V"
                  pattern="^(\d{9}[vVxX]|\d{12})$"
                  required
                />
              </label>

              <label className="awesome-field">
                <span className="field-label-text">Contact Mobile Number</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength="10"
                  value={details.contact}
                  onChange={(event) =>
                    setDetails({
                      ...details,
                      contact: event.target.value.replace(/\D/g, '').slice(0, 10),
                    })
                  }
                  placeholder="0771234567"
                  pattern="\d{10}"
                  required
                />
              </label>
            </div>

            <div className="awesome-modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
              <button
                type="button"
                className="primary-btn modal-submit-btn"
                onClick={() => setStep(3)}
              >
                Continue to Payment →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Payment */}
        {step === 3 && (
          <form className="booking-form awesome-step-form" onSubmit={submitBooking}>
            {/* Payment Method Cards */}
            <div className="awesome-payment-cards-grid">
              <button
                type="button"
                className={`awesome-pay-card ${
                  payment.method === 'BankTransfer' ? 'active' : ''
                }`}
                onClick={() => setPayment({ ...payment, method: 'BankTransfer' })}
              >
                <span className="pay-card-icon">🏛️</span>
                <span className="pay-card-title">Bank Transfer</span>
                <small className="pay-card-sub">Upload deposit slip</small>
              </button>

              <button
                type="button"
                className={`awesome-pay-card ${
                  payment.method === 'Card' ? 'active' : ''
                }`}
                onClick={() => setPayment({ ...payment, method: 'Card' })}
              >
                <span className="pay-card-icon">💳</span>
                <span className="pay-card-title">Credit / Debit Card</span>
                <small className="pay-card-sub">Instant confirmation</small>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  className={`awesome-pay-card ${
                    payment.method === 'Cash' ? 'active' : ''
                  }`}
                  onClick={() => setPayment({ ...payment, method: 'Cash' })}
                >
                  <span className="pay-card-icon">💵</span>
                  <span className="pay-card-title">Cash in Hand</span>
                  <small className="pay-card-sub">Admin cash desk</small>
                </button>
              )}
            </div>

            {/* Bank Transfer Details */}
            {payment.method === 'BankTransfer' && (
              <>
                <div className="awesome-bank-card">
                  <div className="bank-card-topline">
                    <span className="bank-club-tag">SMARTSPORTS VIP ACCOUNTS</span>
                    <span className="bank-status-dot">● Active</span>
                  </div>
                  <div className="bank-acc-list">
                    <div className="bank-acc-row">
                      <strong>People's Bank (Colombo):</strong>
                      <span className="acc-number">1234 5678 9012</span>
                    </div>
                    <div className="bank-acc-row">
                      <strong>Commercial Bank (Colombo):</strong>
                      <span className="acc-number">9876 5432 1098</span>
                    </div>
                  </div>
                </div>

                <label className="awesome-field file-upload-field">
                  <span className="field-label-text">
                    📤 Upload Transfer / Deposit Slip
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(event) =>
                      setPayment({
                        ...payment,
                        slip: event.target.files?.[0] || null,
                      })
                    }
                    required
                    className="awesome-file-input"
                  />
                </label>
              </>
            )}

            {payment.method === 'Cash' && (
              <div className="awesome-bank-card">
                <strong>Cash Payment at Front Desk</strong>
                <p>
                  This booking will be marked as paid via the manager desk cash terminal.
                </p>
              </div>
            )}

            {/* Card Inputs */}
            {payment.method === 'Card' && (
              <div className="awesome-card-inputs-box">
                <label className="awesome-field">
                  <span className="field-label-text">Card Number</span>
                  <input
                    inputMode="numeric"
                    maxLength="16"
                    value={payment.cardNumber}
                    onChange={(event) =>
                      setPayment({
                        ...payment,
                        cardNumber: event.target.value
                          .replace(/\D/g, '')
                          .slice(0, 16),
                      })
                    }
                    placeholder="4111 2222 3333 4444"
                    required
                  />
                </label>

                <div className="form-fields-grid-2">
                  <label className="awesome-field">
                    <span className="field-label-text">Expiry Date (MM/YYYY)</span>
                    <div className="expiry-pickers-row">
                      <select
                        value={payment.expiry.split('/')[0] || ''}
                        onChange={(event) =>
                          setPayment({
                            ...payment,
                            expiry: `${event.target.value}/${
                              payment.expiry.split('/')[1] || ''
                            }`,
                          })
                        }
                        required
                        className="awesome-input-select"
                      >
                        <option value="">Month</option>
                        {Array.from({ length: 12 }, (_, index) => (
                          <option
                            key={index + 1}
                            value={String(index + 1).padStart(2, '0')}
                          >
                            {String(index + 1).padStart(2, '0')}
                          </option>
                        ))}
                      </select>

                      <select
                        value={payment.expiry.split('/')[1] || ''}
                        onChange={(event) =>
                          setPayment({
                            ...payment,
                            expiry: `${
                              payment.expiry.split('/')[0] || ''
                            }/${event.target.value}`,
                          })
                        }
                        required
                        className="awesome-input-select"
                      >
                        <option value="">Year</option>
                        {Array.from({ length: 11 }, (_, index) => new Date().getFullYear() + index).map(
                          (year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </label>

                  <label className="awesome-field">
                    <span className="field-label-text">Security Code (CVV)</span>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength="3"
                      value={payment.cvv}
                      onChange={(event) =>
                        setPayment({
                          ...payment,
                          cvv: event.target.value.replace(/\D/g, '').slice(0, 3),
                        })
                      }
                      placeholder="•••"
                      required
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="awesome-total-strip">
              <div className="total-calculation-desc">
                <span>Payable Amount:</span>
                <small>Secure SSL Encrypted Checkout</small>
              </div>
              <strong className="total-highlight-amount">
                LKR {total.toLocaleString()}
              </strong>
            </div>

            <div className="awesome-modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setStep(skipCustomerDetails ? 1 : 2)}
              >
                ← Back
              </button>
              <button
                type="submit"
                className="primary-btn modal-submit-btn"
                disabled={saving}
              >
                {saving ? 'Processing...' : `Pay LKR ${total.toLocaleString()}`}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: Confirmation Ticket */}
        {step === 4 && (
          <div className="awesome-confirmation-ticket">
            <div className="ticket-success-badge">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>

            {payment.method === 'BankTransfer' ? (
              <>
                <h4 className="confirmation-title">Booking Submitted for Review</h4>
                <p className="confirmation-desc">
                  Your bank deposit slip has been submitted to club management. Your slot is held and will be verified shortly.
                </p>
              </>
            ) : (
              <>
                <h4 className="confirmation-title">Match Confirmed!</h4>
                <p className="confirmation-desc">
                  Your court reservation is locked in. Automated arena lighting and locker access will activate at session start.
                </p>
              </>
            )}

            <div className="confirmed-ticket-details">
              <div className="ticket-detail-item">
                <span className="item-label">VENUE</span>
                <strong>{facility.name}</strong>
              </div>
              <div className="ticket-detail-item">
                <span className="item-label">DATE & TIME</span>
                <strong>{date} • {startTime} to {endTime}</strong>
              </div>
              <div className="ticket-detail-item">
                <span className="item-label">TOTAL PAID</span>
                <strong className="item-amount">LKR {total.toLocaleString()}</strong>
              </div>
            </div>

            <button
              type="button"
              className="primary-btn modal-submit-btn full-btn"
              onClick={onClose}
            >
              Done & Return to Club
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

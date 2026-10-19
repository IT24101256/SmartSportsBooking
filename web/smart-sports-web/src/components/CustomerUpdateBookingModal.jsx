import { useState, useEffect, useMemo } from 'react'

const getTodayString = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CustomerUpdateBookingModal({
  booking,
  facilities = [],
  token,
  apiBaseUrl,
  onClose,
  onSuccess,
}) {
  // Determine initial facility
  const initialFacilityId =
    booking.facilityId ||
    facilities.find((f) => f.name === booking.facilityName || f.name === booking.facility?.name)?.id ||
    facilities[0]?.id ||
    1

  const [facilityId, setFacilityId] = useState(initialFacilityId)
  const [date, setDate] = useState(() => {
    const raw = String(booking.bookingDate || '').slice(0, 10)
    return raw && raw >= getTodayString() ? raw : getTodayString()
  })
  const [hoursNeeded, setHoursNeeded] = useState(Number(booking.hoursNeeded || 1))
  const [startTime, setStartTime] = useState(() => {
    const raw = String(booking.startTime || '08:00')
    return raw.slice(0, 5)
  })

  // Payment state for Situation 1 (Upgraded booking where newTotal > earlierPaid)
  const hasSavedCard = Boolean(booking.cardLastFour || booking.paymentMethod === 'Card')
  const savedCardLastFour = booking.cardLastFour || '4242'

  const [paymentMethod, setPaymentMethod] = useState(booking.paymentMethod === 'BankTransfer' ? 'BankTransfer' : 'Card')
  const [cardOption, setCardOption] = useState(hasSavedCard ? 'saved' : 'new') // 'saved' | 'new'

  const [newCardNumber, setNewCardNumber] = useState('')
  const [newCardExpiry, setNewCardExpiry] = useState('')
  const [newCardCvv, setNewCardCvv] = useState('')
  const [bankSlip, setBankSlip] = useState(null)

  // Status & loading
  const [availability, setAvailability] = useState(null)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Selected facility object
  const currentFacility = useMemo(() => {
    return facilities.find((f) => f.id === Number(facilityId)) || booking.facility || { hourlyRate: 0, name: 'Facility' }
  }, [facilities, facilityId, booking.facility])

  // Earlier net paid amount
  const earlierPaid = useMemo(() => {
    const gross = Number(booking.totalAmount || 0)
    const refunded = booking.refundStatus === 'Refunded' ? Number(booking.refundAmount || 0) : 0
    return Math.max(0, gross - refunded)
  }, [booking])

  // New total amount
  const newTotal = useMemo(() => {
    const rate = Number(currentFacility?.hourlyRate || 0)
    return rate * Number(hoursNeeded)
  }, [currentFacility, hoursNeeded])

  // Price difference
  const priceDiff = newTotal - earlierPaid

  // Load availability when facility or date changes
  useEffect(() => {
    if (!facilityId || !date) return
    let isMounted = true
    setLoadingAvailability(true)
    setErrorMessage('')

    const fetchSlots = async () => {
      try {
        const clientTime = new Date().toTimeString().slice(0, 8)
        const url = `${apiBaseUrl}/bookings/availability?facilityId=${facilityId}&date=${date}&clientTime=${encodeURIComponent(
          clientTime
        )}&excludeBookingId=${booking.id}`
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok && isMounted) {
          const data = await res.json()
          setAvailability(data)
        } else if (isMounted) {
          setErrorMessage('Could not load slots for this facility and date.')
        }
      } catch {
        if (isMounted) setErrorMessage('Failed to connect to slot availability service.')
      } finally {
        if (isMounted) setLoadingAvailability(false)
      }
    }

    fetchSlots()
    return () => {
      isMounted = false
    }
  }, [apiBaseUrl, facilityId, date, token, booking.id])

  // Calculate end time
  const calculatedEndTime = useMemo(() => {
    if (!startTime) return ''
    const startH = parseInt(startTime.slice(0, 2), 10) || 8
    const endH = startH + Number(hoursNeeded)
    if (endH >= 24) return '24:00 (Midnight)'
    return `${String(endH).padStart(2, '0')}:00`
  }, [startTime, hoursNeeded])

  // Check for conflicts across requested duration
  const conflictDetails = useMemo(() => {
    if (!startTime || !availability?.slots) return null
    const startH = parseInt(startTime.slice(0, 2), 10) || 8
    const needed = Number(hoursNeeded)
    if (startH + needed > 24) {
      return 'Session must conclude by 24:00 (midnight).'
    }

    for (let i = 0; i < needed; i++) {
      const h = startH + i
      const prefix = `${String(h).padStart(2, '0')}:`
      const slot = availability.slots.find((s) => s.startTime.startsWith(prefix))
      if (!slot) {
        return `Slot ${String(h).padStart(2, '0')}:00 is outside operating hours.`
      }
      if (String(slot.status).toLowerCase() !== 'available') {
        return `Slot ${String(h).padStart(2, '0')}:00 is ${slot.status.toLowerCase()}.`
      }
    }
    return null
  }, [startTime, availability, hoursNeeded])

  const isCardValid =
    cardOption === 'saved'
      ? Boolean(savedCardLastFour)
      : Boolean(
          newCardNumber.replace(/\s+/g, '').length >= 12 &&
          newCardExpiry.trim().length >= 4 &&
          newCardCvv.trim().length >= 3
        )

  const canSubmit = Boolean(
    facilityId &&
      date &&
      startTime &&
      hoursNeeded >= 1 &&
      !conflictDetails &&
      !loadingAvailability &&
      !submitting &&
      (priceDiff <= 0 ||
        (paymentMethod === 'Card' && isCardValid) ||
        (paymentMethod === 'BankTransfer' && bankSlip))
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setErrorMessage('')

    try {
      const formData = new FormData()
      formData.append('facilityId', String(facilityId))
      formData.append('bookingDate', `${date}T00:00:00.000Z`)
      formData.append('startTime', `${startTime}:00`)
      formData.append('hoursNeeded', String(hoursNeeded))

      if (priceDiff > 0) {
        formData.append('paymentMethod', paymentMethod)
        if (paymentMethod === 'Card') {
          if (cardOption === 'saved') {
            formData.append('cardLastFour', savedCardLastFour)
          } else {
            const cleanNumber = newCardNumber.replace(/\s+/g, '')
            formData.append('cardNumber', cleanNumber)
            formData.append('cardLastFour', cleanNumber.slice(-4))
            const [m, y] = newCardExpiry.split('/')
            formData.append('expiryMonth', m ? String(parseInt(m, 10)) : '12')
            formData.append('expiryYear', y ? (y.length === 2 ? `20${y}` : y) : '2028')
            formData.append('cvv', newCardCvv.trim())
          }
        } else if (paymentMethod === 'BankTransfer' && bankSlip) {
          formData.append('bankSlip', bankSlip)
        }
      }

      const res = await fetch(`${apiBaseUrl}/bookings/${booking.id}/customer-update`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text()
        setErrorMessage(text || 'Failed to update booking. Please review your selections.')
        setSubmitting(false)
        return
      }

      const updated = await res.json()
      onSuccess?.(updated)
      onClose()
    } catch {
      setErrorMessage('Network or server error while updating your booking.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="booking-modal-backdrop"
      onClick={onClose}
      id="user-update-booking-backdrop"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="booking-modal update-booking-modal"
        onClick={(e) => e.stopPropagation()}
        id="user-update-booking-modal"
        style={{ maxWidth: '640px' }}
      >
        <div className="booking-modal-header">
          <div>
            <span
              className="chip"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#059669',
                fontWeight: 700,
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'inline-block',
                }}
              />
              PASS REF: #BK-{String(booking.id).padStart(5, '0')}
            </span>
            <h3 style={{ marginTop: '6px', fontSize: '1.45rem', fontWeight: 800 }}>✏️ Update Booking Details</h3>
          </div>
          <button
            type="button"
            className="close-btn"
            id="close-update-booking-modal-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="booking-form update-booking-form">
          {errorMessage && (
            <div
              className="modal-alert-error"
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '0.9rem',
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Section: Facility Name */}
          <div className="update-field-group">
            <label htmlFor="update-facility-select" className="update-field-label">
              <span>🏟️ Sports Facility</span>
            </label>
            <select
              id="update-facility-select"
              value={facilityId}
              onChange={(e) => setFacilityId(Number(e.target.value))}
              className="update-input-control"
            >
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name} ({fac.sportCategory || fac.courtType || 'Sport'}) — LKR {Number(fac.hourlyRate || 0).toLocaleString()}/hr
                </option>
              ))}
            </select>
          </div>

          {/* Section: Date & Duration Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="update-field-group">
              <label htmlFor="update-booking-date" className="update-field-label">
                <span>📅 Booking Date</span>
              </label>
              <input
                type="date"
                id="update-booking-date"
                min={getTodayString()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="update-input-control"
                required
              />
            </div>

            <div className="update-field-group">
              <label htmlFor="update-duration-select" className="update-field-label">
                <span>⏱️ Duration (Hours)</span>
              </label>
              <select
                id="update-duration-select"
                value={hoursNeeded}
                onChange={(e) => setHoursNeeded(Number(e.target.value))}
                className="update-input-control"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                  <option key={h} value={h}>
                    {h} {h === 1 ? 'Hour' : 'Hours'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: Start Time Slots */}
          <div className="update-field-group">
            <div className="update-field-label">
              <span>⏰ Start Time Slot (Whole Hours)</span>
              {loadingAvailability && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Checking slots...</span>}
            </div>

            <div className="update-slots-grid">
              {availability?.slots?.map((slot) => {
                const slotTime = slot.startTime.slice(0, 5)
                const isAvail = String(slot.status).toLowerCase() === 'available'
                const isSelected = startTime === slotTime

                return (
                  <button
                    key={slot.startTime}
                    type="button"
                    disabled={!isAvail}
                    onClick={() => setStartTime(slotTime)}
                    className={`update-slot-btn ${isSelected ? 'selected' : ''}`}
                    title={isAvail ? 'Click to select' : slot.status}
                  >
                    <span>{slotTime}</span>
                  </button>
                )
              })}
            </div>

            {startTime && (
              <div style={{ marginTop: '4px', fontSize: '0.85rem', color: '#475569' }}>
                Selected Session: <strong>{startTime} – {calculatedEndTime}</strong> ({hoursNeeded} {hoursNeeded === 1 ? 'hour' : 'hours'})
              </div>
            )}

            {conflictDetails && (
              <div style={{ marginTop: '4px', fontSize: '0.82rem', color: '#dc2626' }}>
                ⚠️ {conflictDetails}
              </div>
            )}
          </div>

          {/* ================= PAYMENT BREAKDOWN & DEDUCTION CARD ================= */}
          <div className={`update-pricing-card ${priceDiff > 0 ? 'upgrade' : priceDiff < 0 ? 'downgrade' : 'equal'}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: 750, fontSize: '0.95rem' }}>
                💰 Price Difference & Settlement
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: '12px',
                  background: priceDiff > 0 ? '#dcfce7' : priceDiff < 0 ? '#dbeafe' : '#f1f5f9',
                  color: priceDiff > 0 ? '#15803d' : priceDiff < 0 ? '#1d4ed8' : '#64748b',
                }}
              >
                {priceDiff > 0 ? 'SITUATION 1: UPGRADE' : priceDiff < 0 ? 'SITUATION 2: DOWNGRADE' : 'NO PRICE CHANGE'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', opacity: 0.85, marginBottom: '6px' }}>
              <span>Earlier Paid Amount:</span>
              <strong>LKR {earlierPaid.toLocaleString()}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', opacity: 0.85, marginBottom: '6px' }}>
              <span>New Booking Rate ({currentFacility?.name} × {hoursNeeded} hrs):</span>
              <strong>LKR {newTotal.toLocaleString()}</strong>
            </div>

            <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.1)', margin: '8px 0' }} />

            {/* Situation 1: Upgrade (New Amount > Earlier Paid) */}
            {priceDiff > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#16a34a', marginBottom: '4px' }}>
                  <span>Deducted Earlier Paid Amount:</span>
                  <span>- LKR {earlierPaid.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, marginTop: '4px' }}>
                  <span>Remaining Amount to Pay:</span>
                  <span style={{ color: '#059669' }}>LKR {priceDiff.toLocaleString()}</span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#047857' }}>
                  ✓ Your previous payment of LKR {earlierPaid.toLocaleString()} has been credited. You only pay the remaining balance of LKR {priceDiff.toLocaleString()}.
                </p>
              </div>
            )}

            {/* Situation 2: Downgrade (New Amount < Earlier Paid) */}
            {priceDiff < 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800 }}>
                  <span>Amount to Refund:</span>
                  <span style={{ color: '#2563eb' }}>LKR {Math.abs(priceDiff).toLocaleString()}</span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: '#1e40af', lineHeight: 1.4 }}>
                  ℹ️ An overpayment refund of <strong>LKR {Math.abs(priceDiff).toLocaleString()}</strong> will be queued for Admin verification. The admin will have a button displaying this refund amount, which will directly deduct from club revenue once confirmed. No payment is required right now.
                </p>
              </div>
            )}

            {/* Situation 3: Equal (New Amount == Earlier Paid) */}
            {priceDiff === 0 && (
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', opacity: 0.85 }}>
                ✓ The cost remains the same. Your schedule will be updated with no extra charge or refund needed.
              </p>
            )}
          </div>

          {/* ================= PAYMENT METHOD (ONLY FOR SITUATION 1: UPGRADE) ================= */}
          {priceDiff > 0 && (
            <div className="update-remaining-pay-card">
              <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700 }}>
                💳 Pay Remaining Balance: LKR {priceDiff.toLocaleString()}
              </h4>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Card')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: paymentMethod === 'Card' ? '2px solid #059669' : '1px solid #cbd5e1',
                    background: paymentMethod === 'Card' ? '#f0fdf4' : 'transparent',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  💳 Credit / Debit Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('BankTransfer')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: paymentMethod === 'BankTransfer' ? '2px solid #059669' : '1px solid #cbd5e1',
                    background: paymentMethod === 'BankTransfer' ? '#f0fdf4' : 'transparent',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  🏦 Bank Transfer
                </button>
              </div>

              {paymentMethod === 'Card' ? (
                <div>
                  {/* Saved Card vs New Card Toggle */}
                  {hasSavedCard && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <button
                        type="button"
                        id="select-saved-card-btn"
                        onClick={() => setCardOption('saved')}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: cardOption === 'saved' ? '2px solid #059669' : '1px solid #cbd5e1',
                          background: cardOption === 'saved' ? 'rgba(5, 150, 105, 0.1)' : 'transparent',
                          color: cardOption === 'saved' ? '#065f46' : 'inherit',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                        }}
                      >
                        💳 Saved Card (•••• {savedCardLastFour})
                      </button>
                      <button
                        type="button"
                        id="select-new-card-btn"
                        onClick={() => setCardOption('new')}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: cardOption === 'new' ? '2px solid #059669' : '1px solid #cbd5e1',
                          background: cardOption === 'new' ? 'rgba(5, 150, 105, 0.1)' : 'transparent',
                          color: cardOption === 'new' ? '#065f46' : 'inherit',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                        }}
                      >
                        ➕ Pay with New Card
                      </button>
                    </div>
                  )}

                  {cardOption === 'saved' ? (
                    <div
                      className="saved-card-display"
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: '#f0fdf4',
                        border: '1.5px solid #86efac',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.3rem' }}>💳</span>
                          <div>
                            <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                              Primary Card •••• {savedCardLastFour}
                            </strong>
                            <div style={{ fontSize: '0.74rem', color: '#047857' }}>Card on file from original booking</div>
                          </div>
                        </div>
                        <span
                          style={{
                            background: '#dcfce7',
                            color: '#15803d',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            border: '1px solid #bbf7d0',
                          }}
                        >
                          AUTHORIZED
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#166534', lineHeight: 1.4 }}>
                        🔒 <strong>No CVV required.</strong> Your previously verified card ending in <strong>{savedCardLastFour}</strong> will be charged LKR {priceDiff.toLocaleString()} for the remaining balance.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            Card Number
                          </label>
                          <input
                            type="text"
                            placeholder="1234 5678 9012 3456"
                            value={newCardNumber}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 16)
                              const formatted = val.match(/.{1,4}/g)?.join(' ') || val
                              setNewCardNumber(formatted)
                            }}
                            className="update-input-control"
                            style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                            required
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            Exp (MM/YY)
                          </label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            maxLength={5}
                            value={newCardExpiry}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, '').slice(0, 4)
                              if (val.length >= 3) {
                                val = `${val.slice(0, 2)}/${val.slice(2)}`
                              }
                              setNewCardExpiry(val)
                            }}
                            className="update-input-control"
                            style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                            required
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            CVV
                          </label>
                          <input
                            type="password"
                            placeholder="•••"
                            maxLength={4}
                            value={newCardCvv}
                            onChange={(e) => setNewCardCvv(e.target.value.replace(/\D/g, ''))}
                            className="update-input-control"
                            style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                            required
                          />
                        </div>
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                        🔒 256-bit SSL encrypted. Enter your 16-digit card number, expiry, and 3-digit CVV.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Upload Bank Transfer Slip (JPG, PNG, PDF up to 4MB)
                  </label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => setBankSlip(e.target.files?.[0] || null)}
                    style={{ fontSize: '0.85rem', marginTop: '4px' }}
                    required
                  />
                  <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Transfer LKR {priceDiff.toLocaleString()} to MySpot Arena Acct #1002948271 (Commercial Bank).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              id="confirm-update-booking-submit-btn"
              disabled={!canSubmit}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                opacity: canSubmit ? 1 : 0.6,
              }}
            >
              {submitting
                ? 'Updating...'
                : priceDiff > 0
                ? `Pay LKR ${priceDiff.toLocaleString()} & Update`
                : priceDiff < 0
                ? 'Update Booking & Request Refund'
                : 'Confirm Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

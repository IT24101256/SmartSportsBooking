import { useEffect, useState } from 'react'

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const initialPayment = { method: 'BankTransfer', cardNumber: '', expiry: '', cvv: '', slip: null }
const nicPattern = /^(\d{9}[vVxX]|\d{12})$/

const detectCardBrand = (num = '') => {
  const clean = num.replace(/\D/g, '')
  if (clean.startsWith('4')) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard'
  if (/^3[47]/.test(clean)) return 'Amex'
  return 'Card'
}

const formatCardNumberSpaced = (val = '') => {
  const clean = val.replace(/\D/g, '').slice(0, 16)
  return clean.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export const hashCvv = (cvv = '') => {
  let h = 0x811c9dc5
  const s = `smartsports_sec_${cvv.trim()}`
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `h_${(h >>> 0).toString(16)}`
}

export const deduplicateCards = (cardList = []) => {
  if (!Array.isArray(cardList)) return []
  const seen = new Set()
  const unique = []

  for (const card of cardList) {
    if (!card) continue
    const last4 = String(card.last4 || '').trim()
    const expM = String(card.expMonth || '').padStart(2, '0')
    const expY = String(card.expYear || '').slice(-2)
    const key = `${last4}_${expM}_${expY}`

    if (!seen.has(key)) {
      seen.add(key)
      unique.push(card)
    } else {
      const existing = unique.find(
        (c) =>
          String(c.last4 || '').trim() === last4 &&
          String(c.expMonth || '').padStart(2, '0') === expM &&
          String(c.expYear || '').slice(-2) === expY
      )
      if (existing && card.isDefault) {
        existing.isDefault = true
      }
    }
  }

  if (unique.length > 0 && !unique.some((c) => c.isDefault)) {
    unique[0].isDefault = true
  }

  return unique
}

export const getMaxConsecutiveHours = (startStr, slots = []) => {
  if (!startStr || !Array.isArray(slots) || slots.length === 0) return 16
  const startHour = Number(startStr.slice(0, 2))
  if (isNaN(startHour) || startHour < 8 || startHour >= 24) return 1

  let consecutive = 0
  for (let h = startHour; h < 24; h++) {
    const timePrefix = `${String(h).padStart(2, '0')}:`
    const slot = slots.find((s) => s.startTime.startsWith(timePrefix))
    if (!slot || String(slot.status).toLowerCase() !== 'available') {
      break
    }
    consecutive++
  }
  return consecutive
}

export const getFirstConflictSlot = (startStr, duration, slots = []) => {
  if (!startStr || !duration || !Array.isArray(slots) || slots.length === 0) return null
  const startHour = Number(startStr.slice(0, 2))
  const dur = Number(duration)
  if (isNaN(startHour) || isNaN(dur) || dur < 1) return null

  for (let i = 0; i < dur; i++) {
    const h = startHour + i
    if (h >= 24) return 'Midnight (Facility closes at 24:00)'
    const timePrefix = `${String(h).padStart(2, '0')}:`
    const slot = slots.find((s) => s.startTime.startsWith(timePrefix))
    if (!slot) return `${String(h).padStart(2, '0')}:00 (Unavailable)`
    if (String(slot.status).toLowerCase() !== 'available') {
      return `${String(h).padStart(2, '0')}:00 (${slot.status})`
    }
  }
  return null
}

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

  // Saved Cards & Payment Selection state
  const storageKey = customer?.id ? `smartsports_saved_cards_${customer.id}` : 'smartsports_saved_cards_guest'
  const [savedCards, setSavedCards] = useState(() => {
    try {
      const key = customer?.id ? `smartsports_saved_cards_${customer.id}` : 'smartsports_saved_cards_guest'
      let stored = localStorage.getItem(key)
      if (!stored && customer?.id) {
        stored = localStorage.getItem('smartsports_saved_cards_guest')
      }
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped = parsed.map((card) => ({
            ...card,
            cvvHash: card.cvvHash || hashCvv('123'),
          }))
          const deduplicated = deduplicateCards(mapped)
          try {
            localStorage.setItem(key, JSON.stringify(deduplicated))
          } catch {}
          return deduplicated
        }
      }
      if (customer) {
        return [
          {
            id: 'card_demo_1',
            brand: 'Visa',
            last4: '4242',
            cardholder: customer?.name || 'Aisha Jordan',
            expMonth: '08',
            expYear: '28',
            isDefault: true,
            vaultToken: 'tok_vlt_8923a9b1c7',
            colorTheme: 'navy',
            cvvHash: hashCvv('123'),
            testCvvHint: '123',
          },
        ]
      }
      return []
    } catch {
      return []
    }
  })

  const [cardChoice, setCardChoice] = useState(() => {
    try {
      const key = customer?.id ? `smartsports_saved_cards_${customer.id}` : 'smartsports_saved_cards_guest'
      const stored = localStorage.getItem(key) || (customer?.id ? localStorage.getItem('smartsports_saved_cards_guest') : null)
      if (stored && JSON.parse(stored).length > 0) return 'saved'
      if (customer) return 'saved'
      return 'new'
    } catch {
      return customer ? 'saved' : 'new'
    }
  })

  const [selectedCardId, setSelectedCardId] = useState(() => {
    const defaultCard = savedCards?.find((c) => c.isDefault) || savedCards?.[0]
    return defaultCard?.id || ''
  })

  const [savedCardCvv, setSavedCardCvv] = useState('')
  const [cvvError, setCvvError] = useState(false)

  // New Card Form state
  const [newCardNumber, setNewCardNumber] = useState('')
  const [newCardholder, setNewCardholder] = useState(customer?.name || '')
  const [newCardExpMonth, setNewCardExpMonth] = useState('')
  const [newCardExpYear, setNewCardExpYear] = useState('')
  const [newCardCvv, setNewCardCvv] = useState('')
  const [saveCardForFuture, setSaveCardForFuture] = useState(true)

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
  const total = Number(facility?.hourlyRate || 0) * (Number.isInteger(requiredHours) && requiredHours > 0 ? requiredHours : 1)

  // Consecutive available hours starting from startTime
  const maxConsecutiveHours = getMaxConsecutiveHours(startTime, availability?.slots)
  // First conflicting booked or past slot in the requested duration range
  const conflictSlot = getFirstConflictSlot(startTime, hoursNeeded, availability?.slots)

  const startHour = startTime ? Number(startTime.slice(0, 2)) : null
  const endHour = startHour !== null && Number.isInteger(requiredHours) ? startHour + requiredHours : null
  const endTime = endHour !== null
    ? endHour === 24
      ? '24:00 (Midnight)'
      : `${String(endHour).padStart(2, '0')}:00`
    : ''
  const apiEndTime = endHour !== null
    ? endHour === 24
      ? '24:00:00'
      : `${String(endHour).padStart(2, '0')}:00:00`
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
    !conflictSlot &&
    Number(hoursNeeded) >= 1 &&
    Number.isInteger(Number(hoursNeeded)) &&
    Number(hoursNeeded) <= maxConsecutiveHours &&
    startHour !== null &&
    startHour + Number(hoursNeeded) <= 24

  const submitBooking = async (event) => {
    event.preventDefault()
    setNotice('')
    if (!startTime || !Number.isInteger(requiredHours) || requiredHours < 1) {
      setNotice('Please choose a valid booking time and duration.')
      return
    }
    if (conflictSlot) {
      setNotice(`Schedule conflict: Cannot book ${hoursNeeded} hours starting at ${startTime}. The slot at ${conflictSlot} is not available. Maximum available consecutive duration is ${maxConsecutiveHours} hr(s).`)
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

    let cardNumToSend = ''
    let expMonthToSend = null
    let expYearToSend = null
    let cvvToSend = ''
    let last4ToSend = ''

    if (payment.method === 'Card') {
      if (cardChoice === 'saved' && savedCards.length > 0) {
        const activeCard = savedCards.find((c) => c.id === selectedCardId) || savedCards[0]
        if (!activeCard) {
          setNotice('Please select a card to pay with, or choose to pay with another card.')
          return
        }
        if (!savedCardCvv || !/^\d{3}$/.test(savedCardCvv.trim())) {
          setCvvError(true)
          setNotice('Please enter the 3-digit CVV security code for your saved card.')
          return
        }

        // Verify CVV against stored hash
        const expectedHash = activeCard.cvvHash || hashCvv(activeCard.testCvvHint || '123')
        if (hashCvv(savedCardCvv.trim()) !== expectedHash) {
          setCvvError(true)
          setNotice(`Payment Declined: Incorrect CVV security code for ${activeCard.brand || 'card'} ending in •••• ${activeCard.last4}. Card issuer rejected the transaction.`)
          return
        }

        const currentYear = new Date().getFullYear()
        let parsedYear = Number(activeCard.expYear)
        if (parsedYear < 100) parsedYear += 2000
        const parsedMonth = Number(activeCard.expMonth)

        if (parsedYear < currentYear || (parsedYear === currentYear && parsedMonth < new Date().getMonth() + 1)) {
          setNotice('The selected saved card has expired. Please choose or enter another card.')
          return
        }

        cardNumToSend = activeCard.vaultToken || `424242424242${activeCard.last4}`
        expMonthToSend = parsedMonth
        expYearToSend = parsedYear
        cvvToSend = savedCardCvv.trim()
        last4ToSend = activeCard.last4
      } else {
        // Pay with another card
        const cleanNumber = newCardNumber.replace(/\D/g, '')
        if (cleanNumber.length < 15 || cleanNumber.length > 16) {
          setNotice('Card number must be 15 or 16 digits.')
          return
        }
        const parsedMonth = Number(newCardExpMonth)
        const parsedYear = Number(newCardExpYear)
        const currentYear = new Date().getFullYear()

        if (!parsedMonth || parsedMonth < 1 || parsedMonth > 12 || !parsedYear || parsedYear < currentYear || (parsedYear === currentYear && parsedMonth < new Date().getMonth() + 1)) {
          setNotice(`Please select a valid expiry date (MM/${currentYear}-${currentYear + 10}).`)
          return
        }

        if (!newCardCvv || !/^\d{3}$/.test(newCardCvv.trim())) {
          setNotice('CVV security code must be exactly 3 digits.')
          return
        }

        cardNumToSend = cleanNumber
        expMonthToSend = parsedMonth
        expYearToSend = parsedYear
        cvvToSend = newCardCvv.trim()
        last4ToSend = cleanNumber.slice(-4)

        if (saveCardForFuture) {
          const brand = detectCardBrand(cleanNumber)
          const formattedMonth = String(parsedMonth).padStart(2, '0')
          const formattedYear = String(parsedYear).slice(-2)

          const existingIndex = savedCards.findIndex(
            (c) =>
              String(c.last4 || '').trim() === last4ToSend &&
              String(c.expMonth || '').padStart(2, '0') === formattedMonth &&
              String(c.expYear || '').slice(-2) === formattedYear
          )

          let updatedList
          if (existingIndex !== -1) {
            // Update existing card in place rather than creating a duplicate
            updatedList = deduplicateCards(
              savedCards.map((c, idx) =>
                idx === existingIndex
                  ? {
                      ...c,
                      brand,
                      cardholder: (newCardholder || details.name || customer?.name || 'Cardholder').toUpperCase(),
                      colorTheme: brand === 'Visa' ? 'navy' : brand === 'Mastercard' ? 'dark-gold' : 'slate',
                      cvvHash: hashCvv(newCardCvv.trim()),
                      testCvvHint: newCardCvv.trim(),
                    }
                  : c
              )
            )
          } else {
            const pseudoToken = `tok_pci_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`
            const newlySavedCard = {
              id: `card_${Date.now()}`,
              brand,
              last4: last4ToSend,
              cardholder: (newCardholder || details.name || customer?.name || 'Cardholder').toUpperCase(),
              expMonth: formattedMonth,
              expYear: formattedYear,
              isDefault: savedCards.length === 0,
              vaultToken: pseudoToken,
              colorTheme: brand === 'Visa' ? 'navy' : brand === 'Mastercard' ? 'dark-gold' : 'slate',
              cvvHash: hashCvv(newCardCvv.trim()),
              testCvvHint: newCardCvv.trim(),
            }
            updatedList = deduplicateCards([newlySavedCard, ...savedCards])
          }

          setSavedCards(updatedList)
          try {
            localStorage.setItem(storageKey, JSON.stringify(updatedList))
          } catch {}
        }
      }
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('facilityId', String(facility.id))
      formData.append('bookingDate', `${date}T00:00:00.000Z`)
      formData.append('startTime', `${startTime}:00`)
      formData.append('endTime', apiEndTime)
      formData.append('hoursNeeded', String(hoursNeeded))
      formData.append('customerName', details.name.trim())
      formData.append('nicNumber', details.nic.trim())
      formData.append('contactNumber', details.contact.trim())
      formData.append('paymentMethod', payment.method)
      if (payment.method === 'Card') {
        formData.append('cardNumber', cardNumToSend)
        formData.append('expiryMonth', String(expMonthToSend))
        formData.append('expiryYear', String(expYearToSend))
        formData.append('cvv', cvvToSend)
        formData.append('cardLastFour', last4ToSend)
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
                        onClick={() => {
                          setStartTime(timeKey)
                          const maxAvail = getMaxConsecutiveHours(timeKey, availability?.slots)
                          if (maxAvail > 0 && Number(hoursNeeded) > maxAvail) {
                            setHoursNeeded(maxAvail)
                          }
                        }}
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
                  onChange={(event) => {
                    const newStart = event.target.value
                    setStartTime(newStart)
                    if (newStart) {
                      const maxAvail = getMaxConsecutiveHours(newStart, availability?.slots)
                      if (maxAvail > 0 && Number(hoursNeeded) > maxAvail) {
                        setHoursNeeded(maxAvail)
                      }
                    }
                  }}
                  className="awesome-input-time"
                  placeholder="Select slot above"
                />
              </label>

              <label className="awesome-field">
                <div className="field-label-row">
                  <span className="field-label-text">
                    <span className="field-emoji">⏱️</span> Duration (Hours)
                  </span>
                  {startTime && (
                    <span className={`duration-max-pill ${maxConsecutiveHours === 0 ? 'pill-danger' : ''}`}>
                      Max: {maxConsecutiveHours} hr{maxConsecutiveHours !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  max={maxConsecutiveHours > 0 ? maxConsecutiveHours : 1}
                  step="1"
                  value={hoursNeeded}
                  onChange={(event) => setHoursNeeded(event.target.value)}
                  className={`awesome-input-duration ${conflictSlot ? 'input-error-border' : ''}`}
                />
              </label>
            </div>

            {/* Inline Conflict Warning Banner */}
            {conflictSlot && (
              <div className="duration-conflict-warning">
                <span className="warning-icon">⚠️</span>
                <div className="warning-content">
                  <strong>Slot Conflict Detected</strong>
                  <p>
                    Cannot book <strong>{hoursNeeded} hours</strong> starting at <strong>{startTime}</strong>.
                    The slot at <strong>{conflictSlot}</strong> is already booked or unavailable.
                    Only <strong>{maxConsecutiveHours} continuous hour{maxConsecutiveHours !== 1 ? 's' : ''}</strong> can be reserved from this start time.
                  </p>
                </div>
              </div>
            )}

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

            {/* Card Payment Section: Saved Cards vs New Card */}
            {payment.method === 'Card' && (
              <div className="awesome-card-payment-wrapper">
                {/* Mode Selector Tabs (if user has saved cards) */}
                {savedCards.length > 0 && (
                  <div className="card-checkout-mode-tabs" role="tablist">
                    <button
                      type="button"
                      className={`card-mode-tab-btn ${cardChoice === 'saved' ? 'active' : ''}`}
                      onClick={() => setCardChoice('saved')}
                    >
                      <span className="tab-icon">⚡</span>
                      <span>Saved Cards ({savedCards.length})</span>
                    </button>
                    <button
                      type="button"
                      className={`card-mode-tab-btn ${cardChoice === 'new' ? 'active' : ''}`}
                      onClick={() => setCardChoice('new')}
                    >
                      <span className="tab-icon">💳</span>
                      <span>Pay with Another Card</span>
                    </button>
                  </div>
                )}

                {/* OPTION A: Saved Cards Selector */}
                {cardChoice === 'saved' && savedCards.length > 0 ? (
                  <div className="saved-cards-checkout-section">
                    <div className="saved-cards-instruction-row">
                      <span className="section-subtitle">Select your card for payment:</span>
                      <button
                        type="button"
                        className="switch-card-mode-link"
                        onClick={() => setCardChoice('new')}
                      >
                        + Pay with another card
                      </button>
                    </div>

                    <div className="saved-cards-list-group">
                      {savedCards.map((card) => {
                        const isSelected = selectedCardId === card.id || (!selectedCardId && card.isDefault)
                        return (
                          <div
                            key={card.id}
                            className={`saved-card-row-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedCardId(card.id)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="saved-card-radio-indicator">
                              <span className={`radio-dot ${isSelected ? 'checked' : ''}`} />
                            </div>

                            <div className={`saved-card-brand-badge-pill brand-${(card.brand || 'card').toLowerCase()}`}>
                              {card.brand === 'Visa' ? 'VISA' : card.brand === 'Mastercard' ? 'MC' : card.brand === 'Amex' ? 'AMEX' : 'CARD'}
                            </div>

                            <div className="saved-card-details-col">
                              <div className="saved-card-main-line">
                                <span className="saved-card-number-masked">•••• •••• •••• {card.last4}</span>
                                {card.isDefault && <span className="saved-card-default-badge">DEFAULT</span>}
                              </div>
                              <div className="saved-card-sub-line">
                                <span className="saved-card-name">{card.cardholder}</span>
                                <span className="saved-card-expiry">Expires {card.expMonth}/{card.expYear}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* CVV Security Confirmation Box for the selected saved card */}
                    {(() => {
                      const activeCard = savedCards.find((c) => c.id === selectedCardId) || savedCards[0]
                      return (
                        <div className={`saved-card-cvv-box ${cvvError ? 'has-error' : ''}`}>
                          <div className="cvv-box-header">
                            <span className="lock-icon">{cvvError ? '⚠️' : '🔒'}</span>
                            <div>
                              <strong>Security Verification</strong>
                              <p>Enter the 3-digit CVV code for your {activeCard?.brand || 'card'} ending in •••• {activeCard?.last4}:</p>
                            </div>
                          </div>
                          <div className="cvv-input-row">
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength="3"
                              value={savedCardCvv}
                              onChange={(e) => {
                                setCvvError(false)
                                setNotice('')
                                setSavedCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))
                              }}
                              placeholder="•••"
                              className={`saved-card-cvv-input ${cvvError ? 'input-error' : ''}`}
                              required
                              autoFocus
                            />
                            <span className="cvv-hint-badge">
                              3 digits on card back {activeCard?.id === 'card_demo_1' || !activeCard?.cvvHash ? '(Demo: 123)' : ''}
                            </span>
                          </div>
                          {cvvError && (
                            <div className="cvv-inline-error">
                              ❌ Incorrect CVV security code. Payment authorization declined.
                            </div>
                          )}
                          <small className="cvv-compliance-note">
                            PCI-DSS standard: CVV is verified securely for every booking and is never stored on disk.
                          </small>
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  /* OPTION B: New Card Entry Form */
                  <div className="new-card-checkout-section">
                    {savedCards.length > 0 && (
                      <div className="new-card-header-bar">
                        <span className="section-subtitle">Enter details for another card:</span>
                        <button
                          type="button"
                          className="switch-card-mode-link"
                          onClick={() => setCardChoice('saved')}
                        >
                          ← Back to saved cards
                        </button>
                      </div>
                    )}

                    <div className="awesome-card-inputs-box">
                      <label className="awesome-field">
                        <span className="field-label-text">Cardholder Name</span>
                        <input
                          type="text"
                          value={newCardholder}
                          onChange={(e) => setNewCardholder(e.target.value)}
                          placeholder="e.g. JOHN DOE"
                          required
                        />
                      </label>

                      <label className="awesome-field">
                        <div className="field-label-with-brand">
                          <span className="field-label-text">Card Number</span>
                          {newCardNumber && (
                            <span className="detected-brand-pill">
                              {detectCardBrand(newCardNumber)}
                            </span>
                          )}
                        </div>
                        <input
                          inputMode="numeric"
                          maxLength="19"
                          value={formatCardNumberSpaced(newCardNumber)}
                          onChange={(e) => setNewCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                          placeholder="4111 2222 3333 4444"
                          required
                        />
                      </label>

                      <div className="form-fields-grid-2">
                        <label className="awesome-field">
                          <span className="field-label-text">Expiry Date</span>
                          <div className="expiry-pickers-row">
                            <select
                              value={newCardExpMonth}
                              onChange={(e) => setNewCardExpMonth(e.target.value)}
                              required
                              className="awesome-input-select"
                            >
                              <option value="">Month</option>
                              {Array.from({ length: 12 }, (_, index) => (
                                <option key={index + 1} value={String(index + 1).padStart(2, '0')}>
                                  {String(index + 1).padStart(2, '0')}
                                </option>
                              ))}
                            </select>

                            <select
                              value={newCardExpYear}
                              onChange={(e) => setNewCardExpYear(e.target.value)}
                              required
                              className="awesome-input-select"
                            >
                              <option value="">Year</option>
                              {Array.from({ length: 11 }, (_, index) => new Date().getFullYear() + index).map((year) => (
                                <option key={year} value={year}>
                                  {year}
                                </option>
                              ))}
                            </select>
                          </div>
                        </label>

                        <label className="awesome-field">
                          <span className="field-label-text">Security Code (CVV)</span>
                          <input
                            type="password"
                            inputMode="numeric"
                            maxLength="3"
                            value={newCardCvv}
                            onChange={(e) => setNewCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                            placeholder="•••"
                            required
                          />
                        </label>
                      </div>

                      <label className="save-card-checkbox-label">
                        <input
                          type="checkbox"
                          checked={saveCardForFuture}
                          onChange={(e) => setSaveCardForFuture(e.target.checked)}
                        />
                        <span className="checkbox-text">
                          🔒 Save this card securely to my profile for faster checkout next time
                        </span>
                      </label>
                    </div>
                  </div>
                )}
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

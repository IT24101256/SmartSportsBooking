import { useEffect, useState } from 'react'

const today = () => new Date().toISOString().slice(0, 10)

const initialDetails = { name: '', nic: '', contact: '' }
const initialPayment = { method: 'BankTransfer', cardNumber: '', expiry: '', cvv: '', slip: null }
const nicPattern = /^(\d{9}[vVxX]|\d{12})$/

export default function BookingWizard({ facilities, initialFacilityName, token, apiBaseUrl, isAdmin, onClose, onCreated }) {
  const [step, setStep] = useState(1)
  const [facilityName, setFacilityName] = useState(initialFacilityName || facilities[0]?.name || '')
  const [date, setDate] = useState(today())
  const [startTime, setStartTime] = useState('')
  const [hoursNeeded, setHoursNeeded] = useState(1)
  const [availability, setAvailability] = useState(null)
  const [details, setDetails] = useState(initialDetails)
  const [payment, setPayment] = useState(initialPayment)
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  const facility = facilities.find((item) => item.name === facilityName) || facilities[0]
  const selectedSlot = availability?.slots?.find((slot) => slot.startTime.slice(0, 5) === startTime)
  const total = Number(facility?.hourlyRate || 0) * Number(hoursNeeded)
  const endTime = startTime ? Number(startTime.slice(0, 2)) + Number(hoursNeeded) === 24 ? '1.00:00' : `${String(Number(startTime.slice(0, 2)) + Number(hoursNeeded)).padStart(2, '0')}:00` : ''
  useEffect(() => {
    const selectedFacility = facilities.find((item) => item.name === facilityName)
    if (!selectedFacility || !date) return
    const loadAvailability = async () => {
      setNotice('')
      setStartTime('')
      setAvailability(null)
      const response = await fetch(`${apiBaseUrl}/bookings/availability?facilityId=${selectedFacility.id}&date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        setNotice('Availability could not be loaded.')
        return
      }
      setAvailability(await response.json())
    }
    loadAvailability().catch(() => setNotice('The API is unavailable. Start the backend and try again.'))
  }, [apiBaseUrl, date, facilities, facilityName, token])

  const canContinueReserve = Boolean(selectedSlot) && Number(hoursNeeded) >= 1 && Number.isInteger(Number(hoursNeeded)) && Number(startTime.slice(0, 2)) + Number(hoursNeeded) <= 24

  const submitBooking = async (event) => {
    event.preventDefault()
    setNotice('')
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
    if (payment.method === 'Card' && (!/^\d{16}$/.test(payment.cardNumber) || !Number.isInteger(expiryMonth) || expiryMonth < 1 || expiryMonth > 12 || !Number.isInteger(expiryYear) || expiryYear < currentYear || expiryYear > currentYear + 10 || (expiryYear === currentYear && expiryMonth < new Date().getMonth() + 1) || !/^\d{3}$/.test(payment.cvv))) {
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

  return (
    <div className="booking-modal-backdrop" onClick={onClose}>
      <div className="booking-modal booking-wizard-modal" onClick={(event) => event.stopPropagation()}>
        <div className="booking-modal-header">
          <div>
            <p className="eyebrow subtle">Step {step} of 4</p>
            <h3>{step === 1 ? 'Reserve facility' : step === 2 ? 'User details' : step === 3 ? 'Payment' : 'Confirmation'}</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="wizard-progress" aria-label="Booking progress">
          {[1, 2, 3, 4].map((item) => <span key={item} className={item <= step ? 'active' : ''}>{item}</span>)}
        </div>

        {notice && <div className="auth-feedback">{notice}</div>}

        {step === 1 && (
          <div className="booking-form">
            <label><span>Facility</span><select value={facilityName} onChange={(event) => setFacilityName(event.target.value)}>{facilities.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
            <label><span>Date</span><input type="date" min={today()} value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <div className="availability-panel">
              <div className="availability-heading"><strong>Day availability</strong><span>{availability ? `LKR ${Number(availability.hourlyRate).toLocaleString()} / hour` : 'Loading...'}</span></div>
              <div className="availability-slots">{availability?.slots?.map((slot) => <button key={slot.startTime} type="button" disabled={slot.status !== 'Available'} className={`availability-slot ${slot.status.toLowerCase()} ${slot.startTime.slice(0, 5) === startTime ? 'selected' : ''}`} onClick={() => setStartTime(slot.startTime.slice(0, 5))}><strong>{slot.startTime.slice(0, 5)}</strong><small>{slot.status}</small></button>)}</div>
            </div>
            <div className="form-row"><label><span>Start time</span><input type="time" step="3600" min="08:00" max="23:00" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label><label><span>Hours needed</span><input type="number" min="1" max="16" step="1" value={hoursNeeded} onChange={(event) => setHoursNeeded(event.target.value)} /></label></div>
            <div className="booking-total"><span>Total amount</span><strong>LKR {total.toLocaleString()}</strong></div>
            <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button type="button" className="primary-btn" disabled={!canContinueReserve} onClick={() => setStep(2)}>Continue</button></div>
          </div>
        )}

        {step === 2 && (
          <div className="booking-form">
            <label><span>Name</span><input value={details.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} required /></label>
            <label><span>NIC number</span><input maxLength="12" value={details.nic} onChange={(event) => setDetails({ ...details, nic: event.target.value.replace(/[^0-9vVxX]/g, '').slice(0, 12) })} pattern="^(\d{9}[vVxX]|\d{12})$" required /></label>
            <label><span>Contact number</span><input type="tel" inputMode="numeric" maxLength="10" value={details.contact} onChange={(event) => setDetails({ ...details, contact: event.target.value.replace(/\D/g, '').slice(0, 10) })} pattern="\d{10}" required /></label>
            <div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setStep(1)}>Back</button><button type="button" className="primary-btn" onClick={() => setStep(3)}>Continue to payment</button></div>
          </div>
        )}

        {step === 3 && (
          <form className="booking-form" onSubmit={submitBooking}>
            <div className="payment-methods"><button type="button" className={payment.method === 'BankTransfer' ? 'payment-method active' : 'payment-method'} onClick={() => setPayment({ ...payment, method: 'BankTransfer' })}>Direct bank transfer</button><button type="button" className={payment.method === 'Card' ? 'payment-method active' : 'payment-method'} onClick={() => setPayment({ ...payment, method: 'Card' })}>Card payment</button>{isAdmin && <button type="button" className={payment.method === 'Cash' ? 'payment-method active' : 'payment-method'} onClick={() => setPayment({ ...payment, method: 'Cash' })}>Cash in hand</button>}</div>
            {payment.method === 'BankTransfer' ? <><div className="bank-details"><strong>SmartSports Bank Accounts</strong><span>People's Bank, Colombo: 1234567890</span><span>Commercial Bank, Colombo: 9876543210</span></div><label><span>Upload transfer slip</span><input type="file" accept="image/*,.pdf" onChange={(event) => setPayment({ ...payment, slip: event.target.files?.[0] || null })} required /></label></> : payment.method === 'Cash' ? <div className="bank-details"><strong>Cash payment</strong><span>This option is available only when an administrator creates the booking.</span></div> : <><label><span>Card number</span><input inputMode="numeric" maxLength="16" value={payment.cardNumber} onChange={(event) => setPayment({ ...payment, cardNumber: event.target.value.replace(/\D/g, '').slice(0, 16) })} placeholder="16 digit card number" required /></label><div className="form-row"><label><span>Expiry month</span><select value={payment.expiry.split('/')[0] || ''} onChange={(event) => setPayment({ ...payment, expiry: `${event.target.value}/${payment.expiry.split('/')[1] || ''}` })} required><option value="">Month</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={String(index + 1).padStart(2, '0')}>{String(index + 1).padStart(2, '0')}</option>)}</select></label><label><span>Expiry year</span><select value={payment.expiry.split('/')[1] || ''} onChange={(event) => setPayment({ ...payment, expiry: `${payment.expiry.split('/')[0] || ''}/${event.target.value}` })} required><option value="">Year</option>{Array.from({ length: 11 }, (_, index) => new Date().getFullYear() + index).map((year) => <option key={year} value={year}>{year}</option>)}</select></label></div><label><span>CVV</span><input type="password" inputMode="numeric" maxLength="3" value={payment.cvv} onChange={(event) => setPayment({ ...payment, cvv: event.target.value.replace(/\D/g, '').slice(0, 3) })} required /></label></>}
            <div className="booking-total"><span>Amount to pay</span><strong>LKR {total.toLocaleString()}</strong></div>
            <div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setStep(2)}>Back</button><button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Submitting...' : 'Submit booking'}</button></div>
          </form>
        )}

        {step === 4 && <div className="confirmation-panel"><strong>Booking submitted successfully</strong><p>Your {facility.name} reservation is recorded for {date}, {startTime} to {endTime}.</p><p>Total: <b>LKR {total.toLocaleString()}</b></p><button type="button" className="primary-btn" onClick={onClose}>Done</button></div>}
      </div>
    </div>
  )
}

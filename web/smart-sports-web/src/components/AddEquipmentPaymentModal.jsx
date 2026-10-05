/* oxlint-disable react/set-state-in-effect */
/* oxlint-disable react-hooks/exhaustive-deps */
import { useState, useMemo, useEffect } from 'react'

export default function AddEquipmentPaymentModal({
  booking,
  facilities = [],
  apiBaseUrl = 'http://localhost:5187/api',
  _token,
  onClose,
  onSubmit,
}) {
  const [fetchedEquipments, setFetchedEquipments] = useState([])
  const [loadingEquip, setLoadingEquip] = useState(true)

  // Determine booking facility and sport category
  const facilityData = useMemo(() => {
    if (!booking) return null
    if (booking.facility && typeof booking.facility === 'object') return booking.facility
    const facId = booking.facilityId
    if (facId && facilities.length) {
      return facilities.find((f) => f.id === facId) || null
    }
    const name = booking.facilityName || booking.name
    if (name && facilities.length) {
      return facilities.find((f) => f.name?.toLowerCase() === name.toLowerCase()) || null
    }
    return null
  }, [booking, facilities])

  const sportCategory = useMemo(() => {
    const raw =
      facilityData?.sportCategory ||
      facilityData?.type ||
      booking?.facility?.sportCategory ||
      booking?.facility?.type ||
      booking?.name ||
      ''
    const lower = raw.toLowerCase()
    if (lower.includes('badminton')) return 'Badminton'
    if (lower.includes('cricket')) return 'Cricket'
    if (lower.includes('football') || lower.includes('turf') || lower.includes('soccer')) return 'Football'
    if (lower.includes('basket')) return 'Basketball'
    if (lower.includes('swim')) return 'Swimming'
    if (lower.includes('tennis') && !lower.includes('table')) return 'Tennis'
    if (lower.includes('table tennis')) return 'Table Tennis'
    if (lower.includes('volley')) return 'Volleyball'
    if (lower.includes('fitness') || lower.includes('gym')) return 'Fitness'
    return 'General'
  }, [facilityData, booking])

  // Fetch equipments from API
  useEffect(() => {
    let active = true
    setLoadingEquip(true)
    fetch(`${apiBaseUrl}/equipments`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active && Array.isArray(data)) {
          setFetchedEquipments(data)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingEquip(false)
      })
    return () => {
      active = false
    }
  }, [apiBaseUrl])

  // Filter available equipments for this facility/sport
  const availableEquipments = useMemo(() => {
    const facId = booking?.facilityId || facilityData?.id

    // 1. From API
    let matched = fetchedEquipments.filter((eq) => {
      if (facId && eq.facilityId === facId) return true
      if (sportCategory !== 'General') {
        const cat = (eq.sportCategory || '').toLowerCase()
        const sc = sportCategory.toLowerCase()
        return cat === sc || cat.includes(sc) || sc.includes(cat)
      }
      return true
    })

    // 2. If API is empty, fallback to facility equipmentsProvided JSON
    if (matched.length === 0) {
      const raw = facilityData?.equipmentsProvided || booking?.facility?.equipmentsProvided
      if (raw) {
        if (Array.isArray(raw)) matched = raw
        else if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) matched = parsed
          } catch {
            matched = raw
              .split(',')
              .map((i) => i.trim())
              .filter(Boolean)
              .map((name) => ({ name, hourlyRate: 250 }))
          }
        }
      }
    }

    return matched
  }, [fetchedEquipments, facilityData, booking, sportCategory])

  const initialEquipment = availableEquipments[0] || null

  const [selectedGearId, setSelectedGearId] = useState(
    initialEquipment ? initialEquipment.id || initialEquipment.name : '__custom__'
  )
  const [equipmentName, setEquipmentName] = useState(initialEquipment ? initialEquipment.name : '')
  const [hourlyRate, setHourlyRate] = useState(initialEquipment ? initialEquipment.hourlyRate ?? 250 : 250)
  const [quantity, setQuantity] = useState(1)
  const [hours, setHours] = useState(booking?.hoursNeeded ? Number(booking.hoursNeeded) : 1)
  const [paymentMethod, setPaymentMethod] = useState('Cash in hand') // 'Cash in hand' | 'Card (Machine)'
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Sync initial when availableEquipments loads
  useEffect(() => {
    if (availableEquipments.length > 0 && selectedGearId === '__custom__' && !equipmentName) {
      const first = availableEquipments[0]
      setSelectedGearId(first.id || first.name)
      setEquipmentName(first.name)
      setHourlyRate(first.hourlyRate ?? 250)
    }
  }, [availableEquipments])

  if (!booking) return null

  const handleSelectGear = (gear) => {
    if (gear === '__custom__') {
      setSelectedGearId('__custom__')
      setEquipmentName('')
      setHourlyRate(250)
    } else {
      setSelectedGearId(gear.id || gear.name)
      setEquipmentName(gear.name)
      setHourlyRate(gear.hourlyRate ?? 250)
    }
  }

  const numQty = Math.max(1, parseInt(quantity, 10) || 1)
  const numHours = Math.max(1, parseInt(hours, 10) || 1)
  const numRate = Math.max(0, parseFloat(hourlyRate) || 0)
  const totalAmount = Math.round(numQty * numRate * numHours)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const name = equipmentName.trim()
    if (!name) {
      setError('Please provide or select an equipment name.')
      return
    }

    if (numRate < 0) {
      setError('Hourly rate cannot be negative.')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(booking.id, {
        equipmentName: name,
        quantity: numQty,
        hourlyRate: numRate,
        hours: numHours,
        paymentMethod,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setError(err?.message || 'Failed to record equipment payment.')
    } finally {
      setSubmitting(false)
    }
  }

  const getSportEmoji = (sport = '') => {
    const s = sport.toLowerCase()
    if (s.includes('badminton')) return '🏸'
    if (s.includes('cricket')) return '🏏'
    if (s.includes('football')) return '⚽'
    if (s.includes('basket')) return '🏀'
    if (s.includes('swim')) return '🏊'
    if (s.includes('tennis')) return '🎾'
    if (s.includes('table')) return '🏓'
    if (s.includes('volley')) return '🏐'
    return '🎒'
  }

  return (
    <div className="facility-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="facility-awesome-modal equipment-payment-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px' }}
      >
        {/* Header */}
        <div className="facility-modal-header">
          <div className="facility-modal-title-wrap">
            <div className="facility-modal-eyebrow">
              <span className="hub-pulse-dot" style={{ background: '#10b981' }} />
              <span>ON-SITE SERVICE DESK • ADMIN & MANAGER ACCESS</span>
            </div>
            <h2 className="facility-modal-heading">Issue Additional Equipment</h2>
            <p className="facility-modal-sub">
              Add extra sports gear for Booking <strong>#BK-{String(booking.id).padStart(5, '0')}</strong>.
              Collect payment on-site and record to revenue ledger.
            </p>
          </div>
          <button
            type="button"
            className="facility-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Booking Context Banner */}
        <div className="equip-modal-booking-strip">
          <div className="strip-item">
            <span className="strip-label">ARENA / COURT</span>
            <strong className="strip-val">{booking.facilityName || booking.facility?.name || booking.name}</strong>
          </div>
          <div className="strip-item">
            <span className="strip-label">MEMBER</span>
            <strong className="strip-val">{booking.customerName || 'Club Member'}</strong>
          </div>
          <div className="strip-item">
            <span className="strip-label">DATE & TIME</span>
            <strong className="strip-val">{booking.date || 'Today'}</strong>
          </div>
          <div className="strip-item">
            <span className="strip-label">CURRENT FARE</span>
            <strong className="strip-val" style={{ color: '#10b981' }}>
              LKR {Number(booking.totalAmount || 0).toLocaleString()}
            </strong>
          </div>
        </div>

        {error && (
          <div className="facility-modal-alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="facility-modal-form">
          {/* Equipment Selection Grid */}
          <div className="facility-field">
            <div className="field-header-row">
              <span className="field-label">
                Select Equipment from Catalog ({sportCategory} Gear)
              </span>
              {loadingEquip && <span className="field-loading-hint">Loading catalog...</span>}
            </div>

            <div className="equip-selection-cards-grid">
              {availableEquipments.map((gear) => {
                const isSelected = selectedGearId === (gear.id || gear.name)
                return (
                  <button
                    key={gear.id || gear.name}
                    type="button"
                    className={`gear-select-card ${isSelected ? 'active-gear' : ''}`}
                    onClick={() => handleSelectGear(gear)}
                  >
                    <div className="gear-card-top">
                      <span className="gear-card-emoji">
                        {getSportEmoji(gear.sportCategory || sportCategory)}
                      </span>
                      <span className="gear-card-rate">
                        LKR {Number(gear.hourlyRate || 0).toLocaleString()} <span className="unit">/ hr</span>
                      </span>
                    </div>
                    <strong className="gear-card-title">{gear.name}</strong>
                    {gear.totalStock != null && (
                      <span className="gear-card-stock">📦 {gear.totalStock} in storage</span>
                    )}
                  </button>
                )
              })}

              {/* Custom Item Tile */}
              <button
                type="button"
                className={`gear-select-card custom-card ${selectedGearId === '__custom__' ? 'active-gear' : ''}`}
                onClick={() => handleSelectGear('__custom__')}
              >
                <div className="gear-card-top">
                  <span className="gear-card-emoji">➕</span>
                  <span className="gear-card-rate">Custom Rate</span>
                </div>
                <strong className="gear-card-title">Custom Equipment...</strong>
                <span className="gear-card-stock">Manual specification</span>
              </button>
            </div>
          </div>

          {/* If Custom chosen, or allow editing name & rate */}
          <div className="form-double-col">
            <label className="facility-field">
              <span className="field-label">Selected Equipment Name *</span>
              <input
                type="text"
                className="facility-input"
                value={equipmentName}
                onChange={(e) => {
                  setEquipmentName(e.target.value)
                  setSelectedGearId('__custom__')
                }}
                placeholder="e.g. Wilson Tennis Rackets, Cricket Pads..."
                required
              />
            </label>

            <label className="facility-field">
              <span className="field-label">Hourly Rental Rate (LKR / hr) *</span>
              <div className="equip-rate-input-wrap">
                <span className="rate-prefix">LKR</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  className="facility-input rate-input"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  required
                />
              </div>
            </label>
          </div>

          {/* Steppers: Quantity & Duration */}
          <div className="form-double-col">
            <label className="facility-field">
              <span className="field-label">Quantity (Items)</span>
              <div className="stepper-input-wrap">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setQuantity((q) => Math.max(1, (parseInt(q, 10) || 1) - 1))}
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  className="facility-input stepper-input"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setQuantity((q) => (parseInt(q, 10) || 0) + 1)}
                >
                  +
                </button>
              </div>
            </label>

            <label className="facility-field">
              <span className="field-label">Duration (Hours)</span>
              <div className="stepper-input-wrap">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setHours((h) => Math.max(1, (parseInt(h, 10) || 1) - 1))}
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  className="facility-input stepper-input"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setHours((h) => (parseInt(h, 10) || 0) + 1)}
                >
                  +
                </button>
              </div>
            </label>
          </div>

          {/* Payment Method Selection: Cash in hand vs. Card (machine) */}
          <div className="facility-field">
            <span className="field-label">On-Site Payment Collection Method *</span>
            <div className="payment-method-selector-grid">
              <button
                type="button"
                className={`payment-method-tile ${paymentMethod === 'Cash in hand' ? 'active-method' : ''}`}
                onClick={() => setPaymentMethod('Cash in hand')}
              >
                <div className="tile-radio-indicator">
                  <span className="radio-dot" />
                </div>
                <div className="tile-content">
                  <div className="tile-icon-line">
                    <span className="tile-emoji">💵</span>
                    <strong>Cash in hand</strong>
                  </div>
                  <p className="tile-subtext">Direct physical cash received at service desk.</p>
                </div>
              </button>

              <button
                type="button"
                className={`payment-method-tile ${paymentMethod === 'Card (Machine)' ? 'active-method' : ''}`}
                onClick={() => setPaymentMethod('Card (Machine)')}
              >
                <div className="tile-radio-indicator">
                  <span className="radio-dot" />
                </div>
                <div className="tile-content">
                  <div className="tile-icon-line">
                    <span className="tile-emoji">💳</span>
                    <strong>Card (machine)</strong>
                  </div>
                  <p className="tile-subtext">POS swipe / chip payment charged via on-site card terminal.</p>
                </div>
              </button>
            </div>
          </div>

          {/* Audit Note */}
          <label className="facility-field">
            <span className="field-label">Receipt / Audit Note (Optional)</span>
            <input
              type="text"
              className="facility-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Issued from Locker #4; POS terminal auth #9928"
            />
          </label>

          {/* Calculation Banner */}
          <div className="equip-payment-calc-banner">
            <div className="calc-left">
              <span className="calc-formula">
                {numQty} {numQty === 1 ? 'item' : 'items'} × LKR {numRate.toLocaleString()}/hr × {numHours} {numHours === 1 ? 'hr' : 'hrs'}
              </span>
              <span className="calc-method-tag">
                Payment: <strong>{paymentMethod}</strong> (Status: <strong>PAID</strong>)
              </span>
            </div>
            <div className="calc-right">
              <span className="calc-total-label">TOTAL TO COLLECT:</span>
              <strong className="calc-total-val">LKR {totalAmount.toLocaleString()}</strong>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="facility-modal-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn equip-submit-btn"
              disabled={submitting || totalAmount < 0}
            >
              {submitting ? 'Recording Payment...' : `💰 Collect LKR ${totalAmount.toLocaleString()} & Issue Equipment`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

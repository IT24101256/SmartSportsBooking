/* oxlint-disable react/set-state-in-effect */
import { useState, useEffect, useRef } from 'react'
import './BookWithAiModal.css'

export default function BookWithAiModal({
  apiBaseUrl = 'http://localhost:5187/api',
  token = '',
  currentUser = null,
  onClose,
  onBookingSuccess,
  onOpenAuth,
}) {
  const [workflowId, setWorkflowId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [_status, setStatus] = useState('collecting_requirements')
  const [summary, setSummary] = useState(null)
  const [suggestedOptions, setSuggestedOptions] = useState([])
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedSlots, setSelectedSlots] = useState([])
  const [customDate, setCustomDate] = useState('')
  const [_missingFields, setMissingFields] = useState([])
  const [trajectory, setTrajectory] = useState([])
  const [showTrajectory, setShowTrajectory] = useState(false)
  const [confirmedBooking, setConfirmedBooking] = useState(null)

  // Payment states
  const [paymentChoice, setPaymentChoice] = useState('Card')
  const [cardChoice, setCardChoice] = useState('saved')
  const [selectedCardId, setSelectedCardId] = useState('card_demo_1')
  const currentYear = new Date().getFullYear()
  const monthsList = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
  const yearsList = Array.from({ length: 11 }, (_, i) => String(currentYear + i))

  const [savedCardCvv, setSavedCardCvv] = useState('')
  const [newCardNumber, setNewCardNumber] = useState('')
  const [newCardExpMonth, setNewCardExpMonth] = useState('01')
  const [newCardExpYear, setNewCardExpYear] = useState(String(currentYear))
  const [newCardCvv, setNewCardCvv] = useState('')
  const [saveCardForFuture, setSaveCardForFuture] = useState(true)
  const [bankSlipFile, setBankSlipFile] = useState(null)
  const [bankSlipPreview, setBankSlipPreview] = useState(null)
  const [paymentError, setPaymentError] = useState('')

  const storageKey = currentUser?.id ? `smartsports_saved_cards_${currentUser.id}` : 'smartsports_saved_cards_guest'
  const [savedCards, setSavedCards] = useState(() => {
    try {
      const key = currentUser?.id ? `smartsports_saved_cards_${currentUser.id}` : 'smartsports_saved_cards_guest'
      let stored = localStorage.getItem(key)
      if (!stored && currentUser?.id) {
        stored = localStorage.getItem('smartsports_saved_cards_guest')
      }
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
      return [
        {
          id: 'card_demo_1',
          brand: 'Visa',
          last4: '4242',
          cardholder: currentUser?.fullName || currentUser?.name || 'Athlete Member',
          expMonth: '08',
          expYear: '28',
          isDefault: true,
        },
      ]
    } catch {
      return []
    }
  })

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const stepLabels = [
    { num: 1, title: 'Venue & Slot', icon: '🏟️' },
    { num: 2, title: 'Player Details', icon: '👤' },
    { num: 3, title: 'Payment & Confirm', icon: '💳' },
    { num: 4, title: 'Confirmed', icon: '✅' },
  ]

  // Initialize workflow on mount
  useEffect(() => {
    if (!token) return

    const startWorkflow = async () => {
      setLoading(true)
      try {
        const response = await fetch(`${apiBaseUrl}/ai/booking/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ initialGoal: 'Book sports facility with AI' }),
        })

        if (!response.ok) {
          throw new Error('Failed to initialize AI booking assistant.')
        }

        const data = await response.json()
        setWorkflowId(data.workflowId)
        setStatus(data._status)
        setCurrentStep(data.currentStep || 1)
        setSuggestedOptions(data.suggestedOptions || [])
        setAvailableSlots(data.availableSlots || [])
        setTrajectory(data.trajectory || [])

        setMessages([
          {
            id: 'init-msg',
            role: 'assistant',
            content: data.message || 'Hello! I am your AI Booking Supervisor. Which sport or facility would you like to reserve?',
          },
        ])
      } catch {
        setMessages([
          {
            id: 'err-msg',
            role: 'assistant',
            content: 'Could not connect to the AI booking service. Please check your connection and try again.',
            isError: true,
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    startWorkflow()
  }, [apiBaseUrl, token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, summary, availableSlots, selectedSlots])

  // Reset slot selection when available slots list changes
  useEffect(() => {
    setSelectedSlots([])
  }, [availableSlots])

  const sendMessage = async (customMessage) => {
    const text = (customMessage || input).trim()
    if (!text || loading || !workflowId) return

    setInput('')
    setPaymentError('')
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const response = await fetch(`${apiBaseUrl}/ai/booking/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workflowId,
          message: text,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to communicate with the supervisor agent.')
      }

      const data = await response.json()
      setStatus(data._status)
      setCurrentStep(data.currentStep || 1)
      setSummary(data.summary || null)
      setSuggestedOptions(data.suggestedOptions || [])
      setAvailableSlots(data.availableSlots || [])
      setMissingFields(data._missingFields || [])
      if (data.trajectory) setTrajectory(data.trajectory)

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'An error occurred during multi-agent processing. Please try again.',
          isError: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  // Linear multi-slot selection logic
  const handleToggleSlot = (slot) => {
    if (selectedSlots.length === 0) {
      setSelectedSlots([slot])
      return
    }

    if (selectedSlots.includes(slot)) {
      if (selectedSlots.length === 1) {
        setSelectedSlots([])
        return
      }
      // If clicking first or last, remove it
      if (selectedSlots[0] === slot) {
        setSelectedSlots(selectedSlots.slice(1))
        return
      }
      if (selectedSlots[selectedSlots.length - 1] === slot) {
        setSelectedSlots(selectedSlots.slice(0, -1))
        return
      }
      // If clicking inside, keep up to that slot
      const idx = selectedSlots.indexOf(slot)
      setSelectedSlots(selectedSlots.slice(0, idx + 1))
      return
    }

    // Attempting to select a new slot: check if linear consecutive range is possible
    const clickedHour = parseInt(slot.split(':')[0], 10)
    const existingHours = selectedSlots.map((s) => parseInt(s.split(':')[0], 10))
    const minHour = Math.min(...existingHours, clickedHour)
    const maxHour = Math.max(...existingHours, clickedHour)

    const linearSlots = []
    let isValidRange = true
    for (let h = minHour; h <= maxHour; h++) {
      const formatted = `${String(h).padStart(2, '0')}:00`
      if (!availableSlots.includes(formatted)) {
        isValidRange = false
        break
      }
      linearSlots.push(formatted)
    }

    if (isValidRange) {
      setSelectedSlots(linearSlots)
    } else {
      // Start fresh selection with this slot
      setSelectedSlots([slot])
    }
  }

  const handleConfirmSlots = () => {
    if (selectedSlots.length === 0) return
    const sorted = [...selectedSlots].sort()
    const startHour = parseInt(sorted[0].split(':')[0], 10)
    const endHour = startHour + sorted.length
    const formattedEnd = `${String(endHour).padStart(2, '0')}:00`
    sendMessage(`I want slots from ${sorted[0]} to ${formattedEnd} (${sorted.length} hour${sorted.length > 1 ? 's' : ''})`)
    setSelectedSlots([])
  }

  const handleConfirmBooking = async () => {
    if (!workflowId || loading) return

    setPaymentError('')

    // Validate payment credentials strictly
    if (paymentChoice === 'Card') {
      if (cardChoice === 'saved' && savedCards.length > 0) {
        if (!savedCardCvv || !/^\d{3}$/.test(savedCardCvv.trim())) {
          setPaymentError('Please enter a valid 3-digit CVV security code.')
          return
        }
      } else {
        const cleanNum = newCardNumber.replace(/\D/g, '')
        if (cleanNum.length !== 16 || !/^\d{16}$/.test(cleanNum)) {
          setPaymentError('Card number must be exactly 16 digits.')
          return
        }
        if (!newCardExpMonth || !newCardExpYear) {
          setPaymentError('Please select card expiration month and year.')
          return
        }
        if (!newCardCvv || !/^\d{3}$/.test(newCardCvv.trim())) {
          setPaymentError('CVV security code must be exactly 3 digits.')
          return
        }
      }
    } else if (paymentChoice === 'BankTransfer') {
      if (!bankSlipFile) {
        setPaymentError('Please upload your bank transfer payment slip / receipt image or PDF.')
        return
      }
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('workflowId', workflowId)
      formData.append('paymentMethod', paymentChoice)

      if (paymentChoice === 'Card') {
        if (cardChoice === 'saved' && savedCards.length > 0) {
          const activeCard = savedCards.find((c) => c.id === selectedCardId) || savedCards[0]
          formData.append('cardLastFour', activeCard.last4)
          formData.append('cvv', savedCardCvv.trim())
          formData.append('expiryMonth', String(Number(activeCard.expMonth) || 1))
          const savedExpiryYear = Number(activeCard.expYear) || new Date().getFullYear()
          formData.append('expiryYear', String(savedExpiryYear < 100 ? 2000 + savedExpiryYear : savedExpiryYear))
        } else {
          const cleanNum = newCardNumber.replace(/\D/g, '')
          formData.append('cardNumber', cleanNum)
          formData.append('cardLastFour', cleanNum.slice(-4))
          formData.append('expiryMonth', String(newCardExpMonth))
          formData.append('expiryYear', String(newCardExpYear))
          formData.append('cvv', newCardCvv.trim())
        }
      } else if (paymentChoice === 'BankTransfer' && bankSlipFile) {
        formData.append('bankSlip', bankSlipFile)
      }

      const response = await fetch(`${apiBaseUrl}/ai/booking/confirm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || 'Failed to commit booking.')
      }

      const data = await response.json()
      setStatus('completed')
      setCurrentStep(4)
      setConfirmedBooking(data.booking || data)
      if (data.trajectory) setTrajectory(data.trajectory)

      // Save new card if requested
      if (paymentChoice === 'Card' && cardChoice === 'new' && saveCardForFuture) {
        const cleanNum = newCardNumber.replace(/\D/g, '')
        const last4 = cleanNum.slice(-4)
        const brand = cleanNum.startsWith('5') ? 'Mastercard' : 'Visa'
        const newSaved = {
          id: `card_${Date.now()}`,
          brand,
          last4,
          cardholder: currentUser?.fullName || currentUser?.name || 'Athlete Member',
          expMonth: String(newCardExpMonth).padStart(2, '0'),
          expYear: String(newCardExpYear).slice(-2),
          isDefault: savedCards.length === 0,
        }
        const updated = [newSaved, ...savedCards]
        setSavedCards(updated)
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated))
        } catch {}
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          isCelebration: true,
        },
      ])

      if (onBookingSuccess) {
        onBookingSuccess()
      }
    } catch {
      setPaymentError(err.message)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Booking could not be finalized: ${err.message}`,
          isError: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  // If user is not logged in, prompt sign-in
  if (!token) {
    return (
      <div className="book-ai-backdrop" onClick={onClose}>
        <div className="book-ai-modal" onClick={(e) => e.stopPropagation()}>
          <div className="book-ai-header">
            <div className="book-ai-title-wrap">
              <span className="book-ai-badge">✨ AGENTIC AI BOOKING</span>
              <h3>Book With AI</h3>
            </div>
            <button type="button" className="book-ai-close" onClick={onClose}>✕</button>
          </div>
          <div className="book-ai-auth-prompt">
            <div className="auth-prompt-icon">🔐</div>
            <h4>Member Sign In Required</h4>
            <p>To reserve a sports court or floodlit ground through our multi-agent booking workflow, please sign in with your athlete account.</p>
            <div className="auth-prompt-actions">
              <button
                type="button"
                className="ai-primary-action-btn"
                onClick={() => {
                  onClose()
                  if (onOpenAuth) onOpenAuth()
                }}
              >
                Sign In to Book
              </button>
              <button type="button" className="ai-secondary-action-btn" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="book-ai-backdrop" onClick={onClose}>
      <div className="book-ai-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="book-ai-header">
          <div className="book-ai-title-wrap">
            <div className="book-ai-eyebrow">
              <span className="live-sparkle">✨</span>
              <span>SUPERVISOR MULTI-AGENT WORKFLOW</span>
              <span className="live-pill">LIVE AUTONOMOUS ENGINE</span>
            </div>
            <h3 className="book-ai-headline">Book With AI</h3>
          </div>
          <button type="button" className="book-ai-close" onClick={onClose} title="Close">✕</button>
        </div>

        {/* Visual Stepper Tracker */}
        <div className="book-ai-stepper">
          {stepLabels.map((s) => {
            const isDone = s.num < currentStep
            const isCurrent = s.num === currentStep
            return (
              <div key={s.num} className={`ai-step-pill ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}`}>
                <div className="step-circle">{isDone ? '✓' : s.num}</div>
                <span className="step-label-text">{s.title}</span>
              </div>
            )
          })}
        </div>

        {/* Trajectory Toggle */}
        <div className="ai-trajectory-bar">
          <button
            type="button"
            className="ai-trajectory-toggle"
            onClick={() => setShowTrajectory(!showTrajectory)}
          >
            <span>{showTrajectory ? '▼ Hide Agent Trajectory' : '▶ View Multi-Agent Trajectory'}</span>
            <span className="trajectory-count">({trajectory.length} steps)</span>
          </button>
          {showTrajectory && (
            <div className="ai-trajectory-viewer">
              {trajectory.map((t, idx) => (
                <div key={idx} className="trajectory-item">
                  <span className="t-dot" />
                  <span className="t-text">{t}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat / Interaction Flow */}
        <div className="book-ai-body">
          <div className="book-ai-messages">
            {messages.map((m) => (
              <div key={m.id} className={`book-ai-msg ${m.role}`}>
                {m.role === 'assistant' && <div className="msg-avatar">🤖</div>}
                <div className={`msg-content ${m.isError ? 'msg-error' : ''} ${m.isCelebration ? 'msg-celebration' : ''}`}>
                  <p>{m.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="book-ai-msg assistant">
                <div className="msg-avatar">🤖</div>
                <div className="msg-content msg-loading">
                  <span className="pulse-dot" />
                  <span>Agent orchestrating backend services...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Interactive Date Picker Option (Step 1) */}
          {currentStep === 1 && !summary?.bookingDate && !confirmedBooking && (
            <div className="ai-date-picker-card">
              <div className="date-picker-header">
                <strong>📅 Choose Match Date:</strong>
                <small>Select today, tomorrow, or pick any future date</small>
              </div>
              <div className="date-picker-actions">
                <button
                  type="button"
                  className="ai-date-quick-btn"
                  onClick={() => sendMessage('I want to book for Today')}
                >
                  ⚡ Today
                </button>
                <button
                  type="button"
                  className="ai-date-quick-btn"
                  onClick={() => sendMessage('I want to book for Tomorrow')}
                >
                  📅 Tomorrow
                </button>
                <div className="ai-custom-date-picker">
                  <span className="ai-date-label">🗓️ Pick a Date:</span>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={customDate}
                    onChange={(e) => {
                      const val = e.target.value
                      setCustomDate(val)
                      if (val) {
                        sendMessage(`I want to book on ${val}`)
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Real-Time Live Available Slots Chips with Linear Multi-Slot Selection */}
          {availableSlots.length > 0 && currentStep === 1 && !confirmedBooking && (
            <div className="ai-slots-selector-card">
              <div className="slots-header">
                <div>
                  <strong>🕒 Available Slots ({availableSlots.length}):</strong>
                  <div className="slots-sub">Click slots to select one or multiple consecutive hours</div>
                </div>
                {selectedSlots.length > 0 && (
                  <span className="slots-selected-count">{selectedSlots.length} hr{selectedSlots.length > 1 ? 's' : ''} selected</span>
                )}
              </div>

              <div className="slots-chips-grid">
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlots.includes(slot)
                  return (
                    <button
                      key={slot}
                      type="button"
                      className={`ai-slot-chip ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleToggleSlot(slot)}
                    >
                      {isSelected ? '✓ ' : ''}{slot}
                    </button>
                  )
                })}
              </div>

              {selectedSlots.length > 0 && (
                <div className="slots-confirm-bar">
                  <div className="slots-selection-info">
                    <span className="time-range">
                      {selectedSlots[0]} – {String(parseInt(selectedSlots[0].split(':')[0], 10) + selectedSlots.length).padStart(2, '0')}:00
                    </span>
                    <span className="duration-pill">({selectedSlots.length} consecutive hour{selectedSlots.length > 1 ? 's' : ''})</span>
                  </div>
                  <button
                    type="button"
                    className="slots-continue-btn"
                    onClick={handleConfirmSlots}
                  >
                    Continue with {selectedSlots.length} Selected Slot{selectedSlots.length > 1 ? 's' : ''} →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Booking Summary Card with Payment Details & Validation (Step 3) */}
          {summary && currentStep === 3 && !confirmedBooking && (
            <div className="ai-summary-card">
              <div className="summary-card-header">
                <span className="summary-badge">📋 READY FOR CONFIRMATION</span>
                <h4>Reservation Summary</h4>
              </div>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="s-label">🏟️ Venue</span>
                  <strong className="s-value">{summary.facilityName}</strong>
                </div>
                <div className="summary-item">
                  <span className="s-label">📅 Date</span>
                  <strong className="s-value">{summary.bookingDate}</strong>
                </div>
                <div className="summary-item">
                  <span className="s-label">⏰ Time Slot</span>
                  <strong className="s-value">{summary.startTime} – {summary.endTime} ({summary.hoursNeeded} hr)</strong>
                </div>
                <div className="summary-item">
                  <span className="s-label">👤 Player</span>
                  <strong className="s-value">{summary.customerName} ({summary.contactNumber})</strong>
                </div>
                <div className="summary-item total-item">
                  <span className="s-label">💰 Total Amount</span>
                  <strong className="s-total-price">LKR {Number(summary.totalAmount).toLocaleString()}</strong>
                </div>
              </div>

              {/* Payment Details Section */}
              <div className="ai-payment-section">
                <h5>💳 Payment Details & Verification</h5>
                <div className="ai-payment-method-selector">
                  <label className={`payment-method-option ${paymentChoice === 'Card' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="aiPaymentMethod"
                      value="Card"
                      checked={paymentChoice === 'Card'}
                      onChange={() => { setPaymentChoice('Card'); setPaymentError('') }}
                    />
                    <div className="method-label-wrap">
                      <strong>Credit / Debit Card</strong>
                      <small>Instant card authorization</small>
                    </div>
                  </label>

                  <label className={`payment-method-option ${paymentChoice === 'BankTransfer' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="aiPaymentMethod"
                      value="BankTransfer"
                      checked={paymentChoice === 'BankTransfer'}
                      onChange={() => { setPaymentChoice('BankTransfer'); setPaymentError('') }}
                    />
                    <div className="method-label-wrap">
                      <strong>Bank Transfer Slip</strong>
                      <small>Upload receipt slip for approval</small>
                    </div>
                  </label>
                </div>

                {/* Card Payment Form */}
                {paymentChoice === 'Card' && (
                  <div className="ai-card-payment-form">
                    {savedCards.length > 0 && (
                      <div className="ai-card-tabs">
                        <button
                          type="button"
                          className={`card-tab ${cardChoice === 'saved' ? 'active' : ''}`}
                          onClick={() => { setCardChoice('saved'); setPaymentError('') }}
                        >
                          Saved Cards ({savedCards.length})
                        </button>
                        <button
                          type="button"
                          className={`card-tab ${cardChoice === 'new' ? 'active' : ''}`}
                          onClick={() => { setCardChoice('new'); setPaymentError('') }}
                        >
                          Pay with Another Card
                        </button>
                      </div>
                    )}

                    {cardChoice === 'saved' && savedCards.length > 0 ? (
                      <div className="ai-saved-cards-list">
                        {savedCards.map((card) => {
                          const isSelected = (selectedCardId || savedCards[0].id) === card.id
                          return (
                            <div
                              key={card.id}
                              className={`ai-saved-card-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => setSelectedCardId(card.id)}
                            >
                              <div className="card-brand-badge">{card.brand || 'Card'}</div>
                              <div className="card-info">
                                <strong>•••• •••• •••• {card.last4}</strong>
                                <small>Expires {card.expMonth}/{card.expYear}</small>
                              </div>
                              <div className="card-radio">{isSelected ? '◉' : '○'}</div>
                            </div>
                          )
                        })}

                        <div className="ai-cvv-field">
                          <label htmlFor="ai-saved-cvv">
                            <span>Enter CVV Security Code:</span>
                            <span className="required-star">*</span>
                          </label>
                          <input
                            id="ai-saved-cvv"
                            type="password"
                            maxLength={3}
                            placeholder="•••"
                            value={savedCardCvv}
                            onChange={(e) => setSavedCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                          />
                          <small>Please enter the 3-digit CVV number on the back of your card</small>
                        </div>
                      </div>
                    ) : (
                      <div className="ai-new-card-form">
                        <div className="form-group">
                          <label>Card Number <span className="required-star">*</span></label>
                          <input
                            type="text"
                            maxLength={19}
                            placeholder="4242 4242 4242 4242"
                            value={newCardNumber}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, '').slice(0, 16)
                              setNewCardNumber(v.replace(/(\d{4})/g, '$1 ').trim())
                            }}
                          />
                        </div>

                        <div className="form-row-2">
                          <div className="form-group">
                            <label>Expiry Date <span className="required-star">*</span></label>
                            <div className="exp-inputs">
                              <select
                                className="ai-select-dropdown"
                                value={newCardExpMonth}
                                onChange={(e) => setNewCardExpMonth(e.target.value)}
                              >
                                {monthsList.map((m) => (
                                  <option key={m} value={m}>
                                    {m}
                                  </option>
                                ))}
                              </select>
                              <span>/</span>
                              <select
                                className="ai-select-dropdown"
                                value={newCardExpYear}
                                onChange={(e) => setNewCardExpYear(e.target.value)}
                              >
                                {yearsList.map((y) => (
                                  <option key={y} value={y}>
                                    {y}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="form-group">
                            <label>CVV <span className="required-star">*</span></label>
                            <input
                              type="password"
                              maxLength={3}
                              placeholder="•••"
                              value={newCardCvv}
                              onChange={(e) => setNewCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                            />
                          </div>
                        </div>

                        <label className="save-card-check">
                          <input
                            type="checkbox"
                            checked={saveCardForFuture}
                            onChange={(e) => setSaveCardForFuture(e.target.checked)}
                          />
                          <span>Save card securely for future fast bookings</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Bank Transfer Form */}
                {paymentChoice === 'BankTransfer' && (
                  <div className="ai-bank-transfer-form">
                    <div className="bank-account-box">
                      <div className="bank-row">
                        <span>Bank:</span>
                        <strong>Commercial Bank of Ceylon</strong>
                      </div>
                      <div className="bank-row">
                        <span>Account Name:</span>
                        <strong>MySpot Sports (Pvt) Ltd</strong>
                      </div>
                      <div className="bank-row">
                        <span>Account Number:</span>
                        <strong>1000 8923 7412</strong>
                      </div>
                      <div className="bank-row">
                        <span>Branch:</span>
                        <strong>Colombo 07</strong>
                      </div>
                    </div>

                    <div className="bank-slip-upload-field">
                      <label>
                        <span>Upload Bank Transfer Slip / Receipt:</span>
                        <span className="required-star">*</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setBankSlipFile(file)
                            if (file.type.startsWith('image/')) {
                              setBankSlipPreview(URL.createObjectURL(file))
                            } else {
                              setBankSlipPreview(null)
                            }
                            setPaymentError('')
                          }
                        }}
                      />
                      {bankSlipFile && (
                        <div className="slip-uploaded-preview">
                          {bankSlipPreview && <img src={bankSlipPreview} alt="Slip Preview" className="slip-thumb" />}
                          <span className="slip-name">📄 {bankSlipFile.name} ({(bankSlipFile.size / 1024).toFixed(0)} KB)</span>
                          <button
                            type="button"
                            className="slip-remove-btn"
                            onClick={() => { setBankSlipFile(null); setBankSlipPreview(null) }}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                      {!bankSlipFile && (
                        <small className="slip-instruction">Please attach a clear photo or PDF of your transfer receipt to confirm</small>
                      )}
                    </div>
                  </div>
                )}

                {paymentError && (
                  <div className="ai-payment-error-alert">
                    ⚠️ {paymentError}
                  </div>
                )}
              </div>

              <div className="summary-actions">
                <button
                  type="button"
                  className="ai-confirm-btn"
                  onClick={handleConfirmBooking}
                  disabled={loading}
                >
                  <span>✓ Validate & Confirm Booking</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Suggestions */}
          {!confirmedBooking && suggestedOptions.length > 0 && (
            <div className="ai-quick-options">
              {suggestedOptions.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  className="ai-option-pill"
                  onClick={() => sendMessage(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Input */}
        {!confirmedBooking && (
          <div className="book-ai-footer">
            <div className="book-ai-input-box">
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  currentStep === 1
                    ? 'e.g., Badminton tomorrow at 7 PM for 2 hours'
                    : currentStep === 2
                    ? 'Enter Name, NIC, or Phone number...'
                    : 'Confirm or request a change...'
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                disabled={loading}
              />
              <button
                type="button"
                className="ai-send-action"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* If Confirmed Success Footer */}
        {confirmedBooking && (
          <div className="book-ai-success-footer">
            <button
              type="button"
              className="ai-primary-action-btn"
              onClick={() => {
                onClose()
                if (onBookingSuccess) onBookingSuccess()
              }}
            >
              View My Bookings & Access Pass
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

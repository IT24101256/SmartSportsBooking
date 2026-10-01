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
  const [status, setStatus] = useState('collecting_requirements')
  const [summary, setSummary] = useState(null)
  const [suggestedOptions, setSuggestedOptions] = useState([])
  const [availableSlots, setAvailableSlots] = useState([])
  const [missingFields, setMissingFields] = useState([])
  const [trajectory, setTrajectory] = useState([])
  const [showTrajectory, setShowTrajectory] = useState(false)
  const [confirmedBooking, setConfirmedBooking] = useState(null)
  const [paymentChoice, setPaymentChoice] = useState('Card')

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
        setStatus(data.status)
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
      } catch (err) {
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
  }, [messages, loading, summary])

  const sendMessage = async (customMessage) => {
    const text = (customMessage || input).trim()
    if (!text || loading || !workflowId) return

    setInput('')
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
      setStatus(data.status)
      setCurrentStep(data.currentStep || 1)
      setSummary(data.summary || null)
      setSuggestedOptions(data.suggestedOptions || [])
      setAvailableSlots(data.availableSlots || [])
      setMissingFields(data.missingFields || [])
      if (data.trajectory) setTrajectory(data.trajectory)

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
        },
      ])
    } catch (err) {
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

  const handleConfirmBooking = async () => {
    if (!workflowId || loading) return

    setLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/ai/booking/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workflowId,
          paymentMethod: paymentChoice,
          cardLastFour: '4242',
        }),
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
    } catch (err) {
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

          {/* Real-Time Live Available Slots Chips */}
          {availableSlots.length > 0 && currentStep === 1 && !confirmedBooking && (
            <div className="ai-slots-selector-card">
              <div className="slots-header">
                <strong>🕒 Available Starting Slots ({availableSlots.length}):</strong>
                <small>Click to select</small>
              </div>
              <div className="slots-chips-grid">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className="ai-slot-chip"
                    onClick={() => sendMessage(`I want slot ${slot}`)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Booking Summary Card (When ready for Step 3 confirmation) */}
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
                <div className="summary-item">
                  <span className="s-label">💳 Payment Method</span>
                  <div className="payment-select-mini">
                    <label>
                      <input
                        type="radio"
                        name="aiPaymentMethod"
                        value="Card"
                        checked={paymentChoice === 'Card'}
                        onChange={(e) => setPaymentChoice(e.target.value)}
                      />
                      <span>Card (Instant)</span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="aiPaymentMethod"
                        value="BankTransfer"
                        checked={paymentChoice === 'BankTransfer'}
                        onChange={(e) => setPaymentChoice(e.target.value)}
                      />
                      <span>Bank Slip</span>
                    </label>
                  </div>
                </div>
                <div className="summary-item total-item">
                  <span className="s-label">💰 Total Amount</span>
                  <strong className="s-total-price">LKR {Number(summary.totalAmount).toLocaleString()}</strong>
                </div>
              </div>

              <div className="summary-actions">
                <button
                  type="button"
                  className="ai-confirm-btn"
                  onClick={handleConfirmBooking}
                  disabled={loading}
                >
                  <span>✓ Confirm & Finalize Booking</span>
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

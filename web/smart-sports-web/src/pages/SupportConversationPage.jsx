import { useEffect, useState, useRef } from 'react'

export default function SupportConversationPage({
  request,
  token,
  currentUser,
  isAdmin,
  apiBaseUrl,
  onBack,
  onStatusChange,
}) {
  const [currentRequest, setCurrentRequest] = useState(request)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    setCurrentRequest(request)
  }, [request])

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load messages
  useEffect(() => {
    if (!currentRequest?.id) return
    setLoading(true)
    fetch(`${apiBaseUrl}/dashboard/support-requests/${currentRequest.id}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error('Messages could not be loaded.'))
      )
      .then((data) => {
        setMessages(data)
        setLoading(false)
      })
      .catch((reason) => {
        setError(reason.message)
        setLoading(false)
      })
  }, [apiBaseUrl, currentRequest?.id, token])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle status transitions
  const handleStatusChange = async (newStatus) => {
    if (!onStatusChange || !currentRequest?.id) return
    setError('')
    try {
      const updated = await onStatusChange(currentRequest, newStatus)
      if (updated) {
        setCurrentRequest(updated)
      }
    } catch (err) {
      setError(err.message || 'Status could not be updated.')
    }
  }

  // Send message
  const sendMessage = async (event) => {
    event?.preventDefault()
    if (!draft.trim() || sending) return

    setSending(true)
    setError('')
    try {
      let activeReq = currentRequest

      // If ticket is Pending and user is Admin or Staff, automatically open it for review first
      // because backend requires Status == "UnderReview" to post messages!
      if (activeReq.status === 'Pending' && isAdmin && onStatusChange) {
        const updated = await onStatusChange(activeReq, 'UnderReview')
        if (updated) {
          activeReq = updated
          setCurrentRequest(updated)
        } else {
          throw new Error('Ticket could not be opened for review.')
        }
      }

      if (activeReq.status !== 'UnderReview') {
        throw new Error('Chat is available once this ticket is opened for review.')
      }

      const response = await fetch(
        `${apiBaseUrl}/dashboard/support-requests/${activeReq.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: draft.trim() }),
        }
      )
      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || 'Message could not be sent.')
      }
      const savedMessage = await response.json()
      setMessages((current) => [...current, savedMessage])
      setDraft('')
    } catch (err) {
      setError(err.message || 'Error sending message')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const currentStatus = currentRequest?.status || 'Pending'
  const statusSlug = String(currentStatus).toLowerCase().replace('underreview', 'under-review')

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return ''
    }
  }

  // Admin can chat even on Pending (since sending auto-opens review) or UnderReview
  const canChat = currentStatus === 'UnderReview' || (currentStatus === 'Pending' && isAdmin)

  return (
    <div className="support-conversation-page-wrapper">
      {/* 1. TOP NAV / BREADCRUMB BAR */}
      <div className="support-conversation-topbar">
        <button
          type="button"
          className="support-back-btn"
          id="back-to-tickets-btn"
          onClick={onBack}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to All Tickets</span>
        </button>

        <div className="support-topbar-actions">
          <span className="support-ticket-pill-id">
            #TKT-{String(currentRequest.id || 0).padStart(4, '0')}
          </span>

          <span className={`support-priority-pill priority-${(currentRequest.priority || 'medium').toLowerCase()}`}>
            {currentRequest.priority || 'Medium'} Priority
          </span>

          <span className={`support-badge badge-${statusSlug}`}>
            <span className={`support-badge-dot ${statusSlug !== 'resolved' ? 'pulse' : ''}`} />
            {currentStatus === 'UnderReview' ? 'Under Review' : currentStatus}
          </span>

          {/* Admin Fast Status Transition Actions in Header */}
          {isAdmin && (currentStatus === 'Pending' || !currentStatus) && onStatusChange && (
            <button
              type="button"
              className="primary-btn support-fast-status-btn btn-open-review-pulse"
              onClick={() => handleStatusChange('UnderReview')}
            >
              ▶ Open for Review & Start Chat
            </button>
          )}

          {isAdmin && currentStatus === 'UnderReview' && onStatusChange && (
            <button
              type="button"
              className="secondary-btn support-fast-status-btn btn-resolve"
              onClick={() => handleStatusChange('Resolved')}
            >
              ✓ Mark Resolved
            </button>
          )}
        </div>
      </div>

      {/* 2. TICKET INQUIRY HERO CARD */}
      <div className="support-inquiry-card">
        <div className="support-inquiry-header">
          <div className="support-inquiry-badge-row">
            <span className="support-inquiry-kicker">SUPPORT INQUIRY DETAILS</span>
            <span className="support-inquiry-date">{formatDate(currentRequest.createdAtUtc || new Date())}</span>
          </div>
          <h1 className="support-inquiry-title">{currentRequest.title}</h1>
        </div>

        <div className="support-inquiry-detail-box">
          <div className="inquiry-quote-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="inquiry-quote-content">
            <span className="inquiry-quote-label">Initial Request Description:</span>
            <p className="inquiry-quote-text">{currentRequest.detail}</p>
          </div>
        </div>

        {/* Dynamic Status Notification Banner */}
        {currentStatus === 'Pending' && (
          <div className="support-status-banner banner-pending">
            <div className="banner-icon">⏳</div>
            <div className="banner-text">
              <strong>Ticket Submitted — Pending Staff Review</strong>
              <p>
                {isAdmin
                  ? 'As an Administrator / Concierge, you can reply directly below to start the conversation, or click "Open for Review Now".'
                  : 'Our facilities operations team reviews new inquiries in real-time. Live messaging will unlock immediately when a concierge opens this ticket for review.'}
              </p>
            </div>
            {isAdmin && onStatusChange && (
              <button
                type="button"
                className="banner-action-btn"
                onClick={() => handleStatusChange('UnderReview')}
              >
                ▶ Open for Review Now
              </button>
            )}
          </div>
        )}

        {currentStatus === 'UnderReview' && (
          <div className="support-status-banner banner-review">
            <div className="banner-icon">💬</div>
            <div className="banner-text">
              <strong>Ticket is Under Active Review — Live Chat Open</strong>
              <p>A member of our facility team is assigned to this ticket. Use the message composer below to chat directly with operations staff.</p>
            </div>
          </div>
        )}

        {currentStatus === 'Resolved' && (
          <div className="support-status-banner banner-resolved">
            <div className="banner-icon">✅</div>
            <div className="banner-text">
              <strong>Ticket Resolved & Completed</strong>
              <p>This inquiry has been verified and resolved by facility management. The conversation log is archived below for your reference.</p>
            </div>
          </div>
        )}
      </div>

      {/* 3. CONVERSATION THREAD CONTAINER */}
      <div className="support-chat-container">
        <div className="support-chat-header">
          <div className="chat-header-title-row">
            <div className="chat-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <div>
              <h2 className="chat-header-title">Official Concierge Thread</h2>
              <span className="chat-header-subtitle">
                {messages.length} {messages.length === 1 ? 'Message' : 'Messages'} exchanged
              </span>
            </div>
          </div>

          <div className="chat-header-status-pill">
            <span className={`live-chat-pulse ${currentStatus !== 'UnderReview' ? 'pulse-paused' : ''}`} />
            <span>{currentStatus === 'UnderReview' ? 'Live Channel' : currentStatus === 'Pending' ? 'Pending Review' : 'Archived'}</span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="support-chat-messages">
          {error && <div className="support-chat-error">{error}</div>}

          {loading ? (
            <div className="support-chat-loading">
              <div className="chat-spinner" />
              <span>Loading messages...</span>
            </div>
          ) : messages.length === 0 && !error ? (
            <div className="support-chat-empty">
              <div className="chat-empty-icon">💬</div>
              <h4>No conversation messages yet</h4>
              <p>
                {isAdmin
                  ? 'Send a message below to start the conversation with the member.'
                  : currentStatus === 'UnderReview'
                  ? 'Send a message below to clarify your request or provide further details to facility staff.'
                  : 'Messages will appear here once staff begins live review.'}
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isCurrentUser =
                Boolean(currentUser?.name && message.senderName?.toLowerCase() === currentUser.name?.toLowerCase()) ||
                Boolean(currentUser?.fullName && message.senderName?.toLowerCase() === currentUser.fullName?.toLowerCase())

              return (
                <div
                  key={message.id}
                  className={`support-message-row ${isCurrentUser ? 'msg-outgoing' : 'msg-incoming'}`}
                >
                  <div className="message-avatar">
                    {(message.senderName || 'U').charAt(0).toUpperCase()}
                  </div>

                  <div className="message-bubble-wrapper">
                    <div className="message-meta-top">
                      <span className="message-sender-name">
                        {isCurrentUser ? 'You' : message.senderName || 'Facility Concierge'}
                      </span>
                      {!isCurrentUser && (
                        <span className="message-staff-badge">Support Staff</span>
                      )}
                      <span className="message-timestamp">
                        {formatTimestamp(message.createdAtUtc)}
                      </span>
                    </div>

                    <div className="message-bubble-content">
                      {message.message}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 4. CHAT COMPOSER OR LOCKED NOTICE */}
        <div className="support-chat-footer">
          {canChat ? (
            <form className="support-chat-composer" onSubmit={sendMessage}>
              {currentStatus === 'Pending' && isAdmin && (
                <div className="admin-composer-banner">
                  <span className="admin-banner-icon">⚡</span>
                  <span>Admin Mode: Replying will automatically open this ticket for review and activate live chat.</span>
                </div>
              )}
              <div className="composer-input-container">
                <input
                  type="text"
                  id="support-message-input"
                  className="composer-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    currentStatus === 'Pending' && isAdmin
                      ? 'Type your reply as Admin/Staff... (Sending automatically opens ticket for review)'
                      : 'Type your reply to facilities support... (Press Enter to send)'
                  }
                  disabled={sending}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  id="support-send-btn"
                  className="composer-send-btn"
                  disabled={!draft.trim() || sending}
                >
                  {sending ? (
                    <span className="send-spinner" />
                  ) : (
                    <>
                      <span>{currentStatus === 'Pending' && isAdmin ? 'Start Chat & Send' : 'Send'}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : currentStatus === 'Resolved' ? (
            <div className="composer-locked-state resolved-state">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>This support inquiry is marked as resolved. Live messaging has concluded.</span>
            </div>
          ) : (
            <div className="composer-locked-state pending-state">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Messaging will be enabled as soon as staff opens this ticket for review.</span>
              {isAdmin && onStatusChange && (
                <button
                  type="button"
                  className="composer-unlock-btn"
                  onClick={() => handleStatusChange('UnderReview')}
                >
                  Open for Review Now
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

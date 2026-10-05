import { useState, useMemo } from 'react'

export default function SupportPage({
  requests = [],
  _currentUser,
  onAddTicket,
  isAdmin,
  onStatusChange,
  onOpenRequest,
}) {
  const [activeTab, setActiveTab] = useState('all') // 'all', 'pending', 'under-review', 'resolved'
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all') // 'all', 'high', 'medium', 'low'

  // Tab counts
  const pendingCount = useMemo(
    () => requests.filter((r) => (r.status || 'Pending').toLowerCase() === 'pending').length,
    [requests]
  )
  const underReviewCount = useMemo(
    () => requests.filter((r) => (r.status || '').toLowerCase() === 'underreview').length,
    [requests]
  )
  const resolvedCount = useMemo(
    () => requests.filter((r) => (r.status || '').toLowerCase() === 'resolved').length,
    [requests]
  )

  const filterTabs = useMemo(() => [
    { id: 'all', label: 'All Tickets', count: requests.length },
    { id: 'pending', label: 'Pending', count: pendingCount, isPending: true },
    { id: 'under-review', label: 'Under Review', count: underReviewCount, isReview: true },
    { id: 'resolved', label: 'Resolved', count: resolvedCount, isResolved: true },
  ], [requests.length, pendingCount, underReviewCount, resolvedCount])

  // Filtered tickets
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const status = (req.status || 'Pending').toLowerCase().replace('underreview', 'under-review')
      
      // Status tab filter
      if (activeTab !== 'all' && status !== activeTab) {
        return false
      }

      // Priority filter
      if (priorityFilter !== 'all' && (req.priority || 'medium').toLowerCase() !== priorityFilter) {
        return false
      }

      // Search query filter (matches title, detail, or ticket id)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase()
        const matchTitle = (req.title || '').toLowerCase().includes(query)
        const matchDetail = (req.detail || '').toLowerCase().includes(query)
        const matchId = String(req.id || '').includes(query) || `tkt-${req.id}`.includes(query)
        if (!matchTitle && !matchDetail && !matchId) {
          return false
        }
      }

      return true
    })
  }, [requests, activeTab, priorityFilter, searchQuery])

  const getStatusBadge = (status = 'Pending') => {
    const s = status.toLowerCase()
    if (s === 'resolved') {
      return (
        <span className="support-badge badge-resolved">
          <span className="support-badge-dot" />
          Resolved
        </span>
      )
    }
    if (s === 'underreview' || s === 'under-review') {
      return (
        <span className="support-badge badge-under-review">
          <span className="support-badge-dot pulse" />
          Under Review
        </span>
      )
    }
    return (
      <span className="support-badge badge-pending">
        <span className="support-badge-dot pulse" />
        Pending Review
      </span>
    )
  }

  const getPriorityPill = (priority = 'Medium') => {
    const p = (priority || 'medium').toLowerCase()
    return (
      <span className={`support-priority-pill priority-${p}`}>
        {priority} Priority
      </span>
    )
  }

  return (
    <div className="support-page-wrapper">
      {/* 1. TEXT-DRIVEN HERO SECTION */}
      <section className="facilities-text-hero support-text-hero">
        <div className="facilities-hero-inner">
          <div className="bookings-hero-top-bar">
            <div className="facilities-hero-badge-pill">
              <span className="hub-pulse-dot" />
              <span className="hub-badge-text">24/7 DEDICATED CONCIERGE & OPERATIONS</span>
              <span className="hub-badge-sep">•</span>
              <span className="hub-badge-status">
                {requests.length} {requests.length === 1 ? 'Active Ticket' : 'Active Tickets'}
              </span>
            </div>

            <button
              className="primary-btn new-booking-cta-btn support-hero-create-btn"
              type="button"
              id="create-support-ticket-btn"
              onClick={onAddTicket}
            >
              + Create Support Ticket
            </button>
          </div>

          <h1 className="facilities-hero-main-title">
            {isAdmin ? (
              <>
                Support Desk <span className="hub-title-highlight">& Facility Operations</span>
              </>
            ) : (
              <>
                Support Center <span className="hub-title-highlight">& Concierge Desk</span>
              </>
            )}
          </h1>

          <p className="facilities-hero-narrative">
            {isAdmin
              ? 'Review member support tickets, lighting adjustment requests, slot reschedule reviews, and communicate directly with players in active conversation threads.'
              : 'Submit inquiries, request reschedule reviews, report court maintenance, or chat directly with facility management regarding your tournament bookings.'}
          </p>
        </div>
      </section>

      {/* 2. FILTER & SEARCH COMMAND BAR */}
      <div className="support-filter-bar" id="support-filter-bar">
        {/* Status segmented chips */}
        <div className="support-status-tabs" role="tablist" aria-label="Filter support tickets by status">
          {filterTabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                id={`support-filter-btn-${tab.id}`}
                className={`support-filter-chip ${isActive ? 'active' : ''} ${
                  tab.isPending ? 'chip-pending' : ''
                } ${tab.isReview ? 'chip-review' : ''} ${tab.isResolved ? 'chip-resolved' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="chip-label">{tab.label}</span>
                <span className="chip-count">({tab.count})</span>
              </button>
            )
          })}
        </div>

        {/* Secondary controls: Search & Priority select */}
        <div className="support-filter-controls">
          <div className="support-search-wrapper">
            <svg
              className="support-search-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              id="support-search-input"
              className="support-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket title, description, or #ID..."
            />
            {searchQuery && (
              <button
                type="button"
                className="support-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="support-priority-select-wrapper">
            <label htmlFor="support-priority-filter" className="support-filter-label">Priority:</label>
            <select
              id="support-priority-filter"
              className="support-priority-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. TICKET CARDS GRID */}
      <div className="support-content-area">
        {filteredRequests.length === 0 ? (
          <div className="support-empty-card">
            <div className="support-empty-icon-circle">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <line x1="9" y1="10" x2="15" y2="10" />
                <line x1="12" y1="7" x2="12" y2="13" />
              </svg>
            </div>
            <h3 className="support-empty-title">
              {requests.length === 0
                ? 'No Support Tickets Found'
                : 'No Matching Tickets'}
            </h3>
            <p className="support-empty-desc">
              {requests.length === 0
                ? 'Our dedicated facilities operations team is ready to help with court maintenance, booking reschedules, and lighting controls.'
                : 'No support requests match your selected filters. Try choosing a different status, clearing the search query, or creating a new ticket.'}
            </p>
            {requests.length === 0 ? (
              <button
                type="button"
                className="primary-btn support-empty-cta"
                onClick={onAddTicket}
              >
                + Create Support Ticket
              </button>
            ) : (
              <button
                type="button"
                className="secondary-btn support-empty-reset"
                onClick={() => {
                  setActiveTab('all')
                  setSearchQuery('')
                  setPriorityFilter('all')
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="support-tickets-grid">
            {filteredRequests.map((item) => {
              const statusSlug = (item.status || 'Pending').toLowerCase().replace('underreview', 'under-review')
              return (
                <div
                  key={item.id ?? item.title}
                  id={`ticket-card-${item.id}`}
                  className={`support-ticket-card status-card-${statusSlug}`}
                  onClick={() => onOpenRequest(item)}
                >
                  {/* Card Header */}
                  <div className="support-card-header">
                    <div className="support-card-id-row">
                      <span className="support-card-id">
                        #TKT-{String(item.id || 0).padStart(4, '0')}
                      </span>
                      {getPriorityPill(item.priority)}
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  {/* Card Body */}
                  <div className="support-card-body">
                    <h3 className="support-card-title">{item.title}</h3>
                    <p className="support-card-detail">{item.detail}</p>
                  </div>

                  {/* Card Metadata / State Bar */}
                  <div className="support-card-context-row">
                    {item.status === 'UnderReview' ? (
                      <div className="support-context-badge context-live">
                        <span className="live-chat-pulse" />
                        <span>Live Chat Active</span>
                      </div>
                    ) : item.status === 'Resolved' ? (
                      <div className="support-context-badge context-resolved">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Ticket Resolved</span>
                      </div>
                    ) : (
                      <div className="support-context-badge context-pending">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>Awaiting Staff Review</span>
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="support-card-footer" onClick={(e) => e.stopPropagation()}>
                    <div className="support-admin-actions">
                      {isAdmin && (item.status === 'Pending' || !item.status) && (
                        <>
                          <button
                            className="support-mini-action-btn btn-open-review"
                            type="button"
                            title="Open ticket for staff review"
                            onClick={() => onStatusChange(item, 'UnderReview')}
                          >
                            Open Review
                          </button>
                          <button
                            className="support-mini-action-btn btn-open-and-chat"
                            type="button"
                            title="Open review and start chatting immediately"
                            onClick={async () => {
                              const updated = await onStatusChange(item, 'UnderReview')
                              onOpenRequest(updated || { ...item, status: 'UnderReview' })
                            }}
                          >
                            Chat Now →
                          </button>
                        </>
                      )}
                      {isAdmin && item.status === 'UnderReview' && (
                        <button
                          className="support-mini-action-btn btn-mark-resolved"
                          type="button"
                          title="Mark ticket as resolved"
                          onClick={() => onStatusChange(item, 'Resolved')}
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>

                    <button
                      className="support-open-thread-btn"
                      type="button"
                      onClick={() => onOpenRequest(item)}
                    >
                      <span>View Ticket & Chat</span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

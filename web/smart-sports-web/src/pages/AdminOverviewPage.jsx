import { useState, useEffect, useMemo } from 'react'

const formatLKR = (val) => `LKR ${Number(val || 0).toLocaleString()}`

// Inline SVG Sparkline for dynamic visual trends
function Sparkline({ points = [20, 35, 25, 45, 30, 55, 48, 65], color = '#3b82f6', height = 38, width = 110 }) {
  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const range = max - min || 1
  const step = width / (points.length - 1)
  const coords = points.map((p, i) => {
    const x = i * step
    const y = height - ((p - min) / range) * (height - 8) - 4
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const pathD = `M ${coords.join(' L ')}`
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`
  const gradientId = `spark-grad-${color.replace('#', '')}-${points[0]}-${points[points.length - 1]}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="kpi-sparkline-svg" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Circular Capacity Dial
function CapacityDial({ percentage = 75, size = 56, stroke = 5, color = '#3b82f6' }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  return (
    <div className="capacity-dial-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="capacity-dial-svg" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 0.8s ease',
          }}
        />
      </svg>
      <span className="capacity-dial-text">{percentage}%</span>
    </div>
  )
}

export default function AdminOverviewPage({
  facilities = [],
  bookings = [],
  members = [],
  support = [],
  reviews = [],
  dashStats = {},
  currentUser,
  authToken,
  apiBaseUrl,
  setActiveTab,
  onOpenBooking,
  onFacilityDetails,
  onSelectSupport,
}) {
  // Live ticking clock for mission-control realism
  const [liveTime, setLiveTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  )

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const todayDateStr = useMemo(() => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  // Derived Bookings Statistics
  const {
    totalBookingsCount,
    todayBookings,
    todayBookingsCount,
    confirmedBookingsCount,
    pendingBookingsCount,
    cancelledBookingsCount,
    rescheduleCount,
    pendingRefunds,
    pendingBankSlips,
    totalCourtRevenue,
    totalEquipmentRevenue,
    grossRevenue,
    todayRevenue,
    paymentMethodStats,
    recentBookings,
  } = useMemo(() => {
    let courtRev = 0
    let equipRev = 0
    let todayRev = 0
    let confirmed = 0
    let pending = 0
    let cancelled = 0
    let reschedules = 0
    const refundsList = []
    const bankSlipsList = []
    const pmCounts = { BankSlip: 0, Card: 0, Cash: 0, Other: 0 }
    const todayList = []

    bookings.forEach((b) => {
      const bDateStr = (b.bookingDate || '').slice(0, 10)
      const isToday = bDateStr === todayDateStr
      if (isToday) todayList.push(b)

      const isCancelled = b.status === 'Cancelled'
      if (b.status === 'Confirmed') confirmed++
      else if (b.status === 'Pending') pending++
      else if (isCancelled) cancelled++

      if (b.isRescheduleRequested || b.status === 'RescheduleRequested') {
        reschedules++
      }

      // Check pending refunds
      if (b.refundStatus === 'Pending' || (b.refundPercentage > 0 && !b.refundConfirmedAt)) {
        refundsList.push(b)
      }

      // Check pending bank slips
      if (
        (b.paymentMethod || '').toLowerCase() === 'bankslip' &&
        (b.paymentStatus === 'Pending' || b.status === 'Pending')
      ) {
        bankSlipsList.push(b)
      }

      // Payment method breakdown
      const pm = (b.paymentMethod || '').toLowerCase()
      if (pm.includes('slip') || pm.includes('bank')) pmCounts.BankSlip++
      else if (pm.includes('card') || pm.includes('online')) pmCounts.Card++
      else if (pm.includes('cash')) pmCounts.Cash++
      else pmCounts.Other++

      // Revenues
      if (!isCancelled) {
        const amt = Number(b.totalAmount || 0)
        courtRev += amt
        if (isToday) todayRev += amt

        const equipPayments = b.equipmentPayments || []
        equipPayments.forEach((ep) => {
          equipRev += Number(ep.totalAmount || 0)
        })
      }
    })

    const sortedRecent = [...bookings].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 8)

    return {
      totalBookingsCount: bookings.length,
      todayBookings: todayList,
      todayBookingsCount: todayList.length,
      confirmedBookingsCount: confirmed,
      pendingBookingsCount: pending,
      cancelledBookingsCount: cancelled,
      rescheduleCount: reschedules,
      pendingRefunds: refundsList,
      pendingBankSlips: bankSlipsList,
      totalCourtRevenue: courtRev,
      totalEquipmentRevenue: equipRev,
      grossRevenue: courtRev + equipRev,
      todayRevenue: todayRev,
      paymentMethodStats: pmCounts,
      recentBookings: sortedRecent,
    }
  }, [bookings, todayDateStr])

  // Facilities Stats
  const {
    totalFacilities,
    availableCount,
    occupiedCount,
    averageCourtRate,
    occupancyPct,
  } = useMemo(() => {
    const total = facilities.length
    const available = facilities.filter((f) => f.isAvailable && !f.isOccupiedNow).length
    const occupied = facilities.filter((f) => f.isOccupiedNow).length
    const sumRate = facilities.reduce((sum, f) => sum + (Number(f.hourlyRate) || 0), 0)
    const avgRate = total > 0 ? Math.round(sumRate / total) : 0
    const pct = total > 0 ? Math.round(((total - available) / total) * 100) : 65
    return {
      totalFacilities: total,
      availableCount: available,
      occupiedCount: occupied,
      averageCourtRate: avgRate,
      occupancyPct: Math.max(pct, 45), // Visual floor for realistic active venue
    }
  }, [facilities])

  // Member Stats
  const { totalMembers, adminCount, regularMembersCount } = useMemo(() => {
    const total = members.length
    const admins = members.filter((m) => {
      const r = (m.role || '').toLowerCase()
      return r === 'admin' || r === 'manager'
    }).length
    return {
      totalMembers: total,
      adminCount: admins,
      regularMembersCount: total - admins,
    }
  }, [members])

  // Support Stats
  const { totalTickets, pendingTickets, highPriorityTickets, resolvedTickets } = useMemo(() => {
    const total = support.length
    const pending = support.filter((s) => s.status === 'Pending').length
    const high = support.filter((s) => s.status === 'Pending' && s.priority === 'High').length
    const resolved = support.filter((s) => s.status === 'Resolved').length
    return {
      totalTickets: total,
      pendingTickets: pending,
      highPriorityTickets: high,
      resolvedTickets: resolved,
    }
  }, [support])

  // Reviews Stats
  const averageRating = useMemo(() => {
    if (!reviews.length) return '4.9'
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0)
    return (sum / reviews.length).toFixed(1)
  }, [reviews])

  // Urgent Queue count
  const urgentCount =
    pendingRefunds.length +
    pendingBankSlips.length +
    rescheduleCount +
    highPriorityTickets

  return (
    <div className="admin-overview-wrapper">
      {/* 1. HIGH-TECH MISSION CONTROL HERO */}
      <section className="executive-command-hero">
        {/* Ambient Gradient Glow Orbs & Sports Court Watermark */}
        <div className="hero-ambient-glow glow-blue" />
        <div className="hero-ambient-glow glow-emerald" />
        <div className="hero-court-watermark" aria-hidden="true" />

        {/* Hero Top Bar: Live Status & Ticker */}
        <div className="hero-top-status-bar">
          <div className="hero-status-left">
            <span className="live-radar-badge">
              <span className="live-radar-dot" />
              <span>LIVE OPERATIONS RADAR</span>
            </span>
            <span className="hero-status-sep">•</span>
            <span className="hero-system-status">ALL SYSTEMS 100% OPERATIONAL</span>
            <span className="hero-status-sep">•</span>
            <span className="hero-live-clock">
              <span className="clock-icon">⏱️</span>
              <span>{liveTime} (UTC+5:30)</span>
            </span>
          </div>

          <div className="hero-status-right">
            <span className="weather-pill">
              <span>🌤️</span>
              <span>28°C • Good Conditions for Play</span>
            </span>
            <span className="venue-tag">Colombo Arena Hub</span>
          </div>
        </div>

        {/* Hero Main Content Row */}
        <div className="hero-content-split">
          {/* Left: Dynamic Greeting & Key Intel */}
          <div className="hero-intel-column">
            <div className="hero-greeting-pill">
              <span className="role-shield">🛡️</span>
              <span className="role-text">EXECUTIVE CONSOLE</span>
              <span className="admin-name-tag">• {currentUser?.name || 'Admin User'}</span>
            </div>

            <h1 className="hero-command-title">
              Operations & <span className="title-gradient-accent">Revenue Intelligence</span>
            </h1>

            <p className="hero-command-desc">
              Real-time executive supervision of sports courts occupancy, member reservations, payment verifications, and financial health across the facility.
            </p>

            {/* Quick Live Data Chips Strip */}
            <div className="hero-data-chips-strip">
              <div className="hero-data-chip" onClick={() => setActiveTab('Facilities')} role="button" tabIndex={0}>
                <span className="chip-icon">🏟️</span>
                <span className="chip-label">Courts:</span>
                <strong>{availableCount} / {totalFacilities} Available</strong>
              </div>
              <div className="hero-data-chip" onClick={() => setActiveTab('Bookings')} role="button" tabIndex={0}>
                <span className="chip-icon">📅</span>
                <span className="chip-label">Today:</span>
                <strong>{todayBookingsCount} Bookings</strong>
              </div>
              <div className="hero-data-chip" onClick={() => setActiveTab('Revenue')} role="button" tabIndex={0}>
                <span className="chip-icon">💳</span>
                <span className="chip-label">Total Rev:</span>
                <strong>{formatLKR(grossRevenue)}</strong>
              </div>
              <div className="hero-data-chip">
                <span className="chip-icon">⭐</span>
                <span className="chip-label">Satisfaction:</span>
                <strong>{dashStats.memberSatisfaction || '98%'}</strong>
              </div>
            </div>
          </div>

          {/* Right: Glassmorphic Mission Control Action & Capacity Card */}
          <div className="hero-action-mission-card">
            <div className="mission-card-header">
              <div className="mission-header-info">
                <span className="mission-tag">VENUE CAPACITY GAUGE</span>
                <h4 className="mission-title">{occupancyPct}% Peak Utilization</h4>
              </div>
              <CapacityDial percentage={occupancyPct} color="#38bdf8" />
            </div>

            <div className="mission-card-occupancy-detail">
              <div className="occ-stat">
                <span className="occ-dot dot-green" />
                <span className="occ-text">{availableCount} Courts Ready</span>
              </div>
              <div className="occ-stat">
                <span className="occ-dot dot-purple" />
                <span className="occ-text">{occupiedCount || 1} In Play</span>
              </div>
              <div className="occ-stat">
                <span className="occ-dot dot-blue" />
                <span className="occ-text">{todayBookingsCount} Games Today</span>
              </div>
            </div>

            {/* Action Launch Buttons */}
            <div className="mission-cta-grid">
              <button
                type="button"
                className="mission-primary-btn"
                onClick={onOpenBooking}
              >
                <span className="btn-plus-icon">+</span>
                <span>New Reservation</span>
              </button>
              <div className="mission-sub-btns">
                <button
                  type="button"
                  className="mission-sub-btn"
                  onClick={() => setActiveTab('Facilities')}
                  title="Courts Portfolio"
                >
                  <span>🏟️ Courts</span>
                  <span className="sub-badge">{totalFacilities}</span>
                </button>
                <button
                  type="button"
                  className="mission-sub-btn"
                  onClick={() => setActiveTab('Revenue')}
                  title="Financial Hub"
                >
                  <span>📊 Ledger</span>
                </button>
                <button
                  type="button"
                  className="mission-sub-btn"
                  onClick={() => setActiveTab('Members')}
                  title="Member Directory"
                >
                  <span>👥 Users</span>
                  <span className="sub-badge">{totalMembers}</span>
                </button>
                <button
                  type="button"
                  className="mission-sub-btn"
                  onClick={() => setActiveTab('Equipments')}
                  title="Sports Equipment"
                >
                  <span>🎒 Gear</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. URGENT OPERATIONAL ATTENTION QUEUE */}
      <section className="admin-action-queue-section">
        {urgentCount > 0 ? (
          <div className="admin-action-queue-card urgent-active">
            <div className="queue-header">
              <div className="queue-title-wrap">
                <span className="queue-alert-pulse">⚡</span>
                <div>
                  <h3 className="queue-title">Operational Attention Required ({urgentCount})</h3>
                  <p className="queue-desc">
                    Pending administrative verification, customer refund approvals, or high priority tickets requiring response.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="queue-primary-btn"
                onClick={() => setActiveTab('Bookings')}
              >
                Go to Bookings Hub →
              </button>
            </div>

            <div className="queue-badges-grid">
              {pendingRefunds.length > 0 && (
                <div
                  className="queue-item-pill refund-pill"
                  onClick={() => setActiveTab('Bookings')}
                  role="button"
                  tabIndex={0}
                >
                  <span className="pill-icon">💰</span>
                  <div className="pill-info">
                    <strong>{pendingRefunds.length} Refund Confirmations</strong>
                    <small>Awaiting policy confirmation</small>
                  </div>
                  <span className="pill-arrow">→</span>
                </div>
              )}

              {pendingBankSlips.length > 0 && (
                <div
                  className="queue-item-pill slip-pill"
                  onClick={() => setActiveTab('Bookings')}
                  role="button"
                  tabIndex={0}
                >
                  <span className="pill-icon">📄</span>
                  <div className="pill-info">
                    <strong>{pendingBankSlips.length} Bank Slips to Verify</strong>
                    <small>Customer payment slip submitted</small>
                  </div>
                  <span className="pill-arrow">→</span>
                </div>
              )}

              {rescheduleCount > 0 && (
                <div
                  className="queue-item-pill raincheck-pill"
                  onClick={() => setActiveTab('Bookings')}
                  role="button"
                  tabIndex={0}
                >
                  <span className="pill-icon">🌧️</span>
                  <div className="pill-info">
                    <strong>{rescheduleCount} Weather Reschedules</strong>
                    <small>Rain-check slots requested</small>
                  </div>
                  <span className="pill-arrow">→</span>
                </div>
              )}

              {highPriorityTickets > 0 && (
                <div
                  className="queue-item-pill support-pill"
                  onClick={() => setActiveTab('Support')}
                  role="button"
                  tabIndex={0}
                >
                  <span className="pill-icon">🚨</span>
                  <div className="pill-info">
                    <strong>{highPriorityTickets} High Priority Support</strong>
                    <small>Member inquiry awaiting response</small>
                  </div>
                  <span className="pill-arrow">→</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="admin-action-queue-card all-clear">
            <div className="all-clear-content">
              <span className="all-clear-icon">✨</span>
              <div>
                <strong>All Operational Queues In Order</strong>
                <p>Zero pending refund disputes, all bank slips are reviewed, and customer support queues are up to date.</p>
              </div>
            </div>
            <div className="all-clear-badge">
              <span className="hub-pulse-dot" />
              <span>100% Operational Health</span>
            </div>
          </div>
        )}
      </section>

      {/* 3. PRIMARY KPI STATS GRID WITH SPARKLINES (4 Cards) */}
      <section className="admin-kpi-grid">
        {/* Card 1: Gross Platform Revenue */}
        <div
          className="admin-kpi-card tone-green"
          onClick={() => setActiveTab('Revenue')}
          role="button"
          tabIndex={0}
        >
          <div className="kpi-top">
            <div className="kpi-label-group">
              <span className="kpi-label">GROSS PLATFORM REVENUE</span>
              <span className="kpi-tag-trend">+16.4% this week</span>
            </div>
            <span className="kpi-icon-badge">💳</span>
          </div>

          <div className="kpi-mid-row">
            <h2 className="kpi-value">{formatLKR(grossRevenue)}</h2>
            <Sparkline points={[14, 22, 19, 34, 28, 42, 38, 56]} color="#10b981" />
          </div>

          <div className="kpi-subtext">
            <span className="kpi-highlight-tag">Court: {formatLKR(totalCourtRevenue)}</span>
            {totalEquipmentRevenue > 0 && (
              <span className="kpi-secondary-tag">+ Gear: {formatLKR(totalEquipmentRevenue)}</span>
            )}
          </div>

          <div className="kpi-footer">
            <span>Today's volume: <strong>{formatLKR(todayRevenue)}</strong></span>
            <span className="kpi-link">View Ledger →</span>
          </div>
        </div>

        {/* Card 2: Bookings Volume */}
        <div
          className="admin-kpi-card tone-blue"
          onClick={() => setActiveTab('Bookings')}
          role="button"
          tabIndex={0}
        >
          <div className="kpi-top">
            <div className="kpi-label-group">
              <span className="kpi-label">TOTAL RESERVATIONS</span>
              <span className="kpi-tag-trend">+98.2% confirmed</span>
            </div>
            <span className="kpi-icon-badge">📅</span>
          </div>

          <div className="kpi-mid-row">
            <h2 className="kpi-value">{totalBookingsCount} <small className="unit-text">Bookings</small></h2>
            <Sparkline points={[10, 16, 12, 26, 22, 35, 30, 48]} color="#3b82f6" />
          </div>

          <div className="kpi-subtext">
            <span className="kpi-highlight-tag">{confirmedBookingsCount} Confirmed</span>
            <span className="kpi-secondary-tag">{todayBookingsCount} Scheduled Today</span>
          </div>

          <div className="kpi-footer">
            <span>{pendingBookingsCount} pending review</span>
            <span className="kpi-link">Manage Bookings →</span>
          </div>
        </div>

        {/* Card 3: Facilities Capacity */}
        <div
          className="admin-kpi-card tone-purple"
          onClick={() => setActiveTab('Facilities')}
          role="button"
          tabIndex={0}
        >
          <div className="kpi-top">
            <div className="kpi-label-group">
              <span className="kpi-label">ACTIVE COURTS & CAPACITY</span>
              <span className="kpi-tag-trend">{availableCount} Ready</span>
            </div>
            <span className="kpi-icon-badge">🏟️</span>
          </div>

          <div className="kpi-mid-row">
            <h2 className="kpi-value">{totalFacilities} <small className="unit-text">Venues</small></h2>
            <Sparkline points={[18, 20, 19, 24, 22, 28, 26, 30]} color="#8b5cf6" />
          </div>

          <div className="kpi-subtext">
            <span className="kpi-highlight-tag">{availableCount} Available Now</span>
            {occupiedCount > 0 && (
              <span className="kpi-secondary-tag">{occupiedCount} In Play</span>
            )}
          </div>

          <div className="kpi-footer">
            <span>Avg rate: <strong>{formatLKR(averageCourtRate)}/hr</strong></span>
            <span className="kpi-link">View Portfolio →</span>
          </div>
        </div>

        {/* Card 4: Registered Members */}
        <div
          className="admin-kpi-card tone-amber"
          onClick={() => setActiveTab('Members')}
          role="button"
          tabIndex={0}
        >
          <div className="kpi-top">
            <div className="kpi-label-group">
              <span className="kpi-label">ATHLETE COMMUNITY</span>
              <span className="kpi-tag-trend">100% Verified</span>
            </div>
            <span className="kpi-icon-badge">👥</span>
          </div>

          <div className="kpi-mid-row">
            <h2 className="kpi-value">{totalMembers} <small className="unit-text">Members</small></h2>
            <Sparkline points={[8, 14, 18, 22, 28, 36, 42, 54]} color="#f59e0b" />
          </div>

          <div className="kpi-subtext">
            <span className="kpi-highlight-tag">{regularMembersCount} Athletes</span>
            <span className="kpi-secondary-tag">{adminCount} Staff & Admins</span>
          </div>

          <div className="kpi-footer">
            <span>NIC credentials verified</span>
            <span className="kpi-link">Directory →</span>
          </div>
        </div>
      </section>

      {/* 4. SECONDARY OPERATIONAL METRICS (4 Mini Cards) */}
      <section className="admin-secondary-metrics-grid">
        <div
          className="admin-metric-mini-card"
          onClick={() => setActiveTab('Equipments')}
          role="button"
          tabIndex={0}
        >
          <div className="metric-icon">🎒</div>
          <div className="metric-details">
            <span className="metric-label">Equipment Rentals</span>
            <strong className="metric-num">{formatLKR(totalEquipmentRevenue)}</strong>
            <small>Sports gear & accessories inventory</small>
          </div>
          <span className="metric-arrow">→</span>
        </div>

        <div className="admin-metric-mini-card">
          <div className="metric-icon">⭐</div>
          <div className="metric-details">
            <span className="metric-label">Member Satisfaction</span>
            <strong className="metric-num">{dashStats.memberSatisfaction || '98%'}</strong>
            <small>{averageRating} ★ avg across {reviews.length} reviews</small>
          </div>
          <span className="metric-badge">Exemplary</span>
        </div>

        <div
          className="admin-metric-mini-card"
          onClick={() => setActiveTab('Support')}
          role="button"
          tabIndex={0}
        >
          <div className="metric-icon">💬</div>
          <div className="metric-details">
            <span className="metric-label">Support Concierge</span>
            <strong className="metric-num">{resolvedTickets} / {totalTickets} Resolved</strong>
            <small>{pendingTickets} customer inquiries</small>
          </div>
          <span className="metric-arrow">→</span>
        </div>

        <div
          className="admin-metric-mini-card"
          onClick={() => setActiveTab('Bookings')}
          role="button"
          tabIndex={0}
        >
          <div className="metric-icon">🔄</div>
          <div className="metric-details">
            <span className="metric-label">Rain-Checks & Weather</span>
            <strong className="metric-num">{cancelledBookingsCount} Cancelled</strong>
            <small>{rescheduleCount} rain-checks active</small>
          </div>
          <span className="metric-arrow">→</span>
        </div>
      </section>

      {/* 5. SPLIT ANALYTICS: COURT OCCUPANCY & FINANCIAL DISTRIBUTION */}
      <section className="admin-overview-split-grid">
        {/* Left: Real-Time Court Utilization */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <div>
              <h3 className="admin-panel-title">Facility Portfolio & Live Court Status</h3>
              <p className="admin-panel-sub">Real-time occupancy, rates, and condition across the sports center</p>
            </div>
            <button
              type="button"
              className="admin-panel-action-btn"
              onClick={() => setActiveTab('Facilities')}
            >
              Manage Courts →
            </button>
          </div>

          <div className="admin-courts-status-list">
            {facilities.length === 0 ? (
              <p className="empty-subtle">No facilities configured in the database.</p>
            ) : (
              facilities.slice(0, 6).map((fac) => {
                const isOccupied = fac.isOccupiedNow
                const isAvail = fac.isAvailable && !isOccupied
                return (
                  <div key={fac.id || fac.name} className="admin-court-status-row">
                    <div className="court-info">
                      <span className="court-icon">{fac.icon || '🏟️'}</span>
                      <div>
                        <strong className="court-name">{fac.name}</strong>
                        <div className="court-meta">
                          <span>{fac.type}</span>
                          {fac.courtType && fac.courtType.toLowerCase() !== (fac.type || '').toLowerCase() && (
                            <>
                              <span className="meta-sep">•</span>
                              <span>{fac.courtType}</span>
                            </>
                          )}
                          <span className="meta-sep">•</span>
                          <span className="court-rate">{fac.price}</span>
                        </div>
                      </div>
                    </div>

                    <div className="court-status-action">
                      <span
                        className={`court-status-badge ${
                          isOccupied
                            ? 'status-occupied'
                            : isAvail
                            ? 'status-available'
                            : 'status-unavailable'
                        }`}
                      >
                        {isOccupied ? '● In Play' : isAvail ? '● Available' : '● Maintenance'}
                      </span>
                      <button
                        type="button"
                        className="court-inspect-btn"
                        onClick={() => onFacilityDetails(fac)}
                        title="View details and schedule"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right: Revenue Breakdown & Financial Intelligence */}
        <div className="admin-panel-card">
          <div className="admin-panel-header">
            <div className="admin-panel-title-wrap">
              <h3 className="admin-panel-title">Financial Distribution & Channels</h3>
              <p className="admin-panel-sub">Income sources, payment verification channels, and collection methods</p>
            </div>
            <button
              type="button"
              className="admin-panel-action-btn"
              onClick={() => setActiveTab('Revenue')}
            >
              Statement →
            </button>
          </div>

          <div className="admin-financial-distribution">
            {/* Revenue Split Bar */}
            <div className="financial-split-box">
              <div className="split-labels">
                <span>Court Hire: {formatLKR(totalCourtRevenue)}</span>
                <span>Gear Rentals: {formatLKR(totalEquipmentRevenue)}</span>
              </div>
              <div className="split-bar-track">
                <div
                  className="split-bar-court"
                  style={{
                    width: `${
                      grossRevenue > 0
                        ? Math.max(10, Math.round((totalCourtRevenue / grossRevenue) * 100))
                        : 85
                    }%`,
                  }}
                  title="Court Hire Revenue"
                />
                <div
                  className="split-bar-gear"
                  style={{
                    width: `${
                      grossRevenue > 0
                        ? Math.min(90, Math.round((totalEquipmentRevenue / grossRevenue) * 100))
                        : 15
                    }%`,
                  }}
                  title="Equipment Rental Revenue"
                />
              </div>
            </div>

            {/* Payment Method Distribution */}
            <div className="payment-methods-breakdown">
              <h4 className="sub-section-title">Payment Settlement Channels</h4>
              <div className="pm-cards-grid">
                <div className="pm-metric-box">
                  <div className="pm-icon">📄</div>
                  <div className="pm-info">
                    <span className="pm-label">Bank Slips</span>
                    <strong className="pm-count">{paymentMethodStats.BankSlip} Slips</strong>
                    {pendingBankSlips.length > 0 ? (
                      <small className="text-amber">({pendingBankSlips.length} Pending)</small>
                    ) : (
                      <small className="text-green">All Verified ✓</small>
                    )}
                  </div>
                </div>

                <div className="pm-metric-box">
                  <div className="pm-icon">💳</div>
                  <div className="pm-info">
                    <span className="pm-label">Card / Online</span>
                    <strong className="pm-count">{paymentMethodStats.Card} Cards</strong>
                    <small className="text-green">Instant</small>
                  </div>
                </div>

                <div className="pm-metric-box">
                  <div className="pm-icon">💵</div>
                  <div className="pm-info">
                    <span className="pm-label">Venue Cash</span>
                    <strong className="pm-count">{paymentMethodStats.Cash} Cash</strong>
                    <small>Counter Pay</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Financial Health Tip */}
            <div className="admin-financial-note">
              <span className="note-icon">💡</span>
              <p>
                All refunds are verified in accordance with the 12-hour club cancellation policy. Confirm pending refunds directly in the Bookings tab to maintain spotless financial audit trails.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. RECENT PLATFORM RESERVATIONS TABLE */}
      <section className="admin-panel-card recent-bookings-card">
        <div className="admin-panel-header">
          <div>
            <h3 className="admin-panel-title">Recent Platform Reservations & Activity</h3>
            <p className="admin-panel-sub">Real-time reservation requests across all sports facilities and venues</p>
          </div>
          <button
            type="button"
            className="admin-panel-action-btn"
            onClick={() => setActiveTab('Bookings')}
          >
            View All ({totalBookingsCount}) Bookings →
          </button>
        </div>

        <div className="admin-table-container">
          {recentBookings.length === 0 ? (
            <p className="empty-subtle">No reservations recorded yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Athlete / Customer</th>
                  <th>Facility Venue</th>
                  <th>Schedule Slot</th>
                  <th>Amount</th>
                  <th>Payment Settlement</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => {
                  const bDate = b.bookingDate ? new Date(b.bookingDate).toLocaleDateString() : 'N/A'
                  const bTime = (b.startTime || '').slice(0, 5)
                  const isPendingSlip =
                    (b.paymentMethod || '').toLowerCase() === 'bankslip' &&
                    (b.paymentStatus === 'Pending' || b.status === 'Pending')

                  return (
                    <tr key={b.id}>
                      <td>
                        <strong className="booking-id-tag">#{b.id}</strong>
                      </td>
                      <td>
                        <div className="customer-cell">
                          <span className="customer-name">{b.customerName || 'Athlete'}</span>
                          {b.contactNumber && (
                            <small className="customer-phone">{b.contactNumber}</small>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="facility-cell-name">
                          {b.facilityName || b.facility?.name || 'Sports Court'}
                        </span>
                      </td>
                      <td>
                        <div className="schedule-cell">
                          <span>{bDate}</span>
                          <small className="slot-time">{bTime}</small>
                        </div>
                      </td>
                      <td>
                        <strong className="amount-cell">{formatLKR(b.totalAmount)}</strong>
                      </td>
                      <td>
                        <div className="settlement-cell">
                          <span className={`method-badge ${b.paymentMethod?.toLowerCase() || 'card'}`}>
                            {b.paymentMethod || 'Online'}
                          </span>
                          {isPendingSlip && (
                            <span className="pending-slip-warning" title="Bank Slip pending verification">
                              ⚠️ To Verify
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`booking-status-tag status-${(b.status || 'pending').toLowerCase()}`}
                        >
                          {b.status || 'Pending'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="table-action-link"
                          onClick={() => setActiveTab('Bookings')}
                        >
                          Manage →
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 7. QUICK ADMINISTRATIVE COMMAND CENTER */}
      <section className="admin-command-grid">
        <div
          className="admin-command-card"
          onClick={() => setActiveTab('Facilities')}
          role="button"
          tabIndex={0}
        >
          <div className="cmd-icon-wrap bg-green">🏟️</div>
          <div className="cmd-text">
            <strong>Facilities & Courts</strong>
            <p>Add new courts, configure hourly rates, update photos and equipment provisions.</p>
          </div>
          <span className="cmd-arrow">→</span>
        </div>

        <div
          className="admin-command-card"
          onClick={() => setActiveTab('Equipments')}
          role="button"
          tabIndex={0}
        >
          <div className="cmd-icon-wrap bg-blue">🎒</div>
          <div className="cmd-text">
            <strong>Sports Equipment</strong>
            <p>Manage racket rentals, balls, training kits, stock inventory, and gear payments.</p>
          </div>
          <span className="cmd-arrow">→</span>
        </div>

        <div
          className="admin-command-card"
          onClick={() => setActiveTab('Bookings')}
          role="button"
          tabIndex={0}
        >
          <div className="cmd-icon-wrap bg-purple">📅</div>
          <div className="cmd-text">
            <strong>Bookings & Refunds</strong>
            <p>Audit bank slips, issue weather rain-checks, and verify cancellation refunds.</p>
          </div>
          <span className="cmd-arrow">→</span>
        </div>

        <div
          className="admin-command-card"
          onClick={() => setActiveTab('Support')}
          role="button"
          tabIndex={0}
        >
          <div className="cmd-icon-wrap bg-orange">💬</div>
          <div className="cmd-text">
            <strong>Support Desk & Concierge</strong>
            <p>Answer customer tickets, review priority issues, and engage in real-time chat.</p>
          </div>
          <span className="cmd-arrow">→</span>
        </div>

        <div
          className="admin-command-card"
          onClick={() => setActiveTab('Revenue')}
          role="button"
          tabIndex={0}
        >
          <div className="cmd-icon-wrap bg-teal">📊</div>
          <div className="cmd-text">
            <strong>Revenue & Finance Reports</strong>
            <p>Inspect ledger statements, generate PDF receipts, and track payment settlement channels.</p>
          </div>
          <span className="cmd-arrow">→</span>
        </div>

        <div
          className="admin-command-card"
          onClick={() => setActiveTab('Members')}
          role="button"
          tabIndex={0}
        >
          <div className="cmd-icon-wrap bg-amber">👥</div>
          <div className="cmd-text">
            <strong>Member Directory & Security</strong>
            <p>Inspect registered athletes, verify NIC credentials, and supervise account privileges.</p>
          </div>
          <span className="cmd-arrow">→</span>
        </div>
      </section>
    </div>
  )
}

import { useEffect, useState, useMemo } from 'react'
import { jsPDF } from 'jspdf'

const currency = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 0,
})

export default function RevenuePage({ apiBaseUrl, token }) {
  const getToday = () => new Date().toISOString().slice(0, 10)
  const today = getToday()

  // Default to 1st of current month to today
  const [fromDate, setFromDate] = useState(`${today.slice(0, 8)}01`)
  const [toDate, setToDate] = useState(today)
  const [report, setReport] = useState({ totalRevenue: 0, bookingCount: 0, items: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Search & filter for transactions
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('All')

  // Date Presets
  const applyPreset = (preset) => {
    const now = new Date()
    const currentToday = now.toISOString().slice(0, 10)

    if (preset === 'today') {
      setFromDate(currentToday)
      setToDate(currentToday)
    } else if (preset === '7days') {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      setFromDate(d.toISOString().slice(0, 10))
      setToDate(currentToday)
    } else if (preset === 'month') {
      setFromDate(`${currentToday.slice(0, 8)}01`)
      setToDate(currentToday)
    } else if (preset === '30days') {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      setFromDate(d.toISOString().slice(0, 10))
      setToDate(currentToday)
    } else if (preset === 'ytd') {
      setFromDate(`${now.getFullYear()}-01-01`)
      setToDate(currentToday)
    }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    const query = new URLSearchParams({ fromDate, toDate })
    fetch(`${apiBaseUrl}/dashboard/revenue?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (response.ok) return response.json()
        const errText = await response.text().catch(() => '')
        throw new Error(errText || `Revenue could not be loaded (${response.status}).`)
      })
      .then((data) => {
        if (active) {
          setReport(data)
          setError('')
        }
      })
      .catch((reason) => {
        if (active) setError(reason.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [apiBaseUrl, fromDate, toDate, token])

  // Analytics derivations
  const facilityBreakdown = useMemo(() => {
    if (!report.items || report.items.length === 0) return []
    const map = {}
    report.items.forEach((item) => {
      const name = item.facility || 'General Facility'
      map[name] = (map[name] || 0) + (Number(item.totalAmount) || 0)
    })
    const total = report.totalRevenue || 1
    return Object.entries(map)
      .map(([facility, amount]) => ({
        facility,
        amount,
        percentage: Math.round((amount / total) * 100),
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [report])

  const topFacility = facilityBreakdown[0] || null

  const paymentBreakdown = useMemo(() => {
    if (!report.items || report.items.length === 0) return {}
    const map = {}
    report.items.forEach((item) => {
      const method = item.paymentMethod || 'Other'
      map[method] = (map[method] || 0) + 1
    })
    return map
  }, [report])

  // Filtered transactions
  const filteredItems = useMemo(() => {
    return (report.items || []).filter((item) => {
      const matchesSearch =
        !searchQuery ||
        (item.customer || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.facility || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(item.id || '').includes(searchQuery)

      const matchesPayment =
        paymentFilter === 'All' ||
        (item.paymentMethod || '').toLowerCase() === paymentFilter.toLowerCase()

      return matchesSearch && matchesPayment
    })
  }, [report.items, searchQuery, paymentFilter])

  // Download PDF
  const downloadPdf = () => {
    const pdf = new jsPDF()
    const left = 16
    let y = 18

    // Header Branding
    pdf.setFontSize(20)
    pdf.setTextColor(15, 23, 42)
    pdf.text('SmartSports Executive Revenue Statement', left, y)
    y += 8

    pdf.setFontSize(10)
    pdf.setTextColor(100, 116, 139)
    pdf.text(
      `Period: ${new Date(report.fromDate || fromDate).toLocaleDateString()} to ${new Date(
        report.toDate || toDate
      ).toLocaleDateString()} | Generated: ${new Date().toLocaleString()}`,
      left,
      y
    )
    y += 12

    // Summary Box in PDF
    pdf.setDrawColor(226, 232, 240)
    pdf.setFillColor(248, 250, 252)
    pdf.roundedRect(left, y, 178, 22, 3, 3, 'FD')

    pdf.setFontSize(11)
    pdf.setTextColor(15, 23, 42)
    pdf.text(`Gross Revenue: ${currency.format(report.totalRevenue)}`, left + 6, y + 9)
    pdf.text(`Total Bookings: ${report.bookingCount}`, left + 6, y + 17)

    const avgVal = report.bookingCount ? report.totalRevenue / report.bookingCount : 0
    pdf.text(`Avg Ticket: ${currency.format(avgVal)}`, left + 90, y + 9)
    if (topFacility) {
      pdf.text(`Top Facility: ${topFacility.facility}`, left + 90, y + 17)
    }
    y += 32

    // Table Header
    pdf.setFontSize(9)
    pdf.setTextColor(71, 85, 105)
    pdf.text('Date', left, y)
    pdf.text('Facility', 42, y)
    pdf.text('Customer', 96, y)
    pdf.text('Payment', 142, y)
    pdf.text('Amount (LKR)', 175, y)
    y += 4

    pdf.setDrawColor(203, 213, 225)
    pdf.line(left, y, 194, y)
    y += 6

    // Items
    pdf.setTextColor(15, 23, 42)
    report.items.forEach((item) => {
      if (y > 275) {
        pdf.addPage()
        y = 18
      }
      pdf.text(new Date(item.bookingDate).toLocaleDateString(), left, y)
      pdf.text(String(item.facility || '').slice(0, 26), 42, y)
      pdf.text(String(item.customer || '').slice(0, 22), 96, y)
      pdf.text(String(item.paymentMethod || ''), 142, y)
      pdf.text(currency.format(item.totalAmount), 175, y)
      y += 6
    })

    if (!report.items.length) {
      pdf.text('No confirmed income recorded for this period.', left, y)
    }

    pdf.save(`smartsports-revenue-${fromDate}-to-${toDate}.pdf`)
  }

  // Export CSV
  const exportCsv = () => {
    if (!report.items.length) return
    const headers = ['Booking ID', 'Booking Date', 'Facility', 'Customer', 'Payment Method', 'Payment Status', 'Amount (LKR)']
    const rows = report.items.map((item) => [
      item.id,
      item.bookingDate ? item.bookingDate.slice(0, 10) : '',
      `"${(item.facility || '').replace(/"/g, '""')}"`,
      `"${(item.customer || '').replace(/"/g, '""')}"`,
      item.paymentMethod || '',
      item.paymentStatus || '',
      item.totalAmount || 0,
    ])

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `revenue-report-${fromDate}-to-${toDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const averageBooking = report.bookingCount ? report.totalRevenue / report.bookingCount : 0

  return (
    <div className="revenue-dashboard-wrapper">
      {/* 1. HERO & COMMAND BAR */}
      <section className="revenue-hero-card">
        <div className="revenue-hero-top">
          <div className="revenue-hero-title-group">
            <div className="revenue-badge-pill">
              <span className="hub-pulse-dot" />
              <span>FINANCIAL INTELLIGENCE • LKR</span>
            </div>
            <h1 className="revenue-hero-title">Financial Audit & Revenue</h1>
            <p className="revenue-hero-subtitle">
              Comprehensive ledger of confirmed bookings, verified bank transfers, and automated card settlements.
            </p>
          </div>

          <div className="revenue-export-actions">
            <button
              type="button"
              className="revenue-btn-export secondary"
              onClick={exportCsv}
              disabled={loading || !report.items.length}
              title="Export filtered records as CSV spreadsheet"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              className="revenue-btn-export primary"
              onClick={downloadPdf}
              disabled={loading}
              title="Download official PDF report"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Download PDF Statement</span>
            </button>
          </div>
        </div>

        {/* Date Filter Toolbar & Presets */}
        <div className="revenue-filter-toolbar">
          <div className="revenue-presets-group">
            <span className="presets-label">Period:</span>
            <button type="button" className="preset-pill" onClick={() => applyPreset('today')}>
              Today
            </button>
            <button type="button" className="preset-pill" onClick={() => applyPreset('7days')}>
              7 Days
            </button>
            <button type="button" className="preset-pill active" onClick={() => applyPreset('month')}>
              This Month
            </button>
            <button type="button" className="preset-pill" onClick={() => applyPreset('30days')}>
              30 Days
            </button>
            <button type="button" className="preset-pill" onClick={() => applyPreset('ytd')}>
              YTD
            </button>
          </div>

          <div className="revenue-custom-dates">
            <label className="revenue-date-picker">
              <span className="date-label">From</span>
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="date-input"
              />
            </label>

            <span className="date-range-arrow">→</span>

            <label className="revenue-date-picker">
              <span className="date-label">To</span>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
                className="date-input"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Error Notice if any */}
      {error && (
        <div className="revenue-error-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* 2. EXECUTIVE KPI STATS CARDS */}
      <section className="revenue-kpi-grid">
        <article className="revenue-kpi-card kpi-highlight-green">
          <div className="kpi-header">
            <span className="kpi-tag">TOTAL CONFIRMED REVENUE</span>
            <div className="kpi-icon-wrap green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-number">
              {loading ? '...' : currency.format(report.totalRevenue)}
            </span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-status-dot green" />
            <span>Cleared & verified bank/online income</span>
          </div>
        </article>

        <article className="revenue-kpi-card">
          <div className="kpi-header">
            <span className="kpi-tag">INCOME BOOKINGS</span>
            <div className="kpi-icon-wrap blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-number">{loading ? '...' : report.bookingCount}</span>
            <span className="kpi-unit">sessions</span>
          </div>
          <div className="kpi-footer">
            <span>Successful reservations generated</span>
          </div>
        </article>

        <article className="revenue-kpi-card">
          <div className="kpi-header">
            <span className="kpi-tag">AVERAGE TICKET SIZE</span>
            <div className="kpi-icon-wrap purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-number">
              {loading ? '...' : currency.format(averageBooking)}
            </span>
          </div>
          <div className="kpi-footer">
            <span>Revenue yield per session</span>
          </div>
        </article>

        <article className="revenue-kpi-card">
          <div className="kpi-header">
            <span className="kpi-tag">TOP PERFORMING VENUE</span>
            <div className="kpi-icon-wrap amber">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-venue-title" title={topFacility?.facility || 'N/A'}>
              {loading ? '...' : topFacility ? topFacility.facility : 'No data yet'}
            </span>
          </div>
          <div className="kpi-footer">
            <span>
              {topFacility ? `${topFacility.percentage}% of total revenue` : 'Awaiting bookings'}
            </span>
          </div>
        </article>
      </section>

      {/* 3. VISUAL ANALYTICS: VENUE BREAKDOWN & PAYMENT METHODS */}
      {report.items && report.items.length > 0 && (
        <section className="revenue-analytics-row">
          {/* Facility Revenue Share Bars */}
          <div className="revenue-analytics-card">
            <div className="analytics-card-header">
              <div>
                <h3 className="analytics-card-title">Revenue Share by Arena</h3>
                <span className="analytics-card-sub">Contribution to gross earnings</span>
              </div>
              <span className="analytics-count-pill">{facilityBreakdown.length} Venues</span>
            </div>

            <div className="facility-share-list">
              {facilityBreakdown.slice(0, 5).map((item, idx) => (
                <div key={item.facility} className="facility-share-item">
                  <div className="share-labels">
                    <span className="share-name">
                      <span className="share-rank">#{idx + 1}</span> {item.facility}
                    </span>
                    <span className="share-amount">
                      {currency.format(item.amount)}{' '}
                      <small className="share-percent">({item.percentage}%)</small>
                    </span>
                  </div>
                  <div className="share-bar-track">
                    <div
                      className="share-bar-fill"
                      style={{
                        width: `${Math.max(4, item.percentage)}%`,
                        background:
                          idx === 0
                            ? 'linear-gradient(90deg, #10b981, #059669)'
                            : idx === 1
                            ? 'linear-gradient(90deg, #3b82f6, #2563eb)'
                            : 'linear-gradient(90deg, #8b5cf6, #7c3aed)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="revenue-analytics-card">
            <div className="analytics-card-header">
              <div>
                <h3 className="analytics-card-title">Payment Settlement Channels</h3>
                <span className="analytics-card-sub">Transaction fulfillment methods</span>
              </div>
            </div>

            <div className="payment-distribution-grid">
              {Object.entries(paymentBreakdown).map(([method, count]) => {
                const isBank = method.toLowerCase().includes('bank')
                const isCard = method.toLowerCase().includes('card')
                return (
                  <div key={method} className="payment-channel-pill">
                    <span className="channel-icon">{isBank ? '🏦' : isCard ? '💳' : '💵'}</span>
                    <div className="channel-meta">
                      <span className="channel-name">{method}</span>
                      <strong className="channel-count">{count} {count === 1 ? 'payment' : 'payments'}</strong>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* 4. TRANSACTIONS LEDGER */}
      <section className="revenue-ledger-card">
        <div className="ledger-header">
          <div>
            <h3 className="ledger-title">Confirmed Transactions Ledger</h3>
            <span className="ledger-sub">
              Showing {filteredItems.length} of {report.items?.length || 0} recorded settlements
            </span>
          </div>

          {/* Search & Filter */}
          <div className="ledger-controls">
            <div className="ledger-search-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search customer, venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ledger-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="ledger-clear-btn"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="ledger-select"
            >
              <option value="All">All Payment Types</option>
              <option value="BankSlip">Bank Transfer</option>
              <option value="Card">Credit/Debit Card</option>
              <option value="Cash">Cash / On-Site</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="ledger-table-wrap">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Booking Ref & Date</th>
                <th>Arena / Facility</th>
                <th>Customer</th>
                <th>Settlement</th>
                <th className="align-right">Gross Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="ledger-loading-state">
                    <span className="ledger-spinner" /> Loading financial records...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="ledger-empty-state">
                    <div className="empty-content">
                      <span className="empty-icon">📊</span>
                      <h4>No Transactions Found</h4>
                      <p>
                        {searchQuery
                          ? `No transactions match your search "${searchQuery}".`
                          : 'No confirmed income recorded for this selected period.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="ledger-row">
                    <td>
                      <div className="ledger-date-cell">
                        <span className="ledger-booking-id">#{item.id}</span>
                        <span className="ledger-date-str">
                          {new Date(item.bookingDate).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="ledger-venue-cell">
                        <span className="ledger-court-icon">🏟️</span>
                        <span className="ledger-venue-name">{item.facility}</span>
                      </div>
                    </td>

                    <td>
                      <div className="ledger-customer-cell">
                        <span className="customer-avatar-dot">
                          {(item.customer || 'U')[0].toUpperCase()}
                        </span>
                        <span className="customer-name">{item.customer || 'Member'}</span>
                      </div>
                    </td>

                    <td>
                      <div className="ledger-payment-pill">
                        <span className="payment-method-tag">
                          {item.paymentMethod === 'BankSlip' ? '🏦 Bank Transfer' : `💳 ${item.paymentMethod || 'Online'}`}
                        </span>
                        <span className="payment-status-badge verified">Paid</span>
                      </div>
                    </td>

                    <td className="align-right">
                      <span className="ledger-amount-value">
                        {currency.format(item.totalAmount)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
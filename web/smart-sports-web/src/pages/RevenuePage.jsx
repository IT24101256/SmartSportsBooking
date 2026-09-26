import { useEffect, useState } from 'react'
import { jsPDF } from 'jspdf'

const currency = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 })

export default function RevenuePage({ apiBaseUrl, token }) {
  const today = new Date().toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState(`${today.slice(0, 8)}01`)
  const [toDate, setToDate] = useState(today)
  const [report, setReport] = useState({ totalRevenue: 0, bookingCount: 0, items: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    const query = new URLSearchParams({ fromDate, toDate })
    fetch(`${apiBaseUrl}/dashboard/revenue?${query}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error(`Revenue could not be loaded (${response.status}).`)))
      .then((data) => { if (active) { setReport(data); setError('') } })
      .catch((reason) => { if (active) setError(reason.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [apiBaseUrl, fromDate, toDate, token])

  const downloadPdf = () => {
    const pdf = new jsPDF()
    const left = 16
    let y = 18
    pdf.setFontSize(18)
    pdf.text('SmartSports revenue report', left, y)
    y += 9
    pdf.setFontSize(10)
    pdf.text(`${new Date(report.fromDate).toLocaleDateString()} - ${new Date(report.toDate).toLocaleDateString()}`, left, y)
    y += 10
    pdf.setFontSize(13)
    pdf.text(`Total revenue: ${currency.format(report.totalRevenue)}`, left, y)
    y += 12
    pdf.setFontSize(9)
    pdf.text('Date', left, y)
    pdf.text('Facility', 42, y)
    pdf.text('Customer', 94, y)
    pdf.text('Payment', 142, y)
    pdf.text('Amount', 178, y)
    y += 6
    report.items.forEach((item) => {
      if (y > 280) { pdf.addPage(); y = 18 }
      pdf.text(new Date(item.bookingDate).toLocaleDateString(), left, y)
      pdf.text(String(item.facility).slice(0, 27), 42, y)
      pdf.text(String(item.customer).slice(0, 25), 94, y)
      pdf.text(String(item.paymentMethod), 142, y)
      pdf.text(currency.format(item.totalAmount), 178, y)
      y += 6
    })
    if (!report.items.length) pdf.text('No income recorded for this period.', left, y)
    pdf.save(`smartsports-revenue-${fromDate}-to-${toDate}.pdf`)
  }

  return (
    <section className="panel full-width-panel revenue-page">
      <div className="panel-header revenue-header">
        <div><p className="eyebrow subtle">Admin finance</p><h3>Revenue</h3><span className="subtle">All confirmed and paid income in one place</span></div>
        <div className="revenue-actions"><label className="revenue-date"><span>From</span><input type="date" value={fromDate} max={toDate} onChange={(event) => setFromDate(event.target.value)} /></label><label className="revenue-date"><span>To</span><input type="date" value={toDate} min={fromDate} onChange={(event) => setToDate(event.target.value)} /></label><button className="secondary-btn" type="button" onClick={downloadPdf} disabled={loading}>Download PDF</button></div>
      </div>
      {error && <div className="booking-notice">{error}</div>}
      <div className="revenue-summary"><article><span>Total revenue</span><strong>{loading ? '...' : currency.format(report.totalRevenue)}</strong></article><article><span>Income bookings</span><strong>{loading ? '...' : report.bookingCount}</strong></article><article><span>Average booking</span><strong>{loading || !report.bookingCount ? 'LKR 0' : currency.format(report.totalRevenue / report.bookingCount)}</strong></article></div>
      <div className="revenue-table-wrap"><table className="member-table revenue-table"><thead><tr><th>Date</th><th>Facility</th><th>Customer</th><th>Payment</th><th>Amount</th></tr></thead><tbody>{report.items.map((item) => <tr key={item.id}><td>{new Date(item.bookingDate).toLocaleDateString()}</td><td>{item.facility}</td><td>{item.customer}</td><td>{item.paymentMethod} <small>{item.paymentStatus}</small></td><td><strong>{currency.format(item.totalAmount)}</strong></td></tr>)}{!loading && !report.items.length && <tr><td colSpan="5" className="empty-state">No income recorded for this period.</td></tr>}</tbody></table></div>
    </section>
  )
}
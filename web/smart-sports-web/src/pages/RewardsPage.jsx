export default function RewardsPage({ rewards, onBook }) {
  return (
    <section className="panel full-width-panel member-page">
      <div className="panel-header">
        <div><p className="eyebrow subtle">Member benefits</p><h3>Rewards</h3></div>
        <span className="admin-badge">Live account data</span>
      </div>
      <div className="rewards-summary">
        <strong>{rewards?.points ?? 0}</strong>
        <span>points available</span>
      </div>
      <div className="rewards-list">
        <div><strong>Confirmed bookings</strong><span>{rewards?.confirmedBookings ?? 0}</span></div>
        <div><strong>Completed bookings</strong><span>{rewards?.completedBookings ?? 0}</span></div>
        <div><strong>Points to next reward</strong><span>{rewards?.pointsToNextReward ?? 50}</span></div>
      </div>
      <div className="modal-actions"><button type="button" className="primary-btn" onClick={onBook}>Book a session</button></div>
    </section>
  )
}

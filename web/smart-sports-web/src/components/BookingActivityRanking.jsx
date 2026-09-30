export default function BookingActivityRanking({ analytics = [] }) {
  const maxBookings = analytics.length > 0 ? Math.max(...analytics.map((item) => item.bookings || 1), 1) : 1

  return (
    <section className="ranking-leaderboard-section">
      <div className="section-header-compact">
        <div>
          <span className="section-eyebrow">POPULARITY LEADERBOARD</span>
          <h3 className="section-title">MOST BOOKED VENUES</h3>
        </div>
        <span className="activity-hint-text">Ranked by reservations</span>
      </div>

      <div className="ranking-leaderboard-container">
        {analytics.length === 0 ? (
          <div className="ranking-empty-state">
            <p>No booking activity recorded yet. Be the first to book a session!</p>
          </div>
        ) : (
          <div className="ranking-items-list">
            {analytics.slice(0, 5).map((item, index) => {
              const rankNumber = String(index + 1).padStart(2, '0')
              const percentage = Math.min(100, Math.round(((item.bookings || 0) / maxBookings) * 100))

              return (
                <div key={item.facility || index} className="ranking-item-row">
                  <div className="ranking-number-badge">{rankNumber}</div>
                  <div className="ranking-details-block">
                    <div className="ranking-title-line">
                      <span className="ranking-facility-name">{item.facility}</span>
                      <strong className="ranking-bookings-count">
                        {item.bookings} {item.bookings === 1 ? 'booking' : 'bookings'}
                      </strong>
                    </div>
                    <div className="ranking-bar-track">
                      <div
                        className="ranking-bar-fill"
                        style={{ width: `${Math.max(percentage, 12)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

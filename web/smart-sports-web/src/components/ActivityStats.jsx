export default function ActivityStats({ stats = [] }) {
  // Map tones to athletic icons and indicators
  const getIcon = (label) => {
    const l = (label || '').toLowerCase()
    if (l.includes('facility')) return '🏟️'
    if (l.includes('today')) return '⚡'
    if (l.includes('confirmed')) return '🎯'
    if (l.includes('satisfaction')) return '⭐'
    return '📊'
  }

  return (
    <section className="activity-stats-section">
      <div className="section-header-compact">
        <div>
          <span className="section-eyebrow">PERFORMANCE OVERVIEW</span>
          <h3 className="section-title">YOUR ACTIVITY</h3>
        </div>
        <span className="activity-hint-text">Real-time club engagement metrics</span>
      </div>

      <div className="activity-stats-strip">
        {stats.map((stat, idx) => {
          const icon = getIcon(stat.label)
          return (
            <div key={stat.label || idx} className={`activity-stat-card tone-${stat.tone || 'blue'}`}>
              <div className="stat-card-icon">{icon}</div>
              <div className="stat-card-info">
                <span className="stat-card-label">{stat.label}</span>
                <strong className="stat-card-number">{stat.value}</strong>
              </div>
              <div className="stat-subtle-indicator">
                <div className={`indicator-bar bar-${stat.tone || 'blue'}`} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

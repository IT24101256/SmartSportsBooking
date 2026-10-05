export default function ScheduleTimeline({
  schedule = [],
  onDetails,
  onBookSlot,
}) {
  const isSlotExpired = (item) => {
    if (!item) return true
    if (item.status === 'Cancelled') return true

    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    // 1. If eventDate is provided, check if it's in the past (or not today)
    if (item.eventDate) {
      const itemDateStr = String(item.eventDate).slice(0, 10)
      if (itemDateStr < todayStr) return true
      if (itemDateStr > todayStr) return true
    }

    // 2. For today's slots, check if the slot end/start time has already passed
    const timeStr = item.endTime || item.startTime || item.time || ''
    if (!timeStr) return false

    let hours = 0
    let minutes = 0
    const upper = timeStr.trim().toUpperCase()

    if (upper.includes('AM') || upper.includes('PM')) {
      const match = upper.match(/(\d+):(\d+)\s*(AM|PM)/)
      if (match) {
        let h = parseInt(match[1], 10)
        const m = parseInt(match[2], 10)
        const isPM = match[3] === 'PM'
        if (isPM && h < 12) h += 12
        if (!isPM && h === 12) h = 0
        hours = h
        minutes = m
      }
    } else {
      const parts = timeStr.split(':')
      hours = parseInt(parts[0], 10) || 0
      minutes = parseInt(parts[1], 10) || 0
    }

    const slotTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0)
    return slotTime.getTime() <= now.getTime()
  }

  // Strictly filter to active, non-expired sessions for today
  const activeSchedule = schedule.filter((item) => !isSlotExpired(item))

  return (
    <section className="schedule-timeline-section">
      <div className="section-header-compact">
        <div>
          <span className="section-eyebrow">COURT TIMETABLE</span>
          <h3 className="section-title">TODAY’S SCHEDULE</h3>
        </div>
        <span className="activity-hint-text">Live daily slot rotation & club sessions</span>
      </div>

      <div className="schedule-timeline-container">
        {activeSchedule.length === 0 ? (
          <div className="timeline-empty-card">
            <p>No upcoming sessions scheduled for today. Courts are open for reservations.</p>
          </div>
        ) : (
          <div className="timeline-track-list">
            {activeSchedule.map((item, index) => {
              const isAvailable = (item.title || '').toLowerCase().includes('available')
              const isBooked = !isAvailable

              return (
                <div
                  key={item.id || item.time || index}
                  className={`timeline-slot-item ${isBooked ? 'slot-booked' : 'slot-available'}`}
                >
                  <div className="timeline-time-badge">
                    <span className="time-value">{item.time}</span>
                    <span className="time-marker-dot" />
                  </div>

                  <div className="timeline-event-card">
                    <div className="event-info-main">
                      <div className="event-title-row">
                        <h4 className="event-title">{item.title}</h4>
                        <span className={`event-status-pill ${isBooked ? 'booked' : 'open'}`}>
                          {isBooked ? '● Booked' : '● Available'}
                        </span>
                      </div>
                      <p className="event-subtext">
                        {item.coach ? `Led by ${item.coach}` : 'Member session slot'}
                        {item.eventDate && ` • ${item.eventDate}`}
                      </p>
                    </div>

                    <div className="event-actions">
                      <button
                        type="button"
                        className="ghost-card-btn"
                        onClick={() => onDetails && onDetails(item)}
                      >
                        Details
                      </button>
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

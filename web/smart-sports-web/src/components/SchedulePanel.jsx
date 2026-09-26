export default function SchedulePanel({ schedule, onDetails }) {
  return (
    <section className="panel schedule-panel">
      <div className="panel-header">
        <h3>Today’s schedule</h3>
      </div>
      <div className="schedule-list">
        {schedule.map((item) => (
          <div key={item.id ?? item.time} className="schedule-item">
            <div className="time-tag">{item.time}</div>
            <div className="schedule-copy">
              <h4>{item.title}</h4>
              <span>{item.coach}</span>
            </div>
            <button type="button" className="ghost-btn" onClick={() => onDetails(item)}>Details</button>
          </div>
        ))}
      </div>
    </section>
  )
}

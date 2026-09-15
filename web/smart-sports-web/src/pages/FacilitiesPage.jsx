export default function FacilitiesPage({ facilities, onViewTimetable }) {
  return (
    <section className="panel full-width-panel">
      <div className="panel-header">
        <h3>Available facilities</h3>
        <button className="text-action" type="button" onClick={onViewTimetable}>View timetable</button>
      </div>
      <div className="facility-list">
        {facilities.map((facility) => (
          <div key={facility.name} className={`facility-card ${facility.accent}`}>
            <div className="facility-icon">{facility.icon}</div>
            <div className="facility-body">
              <div className="facility-topline"><h4>{facility.name}</h4><span>{facility.type}</span></div>
              <div className="facility-meta"><strong>{facility.price}</strong><small>{facility.status}</small></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

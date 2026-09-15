export default function SupportPage({ requests, onAddTicket }) {
  return (
    <section className="panel full-width-panel">
      <div className="panel-header">
        <h3>Support requests</h3>
        <button className="text-action" type="button" onClick={onAddTicket}>Add ticket</button>
      </div>
      <div className="support-list">
        {requests.map((item) => (
          <div key={item.title} className="support-item">
            <div><strong>{item.title}</strong><p>{item.detail}</p></div>
            <span className="priority-tag">{item.priority}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

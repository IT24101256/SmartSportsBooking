export default function WorkflowHistoryPage({ workflows }) {
  return (
    <section className="panel full-width-panel">
      <div className="panel-header">
        <div><p className="eyebrow subtle">Customer requests</p><h3>My AI request history</h3></div>
      </div>
      <div className="workflow-list">
        {workflows.map((workflow) => (
          <article className="workflow-card" key={workflow.id}>
            <div className="workflow-card-header"><div><strong>{workflow.id}</strong><h4>{workflow.objective}</h4></div><span className={`status ${workflow.status === 'Approved' ? 'confirmed' : workflow.status === 'Rejected' ? 'rejected' : 'pending'}`}>{workflow.status}</span></div>
            <div className="workflow-meta"><span><b>Facility:</b> {workflow.facility}</span><span><b>Requested:</b> {workflow.date}</span><span><b>Budget:</b> {workflow.quotation}</span></div>
            <div className="workflow-validation"><strong>Validation</strong>{workflow.validation.map((rule) => <span key={rule}>{rule}</span>)}</div>
            {workflow.decision && <div className="workflow-decision"><strong>Decision:</strong> {workflow.decision}</div>}
          </article>
        ))}
        {!workflows.length && <p className="empty-state">You have not submitted any AI booking requests yet.</p>}
      </div>
    </section>
  )
}

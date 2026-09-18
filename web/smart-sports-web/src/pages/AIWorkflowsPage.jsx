import { useState } from 'react'

export default function AIWorkflowsPage({
  workflows,
  decision,
  onDecisionChange,
  onRequestRevision,
  onReject,
  onApprove
}) {
  const [expandedStepWorkflowId, setExpandedStepWorkflowId] = useState(null)
  const [activeStepTab, setActiveStepTab] = useState({})

  const toggleStepDetails = (workflowId, stepIndex) => {
    const key = `${workflowId}-${stepIndex}`
    setActiveStepTab((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <section className="panel full-width-panel ai-workflows-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow subtle">Agentic AI Control Room (SE3090 Part 5)</p>
          <h3>Autonomous Multi-Agent Workflow Pipeline</h3>
        </div>
        <div className="admin-badge-group">
          <span className="admin-badge">Human-in-the-Loop Gated</span>
          <span className="admin-badge count-badge">{workflows.filter(w => w.status === 'Pending manager approval' || w.status === 'PendingManagerApproval').length} Pending Review</span>
        </div>
      </div>

      <div className="workflow-explainer">
        <div className="explainer-header">
          <strong>4-Agent Architecture & Deterministic Safety Boundaries</strong>
          <span className="explainer-tag">Deterministic Rules + Allow-Listed Tools</span>
        </div>
        <p>
          Each domain objective is decomposed by the <b>Planning & Coordination Agent</b>, assessed by the <b>Domain & Facility Analyst</b> (via allow-listed tools), verified by the <b>Deterministic Validation Engine</b> (schedule collision, operating hours & budget checks), and staged by the <b>Action Execution Agent</b>. Commitments remain strictly paused until an authorized Manager executes approval.
        </p>
      </div>

      <div className="workflow-list">
        {workflows.map((workflow) => {
          const rawValidation = workflow.rawValidation || {}
          const passedRules = rawValidation.passedRules || []
          const violations = rawValidation.violations || []
          const isPending = workflow.status === 'Pending manager approval' || workflow.status === 'PendingManagerApproval'
          const isRevision = workflow.status === 'Revision requested' || workflow.status === 'RevisionRequested'
          const isApproved = workflow.status === 'Approved'
          const isRejected = workflow.status === 'Rejected'
          const isFailed = workflow.status === 'ValidationFailed' || workflow.status === 'FailedSafe'

          return (
            <article className={`workflow-card-pro ${isPending ? 'pending-glow' : ''}`} key={workflow.id}>
              {/* Card Header */}
              <div className="workflow-card-header">
                <div>
                  <div className="workflow-id-badge">
                    <span className="id-label">Workflow ID:</span>
                    <code>{workflow.id}</code>
                    {workflow.executionDurationMs > 0 && (
                      <span className="timing-pill">⚡ {workflow.executionDurationMs}ms</span>
                    )}
                  </div>
                  <h4>{workflow.objective}</h4>
                </div>
                <span className={`status ${isApproved ? 'confirmed' : isRejected ? 'rejected' : isFailed ? 'rejected' : isRevision ? 'revision' : 'pending'}`}>
                  {isPending ? '⏳ Pending Manager Approval' : isApproved ? '✓ Approved & Committed' : isRejected ? '✕ Rejected' : isRevision ? '🔄 Revision Requested' : workflow.status}
                </span>
              </div>

              {/* Workflow Meta Grid */}
              <div className="workflow-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Facility & Sport</span>
                  <strong>{workflow.facility}</strong>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Requested Window</span>
                  <strong>{workflow.date}</strong>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Participants</span>
                  <strong>{workflow.guests || 'N/A'} Guests</strong>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Quotation / Budget</span>
                  <strong className="cost-highlight">{workflow.quotation}</strong>
                </div>
              </div>

              {/* 4-Agent Pipeline Visualizer */}
              <div className="agent-pipeline-container">
                <h5 className="pipeline-title">Specialized Agent Execution Trace</h5>
                <div className="agent-pipeline-grid">
                  {(workflow.detailedSteps || []).map((step, idx) => {
                    const stepKey = `${workflow.id}-${idx}`
                    const isExpanded = !!activeStepTab[stepKey]
                    const tools = step.toolsCalled || []
                    const agentIcon = idx === 0 ? '🧭' : idx === 1 ? '🏟️' : idx === 2 ? '🛡️' : '⚡'

                    return (
                      <div className={`agent-step-card ${step.status === 'Completed' ? 'step-success' : 'step-failed'}`} key={idx}>
                        <div className="step-card-header" onClick={() => toggleStepDetails(workflow.id, idx)}>
                          <div className="step-badge">
                            <span className="step-icon">{agentIcon}</span>
                            <span>Step {idx + 1}</span>
                          </div>
                          <div className="step-header-text">
                            <strong>{step.agentName}</strong>
                            <small>{step.responsibility}</small>
                          </div>
                          <div className="step-status-tag">
                            {step.executionDurationMs > 0 && <span className="ms-tag">{step.executionDurationMs}ms</span>}
                            <span className={`dot ${step.status === 'Completed' ? 'green' : 'red'}`}></span>
                            <span className="expand-indicator">{isExpanded ? '▲' : '▼'}</span>
                          </div>
                        </div>

                        {/* Collapsible Inspector */}
                        {isExpanded && (
                          <div className="step-inspector">
                            {tools.length > 0 && (
                              <div className="inspector-section">
                                <span className="section-title">Allow-Listed Tool Invocations:</span>
                                {tools.map((tool, tIdx) => (
                                  <div className="tool-call-box" key={tIdx}>
                                    <div className="tool-name-row">
                                      <code>🔧 {tool.toolName || tool.ToolName}</code>
                                      <span className="tool-status">{tool.success || tool.Success ? 'Success' : 'Failed'} ({tool.executionTimeMs || tool.ExecutionTimeMs}ms)</span>
                                    </div>
                                    <div className="tool-io-grid">
                                      <div>
                                        <small>Input Payload:</small>
                                        <pre>{JSON.stringify(JSON.parse(tool.inputJson || tool.InputJson || '{}'), null, 2)}</pre>
                                      </div>
                                      <div>
                                        <small>Structured Output:</small>
                                        <pre>{JSON.stringify(JSON.parse(tool.outputJson || tool.OutputJson || '{}'), null, 2)}</pre>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="inspector-section">
                              <span className="section-title">Agent Output Summary:</span>
                              <pre className="summary-pre">{JSON.stringify(JSON.parse(step.outputJson || '{}'), null, 2)}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Deterministic Validation Matrix */}
              <div className="workflow-validation-card">
                <div className="validation-header">
                  <strong>Deterministic Validation Ruleset</strong>
                  <span className="validation-badge">{violations.length === 0 ? '✓ 100% Rules Passed' : `✕ ${violations.length} Violations`}</span>
                </div>
                <div className="rules-grid">
                  {passedRules.map((rule, rIdx) => (
                    <div className="rule-item passed" key={rIdx}>
                      <span className="check-icon">✓</span>
                      <span>{rule}</span>
                    </div>
                  ))}
                  {violations.map((violation, vIdx) => (
                    <div className="rule-item failed" key={vIdx}>
                      <span className="fail-icon">✕</span>
                      <span>{violation}</span>
                    </div>
                  ))}
                  {passedRules.length === 0 && violations.length === 0 && (workflow.validation || []).map((rule, idx) => (
                    <div className="rule-item passed" key={idx}>
                      <span className="check-icon">✓</span>
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit Decision & Human-in-the-Loop Actions */}
              {isPending || isRevision ? (
                <div className="manager-action-panel">
                  <label className="workflow-comment">
                    <span className="comment-label">
                      <strong>Manager Decision & Audit Note</strong>
                      <small>(Mandatory justification for audit history)</small>
                    </span>
                    <textarea
                      value={decision}
                      onChange={(event) => onDecisionChange(event.target.value)}
                      placeholder="Enter verification notes (e.g. 'Approved court schedule and verified referee coverage', or 'Requesting 1 hour earlier slot')."
                      rows="2"
                    />
                  </label>
                  <div className="modal-actions action-row">
                    <button
                      className="secondary-btn revision-btn"
                      type="button"
                      disabled={!decision.trim()}
                      onClick={() => onRequestRevision(workflow.id)}
                    >
                      🔄 Request Revision
                    </button>
                    <button
                      className="secondary-btn reject-btn"
                      type="button"
                      disabled={!decision.trim()}
                      onClick={() => onReject(workflow.id)}
                    >
                      ✕ Reject Safely
                    </button>
                    <button
                      className="primary-btn approve-btn"
                      type="button"
                      disabled={!decision.trim()}
                      onClick={() => onApprove(workflow.id)}
                    >
                      ✓ Approve & Commit Booking
                    </button>
                  </div>
                </div>
              ) : (
                <div className="workflow-decision-banner">
                  <div>
                    <strong>Audit Trail Result:</strong> {workflow.finalOutcome || workflow.decision || 'Completed'}
                  </div>
                  {workflow.decisionBy && <small>Actioned by: <b>{workflow.decisionBy}</b></small>}
                </div>
              )}
            </article>
          )
        })}

        {!workflows.length && (
          <div className="empty-state-card">
            <p className="empty-state">No AI booking proposals are currently awaiting manager approval.</p>
          </div>
        )}
      </div>
    </section>
  )
}

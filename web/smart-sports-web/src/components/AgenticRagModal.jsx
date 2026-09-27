import { useState, useEffect, useRef } from 'react'

export default function AgenticRagModal({
  apiBaseUrl,
  token,
  currentUser,
  onClose,
  onLaunchWorkflow,
  workflowForm,
  onWorkflowFormChange,
  isWorkflowLoading
}) {
  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'pipeline' | 'workflow'
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your SmartSports Agentic RAG Assistant (SE3090 Lecture 06). I can answer questions about court specifications, hourly rates, amenities, cancellation & refund policies, operating hours (06:00-22:00), equipment rentals, and booking regulations.\n\nEvery answer is strictly grounded in verified facility documentation with verifiable citations.',
      citations: [],
      triad: { overallQuality: 1.0, faithfulness: 1.0, contextRelevance: 1.0, answerRelevance: 1.0, assessment: 'Initial greeting grounded in facility handbook.' }
    }
  ])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState(() => 'rag-session-' + Date.now())
  const [lastDiagnostics, setLastDiagnostics] = useState(null)
  const [semanticMemory, setSemanticMemory] = useState([])
  const [evalBenchmarks, setEvalBenchmarks] = useState(null)
  const [evalLoading, setEvalLoading] = useState(false)
  const [expandedCitation, setExpandedCitation] = useState(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Quick prompt suggestions taught in Lecture 06
  const promptSuggestions = [
    { title: '📋 Cancellation & Refund', text: 'What is the cancellation and refund policy?' },
    { title: '🏸 Badminton Court Specs', text: 'How much does Badminton Court cost and what are the specs?' },
    { title: '👟 Indoor Footwear Rules', text: 'What shoes should I wear on indoor courts?' },
    { title: '⚖️ Compare Courts', text: 'Compare Badminton Court and Indoor Basketball Arena rates' },
    { title: '🛡️ Test Guardrail', text: 'Can I rent a nuclear submarine for the weekend?' }
  ]

  const sendQuery = async (queryText) => {
    const text = (queryText || query).trim()
    if (!text || loading) return

    setQuery('')
    const userMsg = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const response = await fetch(`${apiBaseUrl}/rag/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ query: text, sessionId: activeSessionId })
      })

      if (!response.ok) {
        throw new Error('RAG assistant response failed.')
      }

      const data = await response.json()
      setLastDiagnostics(data.diagnostics || null)
      if (data.semanticMemory) setSemanticMemory(data.semanticMemory)

      const assistantMsg = {
        role: 'assistant',
        content: data.answer,
        rewrittenQuery: data.rewrittenQuery,
        intentRoute: data.intentRoute,
        confidence: data.confidence,
        guardrailTriggered: data.guardrailTriggered,
        citations: data.sources || [],
        triad: data.triad || null,
        diagnostics: data.diagnostics || null
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I could not query the knowledge base. Please check that the API backend is running on port 5187.',
          citations: []
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const runEvaluation = async () => {
    setEvalLoading(true)
    try {
      const res = await fetch(`${apiBaseUrl}/rag/evaluate`, { method: 'POST' })
      if (res.ok) {
        setEvalBenchmarks(await res.json())
      }
    } catch {
      // ignore
    } finally {
      setEvalLoading(false)
    }
  }

  const applyTemplate = (template) => {
    if (!onWorkflowFormChange) return
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().slice(0, 10)

    onWorkflowFormChange('objective', template.objective)
    onWorkflowFormChange('facilityType', template.facilityType)
    onWorkflowFormChange('date', dateStr)
    onWorkflowFormChange('startTime', template.startTime)
    onWorkflowFormChange('endTime', template.endTime)
    onWorkflowFormChange('guests', template.guests)
    onWorkflowFormChange('budget', template.budget)
  }

  const templates = [
    {
      title: '🏸 Badminton Championship',
      objective: '16-Team Inter-University Badminton Championship (4 Court Slots)',
      facilityType: 'Badminton',
      startTime: '09:00',
      endTime: '12:00',
      guests: 24,
      budget: 35000
    },
    {
      title: '⚽ Football Cup',
      objective: 'Weekend Corporate Friendly Cup 11v11 Match on floodlit turf',
      facilityType: 'Football',
      startTime: '16:00',
      endTime: '18:00',
      guests: 22,
      budget: 25000
    },
    {
      title: '🏊 Swimming Gala',
      objective: 'Junior Squad Aquatic Training & Sprint Gala (6 Lanes)',
      facilityType: 'Swimming',
      startTime: '07:00',
      endTime: '10:00',
      guests: 18,
      budget: 20000
    }
  ]

  return (
    <div className="booking-modal-backdrop" onClick={onClose}>
      <div className="booking-modal pro-modal rag-assistant-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="booking-modal-header">
          <div>
            <div className="rag-header-badge-row">
              <span className="rag-pill-badge blue">SE3090 Lecture 06</span>
              <span className="rag-pill-badge green">Hybrid RAG: Dense + BM25</span>
              <span className="rag-pill-badge purple">RRF Fusion (k=60)</span>
              <span className="rag-pill-badge gold">RAG Triad Verified</span>
              {currentUser?.name && <span className="rag-pill-badge blue">👤 {currentUser.name}</span>}
            </div>
            <h3>SmartSports Agentic RAG Assistant</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="text-action"
              style={{ fontSize: '0.82rem', padding: '4px 8px' }}
              title="Reset conversation session memory (Block D: Stateful Session Loop)"
              onClick={() => {
                setActiveSessionId('rag-session-' + Date.now())
                setMessages([
                  {
                    role: 'assistant',
                    content: 'Session reset! How can I assist you with facility booking or policies today?',
                    citations: [],
                    triad: { overallQuality: 1.0, faithfulness: 1.0, contextRelevance: 1.0, answerRelevance: 1.0, assessment: 'Fresh session.' }
                  }
                ])
                setLastDiagnostics(null)
              }}
            >
              🔄 New Session
            </button>
            <button type="button" className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="rag-modal-tabs">
          <button
            type="button"
            className={`rag-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            💬 Conversational RAG
          </button>
          <button
            type="button"
            className={`rag-tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
          >
            🔍 RAG Pipeline & Triad Inspector
          </button>
          <button
            type="button"
            className={`rag-tab-btn ${activeTab === 'workflow' ? 'active' : ''}`}
            onClick={() => setActiveTab('workflow')}
          >
            🚀 4-Agent Booking Workflow
          </button>
        </div>

        {/* TAB 1: Conversational RAG */}
        {activeTab === 'chat' && (
          <div className="rag-chat-container">
            {/* Quick Prompt Chips */}
            <div className="rag-prompt-chips">
              <span className="chips-label">Quick questions:</span>
              <div className="chips-scroller">
                {promptSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="rag-chip"
                    onClick={() => sendQuery(s.text)}
                    disabled={loading}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="rag-messages-box">
              {messages.map((m, idx) => (
                <div key={idx} className={`rag-chat-bubble-wrap ${m.role}`}>
                  <div className={`rag-avatar ${m.role}`}>
                    {m.role === 'assistant' ? '🤖' : '👤'}
                  </div>
                  <div className="rag-bubble-content">
                    {/* Rewritten query note if conversational follow-up was rewritten */}
                    {m.rewrittenQuery && m.rewrittenQuery !== m.content && (
                      <div className="rag-rewrite-note">
                        <span>🔄 Context Resolved: <i>&ldquo;{m.rewrittenQuery}&rdquo;</i></span>
                      </div>
                    )}

                    <div className="rag-bubble-text">
                      {m.content.split('\n').map((line, lIdx) => (
                        <p key={lIdx}>{line}</p>
                      ))}
                    </div>

                    {/* Guardrail Alert */}
                    {m.guardrailTriggered && (
                      <div className="rag-guardrail-alert">
                        <span>🛡️ Anti-Hallucination Guardrail Active (SE3090 Slide 24): Query out of domain. Safely repelled.</span>
                      </div>
                    )}

                    {/* Citations & Sources */}
                    {m.citations && m.citations.length > 0 && (
                      <div className="rag-citations-section">
                        <span className="citations-header">Verifiable Citations (Slide 25):</span>
                        <div className="citations-list">
                          {m.citations.map((c, cIdx) => (
                            <button
                              key={cIdx}
                              type="button"
                              className={`citation-pill ${expandedCitation === `${idx}-${cIdx}` ? 'active' : ''}`}
                              onClick={() => setExpandedCitation(expandedCitation === `${idx}-${cIdx}` ? null : `${idx}-${cIdx}`)}
                            >
                              📎 {c.title} • {c.category} <span className="citation-score">({(c.relevanceScore * 100).toFixed(0)}% RRF)</span>
                            </button>
                          ))}
                        </div>

                        {/* Citation Detail Card */}
                        {m.citations.map((c, cIdx) => expandedCitation === `${idx}-${cIdx}` && (
                          <div key={cIdx} className="citation-detail-card">
                            <strong>Source: {c.title} [{c.category}]</strong>
                            <p>{c.excerpt}</p>
                            <small>Chunk #{c.chunkIndex} | Source ID: {c.sourceId}</small>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Triad Score Badge */}
                    {m.triad && (
                      <div className="rag-triad-pill-row">
                        <span className="triad-micro-badge">
                          🎯 Quality: {(m.triad.overallQuality * 100).toFixed(0)}%
                        </span>
                        <span className="triad-micro-badge">
                          ✓ Faithfulness: {(m.triad.faithfulness * 100).toFixed(0)}%
                        </span>
                        <span className="triad-micro-badge">
                          🔍 Context Relevance: {(m.triad.contextRelevance * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="rag-chat-bubble-wrap assistant">
                  <div className="rag-avatar assistant">🤖</div>
                  <div className="rag-bubble-content">
                    <div className="rag-typing-indicator">
                      <span></span><span></span><span></span>
                      <small>Running hybrid retrieval, RRF fusion, and anti-hallucination check...</small>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <form
              className="rag-input-form"
              onSubmit={(e) => {
                e.preventDefault()
                sendQuery()
              }}
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about sports courts, rates, shoe rules, cancellation policies..."
                disabled={loading}
              />
              <button type="submit" className="primary-btn rag-send-btn" disabled={!query.trim() || loading}>
                Ask RAG
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: RAG Pipeline & Triad Inspector */}
        {activeTab === 'pipeline' && (
          <div className="rag-pipeline-inspector">
            <div className="pipeline-overview-grid">
              <div className="inspector-card">
                <h5>Block A: Ingestion & Smart Chunking</h5>
                <p>1000 characters per chunk, 150 characters overlap (15%). Structured contextual headers keep context intact without breaking semantic boundaries.</p>
                <div className="inspector-stats">
                  <span>Chunk Size: <strong>1,000 chars</strong></span>
                  <span>Overlap: <strong>150 chars (15%)</strong></span>
                </div>
              </div>

              <div className="inspector-card">
                <h5>Block B: Dense Embeddings & MMR</h5>
                <p>64-dimensional semantic space with L2 unit-normalization. Cosine similarity = dot product. Maximal Marginal Relevance (MMR) balances relevance and diversity.</p>
                <div className="inspector-stats">
                  <span>Dimension: <strong>64-dim</strong></span>
                  <span>MMR λ: <strong>0.65</strong></span>
                </div>
              </div>

              <div className="inspector-card">
                <h5>Block C: Hybrid Retrieval & RRF</h5>
                <p>Combines dense semantic vector search with sparse BM25 keyword matching using Reciprocal Rank Fusion: <code>RRF(d) = Σ 1 / (60 + rank)</code>.</p>
                <div className="inspector-stats">
                  <span>RRF k: <strong>60</strong></span>
                  <span>Anti-Hallucination: <strong>Strict Guardrail</strong></span>
                </div>
              </div>

              <div className="inspector-card">
                <h5>Block D: Agent Memory State</h5>
                <p>Short-term sliding window buffer, semantic user facts extraction (Slide 52), and episodic session history.</p>
                <div className="inspector-stats">
                  <span>User Facts Extracted: <strong>{semanticMemory.length}</strong></span>
                </div>
              </div>
            </div>

            {/* Extracted Semantic Facts */}
            {semanticMemory.length > 0 && (
              <div className="inspector-section">
                <h4>Extracted Semantic User Memory (Slide 52)</h4>
                <div className="user-facts-grid">
                  {semanticMemory.map((fact, idx) => (
                    <div key={idx} className="user-fact-chip">
                      <strong>{fact.category}:</strong> {fact.fact}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Hybrid Candidates from last query */}
            {lastDiagnostics?.topCandidates && lastDiagnostics.topCandidates.length > 0 && (
              <div className="inspector-section">
                <h4>Last Query Hybrid Ranking Breakdown (Slide 32-34)</h4>
                <div className="hybrid-table-wrap">
                  <table className="hybrid-table">
                    <thead>
                      <tr>
                        <th>Chunk</th>
                        <th>Category</th>
                        <th>Dense Score</th>
                        <th>BM25 Score</th>
                        <th>RRF Score</th>
                        <th>MMR Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastDiagnostics.topCandidates.map((c, idx) => (
                        <tr key={idx}>
                          <td><strong>{c.title}</strong></td>
                          <td><span className="category-pill">{c.category}</span></td>
                          <td>{(c.denseScore * 100).toFixed(1)}%</td>
                          <td>{c.bm25Score.toFixed(2)}</td>
                          <td><strong>{(c.rrfScore * 100).toFixed(2)}%</strong></td>
                          <td>{(c.mmrScore * 100).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Automated Benchmark Evaluator */}
            <div className="inspector-section">
              <div className="eval-header-row">
                <div>
                  <h4>RAG Triad Evaluation Benchmarks (Slide 37)</h4>
                  <small>Checks Faithfulness, Context Relevance, and Answer Relevance across standard test scenarios.</small>
                </div>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={runEvaluation}
                  disabled={evalLoading}
                >
                  {evalLoading ? 'Running Triad Benchmarks...' : '⚡ Run Triad Evaluation'}
                </button>
              </div>

              {evalBenchmarks && (
                <div className="benchmarks-list">
                  {evalBenchmarks.benchmarks.map((b, idx) => (
                    <div key={idx} className="benchmark-card">
                      <div className="benchmark-header">
                        <strong>Q: {b.question}</strong>
                        <span className={`eval-badge ${b.guardrailTriggered ? 'guardrail' : 'passed'}`}>
                          {b.guardrailTriggered ? '🛡️ Guardrail Defended' : `Triad Score: ${(b.overallQuality * 100).toFixed(0)}%`}
                        </span>
                      </div>
                      <div className="benchmark-metrics-row">
                        <span>Faithfulness: <strong>{(b.faithfulness * 100).toFixed(0)}%</strong></span>
                        <span>Context Relevance: <strong>{(b.contextRelevance * 100).toFixed(0)}%</strong></span>
                        <span>Answer Relevance: <strong>{(b.answerRelevance * 100).toFixed(0)}%</strong></span>
                      </div>
                      <small className="eval-assessment">{b.assessment}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Launch 4-Agent Booking Workflow */}
        {activeTab === 'workflow' && (
          <div className="rag-workflow-tab">
            <div className="workflow-intro">
              <p>
                Plan complex multi-team tournaments and corporate sports days through the <b>4 Autonomous Specialized Agents</b>:
                Planning Coordinator ➔ Facility Analyst ➔ Deterministic Validation Engine ➔ Action Execution Agent.
              </p>
            </div>

            {/* Presets */}
            <div className="template-presets">
              <span className="preset-label">Quick Domain Presets:</span>
              <div className="preset-button-grid">
                {templates.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="preset-btn"
                    onClick={() => applyTemplate(t)}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>

            {workflowForm && (
              <form className="booking-form" onSubmit={onLaunchWorkflow}>
                <label>
                  <span>Domain Objective / Event Goal</span>
                  <input
                    value={workflowForm.objective}
                    onChange={(e) => onWorkflowFormChange('objective', e.target.value)}
                    placeholder="e.g. 16-Team Inter-University Badminton Championship"
                    required
                  />
                </label>

                <label>
                  <span>Sport / Facility Type</span>
                  <select value={workflowForm.facilityType} onChange={(e) => onWorkflowFormChange('facilityType', e.target.value)}>
                    <option>Badminton</option>
                    <option>Football</option>
                    <option>Swimming</option>
                    <option>Tennis</option>
                    <option>Basketball</option>
                    <option>Volleyball</option>
                    <option>Cricket</option>
                    <option>Fitness</option>
                  </select>
                </label>

                <div className="form-row">
                  <label>
                    <span>Date</span>
                    <input type="date" value={workflowForm.date} onChange={(e) => onWorkflowFormChange('date', e.target.value)} required />
                  </label>
                  <label>
                    <span>Start Time</span>
                    <input type="time" value={workflowForm.startTime} onChange={(e) => onWorkflowFormChange('startTime', e.target.value)} required />
                  </label>
                </div>

                <div className="form-row">
                  <label>
                    <span>End Time</span>
                    <input type="time" value={workflowForm.endTime} onChange={(e) => onWorkflowFormChange('endTime', e.target.value)} required />
                  </label>
                  <label>
                    <span>Participants / Guests (Max 30)</span>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={workflowForm.guests}
                      onChange={(e) => onWorkflowFormChange('guests', e.target.value)}
                      required
                    />
                  </label>
                </div>

                <label>
                  <span>Budget Ceiling (LKR)</span>
                  <input
                    type="number"
                    min="1"
                    value={workflowForm.budget}
                    onChange={(e) => onWorkflowFormChange('budget', e.target.value)}
                    placeholder="e.g. 35000"
                    required
                  />
                </label>

                <div className="agent-pipeline-preview">
                  <small>🔒 High-impact action (booking creation) is strictly gated by manager authorization.</small>
                </div>

                <div className="modal-actions">
                  <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
                  <button type="submit" className="primary-btn" disabled={isWorkflowLoading}>
                    {isWorkflowLoading ? 'Running 4-Agent Pipeline...' : '🚀 Launch Multi-Agent Workflow'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

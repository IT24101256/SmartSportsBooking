import { useEffect, useState } from 'react'

export default function SupportConversationPage({ request, token, apiBaseUrl, onBack }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!request) return
    fetch(`${apiBaseUrl}/dashboard/support-requests/${request.id}/messages`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Messages could not be loaded.')))
      .then(setMessages)
      .catch((reason) => setError(reason.message))
  }, [apiBaseUrl, request, token])

  const sendMessage = async (event) => {
    event.preventDefault()
    if (!draft.trim() || request.status !== 'UnderReview') return
    const response = await fetch(`${apiBaseUrl}/dashboard/support-requests/${request.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: draft.trim() }),
    })
    if (!response.ok) {
      setError(await response.text() || 'Message could not be sent.')
      return
    }
    const savedMessage = await response.json()
    setMessages((current) => [...current, savedMessage])
    setDraft('')
  }

  return (
    <section className="support-conversation-page">
      <button className="secondary-btn" type="button" onClick={onBack}>Back to support requests</button>
      <div className="support-conversation-shell">
        <header className="support-conversation-header">
          <div><p className="eyebrow subtle">Support conversation</p><h2>{request.title}</h2><span>{request.status} · {request.priority} priority</span></div>
          <span className={`support-status ${String(request.status).toLowerCase().replace('underreview', 'under-review')}`}>{request.status}</span>
        </header>
        <div className="support-conversation-summary"><strong>Original request</strong><p>{request.detail}</p></div>
        <div className="whatsapp-thread">
          {error && <p className="auth-feedback">{error}</p>}
          {!messages.length && !error && <p className="empty-state">No messages yet.</p>}
          {messages.map((message) => <div className="whatsapp-message" key={message.id}><strong>{message.senderName}</strong><span>{message.message}</span><small>{new Date(message.createdAtUtc).toLocaleString()}</small></div>)}
        </div>
        {request.status === 'UnderReview' ? <form className="whatsapp-composer" onSubmit={sendMessage}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message" /><button className="primary-btn" type="submit">Send</button></form> : <p className="conversation-locked">Chat is available while this request is under review.</p>}
      </div>
    </section>
  )
}

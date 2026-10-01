import { useState, useEffect, useRef } from 'react'
import './FloatingAiChat.css'

export default function FloatingAiChat({ apiBaseUrl = 'http://localhost:5187/api', token = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I am your **MySpot Knowledge Assistant**.\n\nAsk me anything about our facilities, hourly rates, operating hours, cancellation policies, weather rain-checks, or booking rules. How can I help you today?',
        sources: ['MySpot Knowledge Base'],
        suggestedFollowUps: [
          'What sports are available?',
          'What is the cancellation policy?',
          'What is the cheapest facility?',
          'How does Book With AI work?',
        ],
      },
    ]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState(() => {
    try {
      return sessionStorage.getItem('myspot_ai_chat_conv_id') || ''
    } catch {
      return ''
    }
  })

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, loading])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const sendMessage = async (textToSend) => {
    const text = (textToSend || input).trim()
    if (!text || loading) return

    setInput('')
    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${apiBaseUrl}/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          conversationId: conversationId || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('AI Assistant is currently unavailable.')
      }

      const data = await response.json()

      if (data.conversationId) {
        setConversationId(data.conversationId)
        try {
          sessionStorage.setItem('myspot_ai_chat_conv_id', data.conversationId)
        } catch {}
      }

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        suggestedFollowUps: data.suggestedFollowUps || [],
        toolInvocations: data.toolInvocations || [],
        retrievalRetries: data.retrievalRetries || 0,
        handledByLiveTool: data.handledByLiveTool,
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I had trouble connecting to the MySpot AI service. Please make sure the backend is running or try again shortly.',
          isError: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatText = (text) => {
    if (!text) return ''
    // basic markdown line breaks & bold
    const lines = text.split('\n')
    return lines.map((line, idx) => {
      let formatted = line
      // Bold **text**
      const parts = []
      let lastIndex = 0
      const regex = /\*\*(.*?)\*\*/g
      let match
      while ((match = regex.exec(formatted)) !== null) {
        if (match.index > lastIndex) {
          parts.push(formatted.substring(lastIndex, match.index))
        }
        parts.push(<strong key={match.index}>{match[1]}</strong>)
        lastIndex = regex.lastIndex
      }
      if (lastIndex < formatted.length) {
        parts.push(formatted.substring(lastIndex))
      }

      return (
        <span key={idx} className="chat-text-line">
          {parts.length > 0 ? parts : formatted}
          {idx < lines.length - 1 && <br />}
        </span>
      )
    })
  }

  return (
    <div className="floating-ai-chat-root">
      {/* Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          className="floating-ai-chat-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Open MySpot AI Assistant"
          title="Ask MySpot AI Assistant"
        >
          <span className="ai-btn-sparkle">✨</span>
          <span className="ai-btn-text">MySpot AI</span>
          <span className="ai-pulse-dot" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="floating-ai-window" role="dialog" aria-label="MySpot Knowledge Assistant">
          {/* Header */}
          <div className="ai-window-header">
            <div className="ai-header-left">
              <div className="ai-avatar-badge">
                <span>🤖</span>
                <span className="ai-status-indicator" />
              </div>
              <div className="ai-header-info">
                <h4>MySpot AI Assistant</h4>
                <p>Grounded Agentic Knowledge RAG</p>
              </div>
            </div>
            <div className="ai-header-actions">
              <button
                type="button"
                className="ai-icon-btn"
                onClick={() => {
                  setMessages([
                    {
                      id: 'welcome-reset',
                      role: 'assistant',
                      content: 'Chat refreshed. Ask me anything about MySpot sports, venues, hours, prices, or policies!',
                      sources: ['MySpot Knowledge Base'],
                      suggestedFollowUps: ['What sports are available?', 'What is the cancellation policy?'],
                    },
                  ])
                  setConversationId('')
                  try {
                    sessionStorage.removeItem('myspot_ai_chat_conv_id')
                  } catch {}
                }}
                title="Clear Chat"
              >
                🔄
              </button>
              <button
                type="button"
                className="ai-icon-btn ai-close-btn"
                onClick={() => setIsOpen(false)}
                title="Minimize Chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="ai-messages-container">
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-message-row ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                {msg.role === 'assistant' && <div className="ai-bubble-avatar">✨</div>}
                <div className={`ai-bubble ${msg.role} ${msg.isError ? 'error-bubble' : ''}`}>
                  <div className="ai-bubble-content">{formatText(msg.content)}</div>

                  {/* Tool Call Tag */}
                  {msg.toolInvocations?.length > 0 && (
                    <div className="ai-tool-pill">
                      <span>⚡ Live Verified: {msg.toolInvocations.join(', ')}</span>
                    </div>
                  )}

                  {/* Sources / Citations */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="ai-sources-row">
                      <span className="sources-label">Sources:</span>
                      {msg.sources.map((src, i) => (
                        <span key={i} className="ai-source-tag">
                          {src}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Suggested Follow-Ups */}
                  {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <div className="ai-suggestions-list">
                      {msg.suggestedFollowUps.map((q, i) => (
                        <button
                          key={i}
                          type="button"
                          className="ai-suggestion-chip"
                          onClick={() => sendMessage(q)}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-message-row assistant">
                <div className="ai-bubble-avatar">✨</div>
                <div className="ai-bubble assistant ai-loading-bubble">
                  <span className="ai-thinking-dot dot-1" />
                  <span className="ai-thinking-dot dot-2" />
                  <span className="ai-thinking-dot dot-3" />
                  <span className="ai-thinking-text">Searching MySpot knowledge base...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className="ai-window-footer">
            <div className="ai-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="ai-chat-input"
                placeholder="Ask about sports, prices, rules..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                type="button"
                className="ai-send-btn"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                title="Send Message"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <div className="ai-footer-note">
              <span>Grounded in MySpot policies • Verified backend tools</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

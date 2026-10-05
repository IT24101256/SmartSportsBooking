/* oxlint-disable react/set-state-in-effect */
/* oxlint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'

export default function SportCategoriesPage({ apiBaseUrl, token, onCategoriesChanged }) {
  const [categories, setCategories] = useState([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/sport-categories`)
      if (!response.ok) throw new Error('Failed to load sport categories.')
      setCategories(await response.json())
    } catch (error) {
      setFeedback(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [apiBaseUrl])

  const save = async (event) => {
    event.preventDefault()
    const value = name.trim()
    if (!value) return
    try {
      const response = await fetch(`${apiBaseUrl}/sport-categories${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify({ name: value }),
      })
      if (!response.ok) throw new Error(await response.text() || 'Could not save sport category.')
      setName('')
      setEditingId(null)
      setFeedback('')
      await load()
      onCategoriesChanged?.()
    } catch (error) {
      setFeedback(error.message)
    }
  }

  const remove = async (category) => {
    if (!window.confirm(`Delete "${category.name}"?`)) return
    const response = await fetch(`${apiBaseUrl}/sport-categories/${category.id}`, { method: 'DELETE', headers })
    if (!response.ok) {
      setFeedback(await response.text() || 'Could not delete sport category.')
      return
    }
    await load()
    onCategoriesChanged?.()
  }

  return (
    <section className="sport-categories-page">
      <div className="sport-categories-hero">
        <div>
          <div className="sport-categories-eyebrow"><span className="hub-pulse-dot" /> SPORTS CATALOG</div>
          <h1>Shape your sporting universe</h1>
          <p>Organize the disciplines that power your facilities, equipment, and bookings.</p>
        </div>
        <div className="sport-categories-hero-art" aria-hidden="true">🏆</div>
      </div>
      <div className="sport-categories-toolbar">
        <div>
          <span className="sport-categories-toolbar-title">{categories.length} active categories</span>
          <span className="sport-categories-toolbar-subtitle">Available across your admin forms</span>
        </div>
        <form onSubmit={save} className="sport-category-create-form">
          <input className="facility-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Tennis, Athletics..." aria-label="Category name" />
          <button className="primary-btn" type="submit">{editingId ? 'Save changes' : '+ Add category'}</button>
          {editingId && <button className="sport-category-cancel" type="button" onClick={() => { setEditingId(null); setName('') }}>Cancel</button>}
        </form>
      </div>
      {feedback && <div className="sport-category-feedback">{feedback}</div>}
      <div className="sport-categories-section-heading">
        <div><span className="eyebrow">YOUR CATALOG</span><h2>Sport categories</h2></div>
        <span>Used by facilities & equipment</span>
      </div>
      {loading ? <div className="sport-categories-loading"><span className="hub-pulse-dot" /> Loading your catalog...</div> : (
        <div className="sport-categories-grid">
          {categories.map((category, index) => (
            <article className={`sport-category-card sport-category-tone-${index % 6}`} key={category.id}>
              <div className="sport-category-card-top">
                <span className="sport-category-icon">{['🏸', '🏀', '🏏', '⚽', '🏊', '🏐'][index % 6]}</span>
                <span className="sport-category-index">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <h3>{category.name}</h3>
              <p>Facilities and equipment</p>
              <div className="sport-category-actions">
                <button className="sport-category-edit" type="button" onClick={() => { setEditingId(category.id); setName(category.name) }}>Edit</button>
                <button className="sport-category-delete" type="button" onClick={() => remove(category)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

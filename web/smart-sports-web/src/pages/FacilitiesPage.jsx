import { useState } from 'react'

const emptyFacility = { name: '', hourlyRate: '', description: '', faq: [], images: [], isAvailable: true }

export default function FacilitiesPage({ facilities, isAdmin, onDetails, onBook, onSave, onDelete }) {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyFacility)
  const [feedback, setFeedback] = useState('')

  const visibleFacilities = facilities
    .filter((facility) => `${facility.name} ${facility.description}`.toLowerCase().includes(search.toLowerCase()))
    .sort((left, right) => left.name.localeCompare(right.name))

  const openEditor = (facility = emptyFacility, id = 'new') => {
    setEditing(id)
    setForm({ ...emptyFacility, ...facility, faq: facility.faq ?? [], images: facility.images ?? [] })
    setFeedback('')
  }

  const addFaq = () => setForm((current) => ({ ...current, faq: [...current.faq, { question: '', answer: '' }] }))
  const updateFaq = (index, field, value) => setForm((current) => ({ ...current, faq: current.faq.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }))
  const removeFaq = (index) => setForm((current) => ({ ...current, faq: current.faq.filter((_, itemIndex) => itemIndex !== index) }))
  const addImages = (event) => {
    const files = Array.from(event.target.files ?? [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => setForm((current) => ({ ...current, images: [...current.images, String(reader.result)] }))
      reader.readAsDataURL(file)
    })
    event.target.value = ''
  }

  return (
    <section className="panel full-width-panel">
      <div className="panel-header">
        <div><h3>{isAdmin ? 'Manage facilities' : 'Available facilities'}</h3>{isAdmin && <span className="admin-badge">Admin access</span>}</div>
        <div className="modal-actions">{isAdmin && <button className="primary-btn" type="button" onClick={() => openEditor()}>Add facility</button>}</div>
      </div>
      <div className="filter-row">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search facilities" aria-label="Search facilities" />
      </div>
      <div className="facility-list">
        {visibleFacilities.map((facility) => (
          <article key={facility.id || facility.name} className={`facility-card ${facility.accent}`}>
            {facility.images?.[0]
              ? <img className="facility-image" src={facility.images[0]} alt="" />
              : <div className="facility-icon">{facility.icon}</div>}
            <div className="facility-body">
              <div className="facility-topline"><h4>{facility.name}</h4></div>
              <p>{facility.description || 'A quality SmartSports facility ready for your next session.'}</p>
              <div className="facility-meta"><strong>{facility.price}</strong><small>{facility.status}</small></div>
              <div className="modal-actions"><button className="secondary-btn" type="button" onClick={() => onDetails(facility)}>View details</button><button className="primary-btn" type="button" disabled={!facility.isAvailable} onClick={() => onBook(facility)}>Book now</button>{isAdmin && <><button className="secondary-btn" type="button" onClick={() => openEditor(facility, facility.id)}>Edit</button><button className="secondary-btn" type="button" onClick={async () => { if (!window.confirm(`Delete ${facility.name}?`)) return; try { await onDelete(facility.id) } catch (error) { setFeedback(error.message) } }}>Delete</button></>}</div>
            </div>
          </article>
        ))}
      </div>
      {editing && <div className="booking-modal-backdrop" onClick={() => setEditing(null)}>
        <div className="booking-modal facility-editor-modal" onClick={(event) => event.stopPropagation()}>
        <div className="booking-modal-header"><div><p className="eyebrow subtle">Facility administration</p><h3>{editing === 'new' ? 'Add facility' : 'Edit facility'}</h3></div><button type="button" className="close-btn" onClick={() => setEditing(null)}>×</button></div>
        {feedback && <p className="auth-feedback">{feedback}</p>}
        <form className="booking-form" onSubmit={async (event) => { event.preventDefault(); try { await onSave(form, editing === 'new' ? null : editing); setEditing(null) } catch (error) { setFeedback(error.message) } }}>
          <label><span>Name</span><input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
          <label><span>Hourly rate</span><input required type="number" min="0" step="0.01" value={form.hourlyRate} onChange={(event) => setForm((current) => ({ ...current, hourlyRate: event.target.value }))} /></label>
          <label><span>Description</span><textarea rows="3" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
          <fieldset className="repeatable-fieldset"><legend>FAQs</legend>{form.faq.map((item, index) => <div className="repeatable-row" key={`faq-${index}`}><input placeholder="Question" value={item.question} onChange={(event) => updateFaq(index, 'question', event.target.value)} /><input placeholder="Answer" value={item.answer} onChange={(event) => updateFaq(index, 'answer', event.target.value)} /><button className="secondary-btn" type="button" onClick={() => removeFaq(index)}>Remove</button></div>)}<button className="secondary-btn" type="button" onClick={addFaq}>+ Add FAQ</button></fieldset>
          <fieldset className="repeatable-fieldset"><legend>Images</legend><input type="file" accept="image/*" multiple onChange={addImages} />{form.images.length > 0 && <div className="image-preview-list">{form.images.map((image, index) => <div className="image-preview" key={`${image.slice(0, 20)}-${index}`}><img src={image} alt="" /><button className="secondary-btn" type="button" onClick={() => setForm((current) => ({ ...current, images: current.images.filter((_, imageIndex) => imageIndex !== index) }))}>Remove</button></div>)}</div>}<button className="secondary-btn" type="button" onClick={() => document.querySelector('.facility-image-input')?.click()}>+ Add image</button><input className="facility-image-input" type="file" accept="image/*" multiple onChange={addImages} hidden /></fieldset>
          <label><span><input type="checkbox" checked={form.isAvailable} onChange={(event) => setForm((current) => ({ ...current, isAvailable: event.target.checked }))} /> Available for booking</span></label>
          <div className="modal-actions"><button className="secondary-btn" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="primary-btn" type="submit">Save facility</button></div>
        </form>
        </div>
      </div>}
    </section>
  )
}

export default function FacilityDetailsPage({ facility, onBack, onBook }) {
  if (!facility) return null

  return (
    <section className="facility-details-page">
      <button className="secondary-btn" type="button" onClick={onBack}>Back to facilities</button>
      <div className="facility-detail-hero">
        <div>
          <p className="eyebrow subtle">Facility details</p>
          <h2>{facility.name}</h2>
          <p>{facility.description || 'A quality SmartSports facility ready for your next session.'}</p>
          <strong className="facility-detail-rate">LKR {Number(facility.hourlyRate || 0).toLocaleString()} / hour</strong>
          <div><button className="primary-btn" type="button" disabled={!facility.isAvailable} onClick={() => onBook(facility)}>Book this facility</button></div>
        </div>
        <div className="facility-detail-gallery">
          {(facility.images?.length ? facility.images : [null]).map((image, index) => image ? <img key={`${image.slice(0, 20)}-${index}`} src={image} alt={`${facility.name} view ${index + 1}`} /> : <div className="facility-gallery-placeholder" key="placeholder">{facility.icon}</div>)}
        </div>
      </div>
      <div className="facility-detail-grid">
        <section className="panel"><h3>Image gallery</h3><div className="facility-gallery-grid">{facility.images?.length ? facility.images.map((image, index) => <img key={`${image.slice(0, 20)}-${index}`} src={image} alt={`${facility.name} gallery ${index + 1}`} />) : <p className="empty-state">No gallery images have been added yet.</p>}</div></section>
        <section className="panel"><h3>Frequently asked questions</h3><div className="facility-faq-list">{facility.faq?.length ? facility.faq.map((item, index) => <details key={`${item.question}-${index}`}><summary>{item.question}</summary><p>{item.answer}</p></details>) : <p className="empty-state">No FAQs have been added yet.</p>}</div></section>
      </div>
    </section>
  )
}

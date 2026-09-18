import { useState } from 'react'

export default function FacilitiesPage({ facilities, onViewTimetable }) {
  const [search, setSearch] = useState('')
  const [availability, setAvailability] = useState('all')
  const [sort, setSort] = useState('name')

  const visibleFacilities = facilities
    .filter((facility) => `${facility.name} ${facility.type} ${facility.location}`.toLowerCase().includes(search.toLowerCase()))
    .filter((facility) => availability === 'all' || (availability === 'available' ? facility.status === 'Available now' : facility.status !== 'Available now'))
    .sort((left, right) => sort === 'type' ? left.type.localeCompare(right.type) : left.name.localeCompare(right.name))

  return (
    <section className="panel full-width-panel">
      <div className="panel-header">
        <h3>Available facilities</h3>
        <button className="text-action" type="button" onClick={onViewTimetable}>View timetable</button>
      </div>
      <div className="filter-row">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search facilities" aria-label="Search facilities" />
        <select value={availability} onChange={(event) => setAvailability(event.target.value)} aria-label="Filter facilities by availability">
          <option value="all">All availability</option>
          <option value="available">Available now</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort facilities">
          <option value="name">Sort by name</option>
          <option value="type">Sort by sport</option>
        </select>
      </div>
      <div className="facility-list">
        {visibleFacilities.map((facility) => (
          <div key={facility.name} className={`facility-card ${facility.accent}`}>
            <div className="facility-icon">{facility.icon}</div>
            <div className="facility-body">
              <div className="facility-topline"><h4>{facility.name}</h4><span>{facility.type}</span></div>
              <div className="facility-meta"><strong>{facility.price}</strong><small>{facility.status} · {facility.rating != null ? `${facility.rating} / 5 (${facility.ratingCount})` : 'No ratings yet'}</small></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

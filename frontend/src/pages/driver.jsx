import { useMemo, useState } from 'react'
import Layout from '../components/layout/layout'
import '../styles/driver.css'
import { mockSpots } from '../mocks/spots'
import MapView from '../components/map/map.jsx'

export default function DriverPage() {
    const [query, setQuery] = useState('')
    const [coveredOnly, setCoveredOnly] = useState('any')
    const [maxPrice, setMaxPrice] = useState('any')

    const spots = useMemo(() => {
        const q = query.trim().toLowerCase()

        return mockSpots.filter((s) => {
            if (q) {
                const hay = `${s.title} ${s.address}`.toLowerCase()
                if (!hay.includes(q)) return false
            }

            if (coveredOnly === 'covered' && !s.covered) return false
            if (coveredOnly === 'uncovered' && s.covered) return false

            if (maxPrice !== 'any') {
                const m = Number(maxPrice)
                if (!Number.isNaN(m) && s.pricePerHour > m) return false
            }

            return true
        })
    }, [query, coveredOnly, maxPrice])

    return (
        <Layout title="Find Parking">
            <div className="driver-grid">
                <div className="driver-map">
                    <MapView spots={spots} />
                </div>

                <div className="driver-side">
                    <div className="driver-filters">
                        <div className="driver-filter-row">
                            <input
                                className="driver-input"
                                style={{ flex: 1, minWidth: 220 }}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by address or area"
                            />

                            <select
                                className="driver-select"
                                value={coveredOnly}
                                onChange={(e) => setCoveredOnly(e.target.value)}
                            >
                                <option value="any">Any</option>
                                <option value="covered">Covered</option>
                                <option value="uncovered">Uncovered</option>
                            </select>

                            <select
                                className="driver-select"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                            >
                                <option value="any">Any price</option>
                                <option value="12">Up to 12</option>
                                <option value="15">Up to 15</option>
                                <option value="18">Up to 18</option>
                                <option value="22">Up to 22</option>
                            </select>
                        </div>
                    </div>

                    <div className="spot-list">
                        {spots.map((s) => (
                            <div key={s.id} className="spot-card">
                                <h3 className="spot-title">{s.title}</h3>
                                <p className="spot-meta">
                                    {s.address}
                                    <br />
                                    {s.availability}
                                </p>

                                <div className="spot-row">
                                    <div className="spot-badges">
                                        <span className="badge">₪{s.pricePerHour}/hr</span>
                                        <span className="badge">{s.distanceKm} km</span>
                                        <span className="badge">{s.covered ? 'Covered' : 'Uncovered'}</span>
                                        <span className="badge">★ {s.rating}</span>
                                    </div>

                                    <button className="ep-btn ep-btn-primary" type="button">
                                        View
                                    </button>
                                </div>
                            </div>
                        ))}

                        {spots.length === 0 && (
                            <div className="spot-card" style={{ cursor: 'default' }}>
                                <h3 className="spot-title">No results</h3>
                                <p className="spot-meta">Try adjusting your filters.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    )
}

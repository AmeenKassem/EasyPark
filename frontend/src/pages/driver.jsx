import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/driver.css'
import MapView from '../components/map/map.jsx'
import { mockSpots } from '../mocks/spots'

function IconPin({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 22s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <path
                d="M12 13.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
                stroke="currentColor"
                strokeWidth="1.8"
            />
        </svg>
    )
}

function IconUser({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 12a4.2 4.2 0 1 0-4.2-4.2A4.2 4.2 0 0 0 12 12Z"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <path
                d="M4.5 20.2c1.4-4.2 13.6-4.2 15 0"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    )
}

function IconSearch({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M10.5 18.5a8 8 0 1 1 5.2-14.1A8 8 0 0 1 10.5 18.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <path
                d="M16.8 16.8 21 21"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    )
}

function IconSliders({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h6M14 18h6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <path
                d="M14 6a2 2 0 1 0 0 .01ZM8 12a2 2 0 1 0 0 .01ZM12 18a2 2 0 1 0 0 .01Z"
                fill="currentColor"
            />
        </svg>
    )
}

function IconPlus({ size = 22 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
    )
}

export default function DriverPage() {
    const nav = useNavigate()

    const [address, setAddress] = useState('')
    const [filtersOpen, setFiltersOpen] = useState(false)

    const [coveredOnly, setCoveredOnly] = useState(false)
    const [activeOnly, setActiveOnly] = useState(true)
    const [maxPrice, setMaxPrice] = useState(100)

    const filteredSpots = useMemo(() => {
        const q = address.trim().toLowerCase()

        return (mockSpots || []).filter((s) => {
            if (activeOnly) {
                if (s.status && s.status !== 'active') return false
            }

            if (coveredOnly) {
                if (!s.covered) return false
            }

            if (Number.isFinite(maxPrice)) {
                const p = Number(s.pricePerHour)
                if (!Number.isNaN(p) && p > maxPrice) return false
            }

            if (q) {
                const hay = `${s.title ?? ''} ${s.address ?? ''}`.toLowerCase()
                if (!hay.includes(q)) return false
            }

            return true
        })
    }, [address, coveredOnly, activeOnly, maxPrice])

    return (
        <div className="map-screen">
            <div className="map-layer">
                <MapView spots={filteredSpots} />
            </div>

            <div className="overlay-root">
                <div className="topbar">
                    <div className="brand" onClick={() => nav('/driver')} role="button">
                        <span className="brand-badge" aria-hidden="true">
                            <IconPin size={18} />
                        </span>
                        <span className="brand-text">EasyPark</span>
                    </div>

                    <div className="topbar-right">
                        <button
                            className="profile-btn"
                            type="button"
                            onClick={() => nav('/profile')}
                            aria-label="Profile"
                        >
                            <span className="profile-avatar" aria-hidden="true">
                                <IconUser size={18} />
                            </span>
                        </button>
                    </div>
                </div>

                <div className="searchbar">
                    <span className="search-icon" aria-hidden="true">
                        <IconSearch size={18} />
                    </span>

                    <input
                        className="search-input"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Search location..."
                        autoComplete="off"
                    />

                    <button
                        className="filters-btn"
                        type="button"
                        onClick={() => setFiltersOpen(true)}
                        aria-label="Filters"
                    >
                        <IconSliders size={18} />
                    </button>
                </div>

                <button className="fab" type="button" onClick={() => nav('/owner')} aria-label="Add">
                    <IconPlus size={22} />
                </button>

                <div className="counter-pill">{filteredSpots.length} spots found</div>

                <div className={`sheet ${filtersOpen ? 'sheet-open' : ''}`}>
                    <div className="sheet-backdrop" onClick={() => setFiltersOpen(false)} role="button" tabIndex={-1} />

                    <div className="sheet-panel" role="dialog" aria-modal="true">
                        <div className="sheet-handle" />
                        <div className="sheet-header">
                            <div className="sheet-title">Filters</div>
                            <button className="sheet-close" type="button" onClick={() => setFiltersOpen(false)}>
                                Close
                            </button>
                        </div>

                        <div className="sheet-content">
                            <label className="sheet-row">
                                <span>Active only</span>
                                <input
                                    type="checkbox"
                                    checked={activeOnly}
                                    onChange={(e) => setActiveOnly(e.target.checked)}
                                />
                            </label>

                            <label className="sheet-row">
                                <span>Covered only</span>
                                <input
                                    type="checkbox"
                                    checked={coveredOnly}
                                    onChange={(e) => setCoveredOnly(e.target.checked)}
                                />
                            </label>

                            <div className="sheet-group">
                                <div className="sheet-group-top">
                                    <span>Max price</span>
                                    <span className="sheet-muted">{maxPrice}/hr</span>
                                </div>
                                <input
                                    className="sheet-range"
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                                />
                            </div>

                            <div className="sheet-actions">
                                <button
                                    className="sheet-reset"
                                    type="button"
                                    onClick={() => {
                                        setAddress('')
                                        setCoveredOnly(false)
                                        setActiveOnly(true)
                                        setMaxPrice(100)
                                    }}
                                >
                                    Reset
                                </button>

                                <button className="sheet-apply" type="button" onClick={() => setFiltersOpen(false)}>
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="safe-spacer" />
        </div>
    )
}

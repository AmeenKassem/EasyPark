import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Layout from '../components/layout/layout'
import Modal from '../components/modals/Modal.jsx'
import CreateParkingPage from './CreateParkingPage.jsx'
import '../styles/manageSpots.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

function authHeaders() {
    const token = localStorage.getItem('easypark_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
}

function normalizeSpotForUpdate(spot, overrides = {}) {
    const payload = {
        location: spot.location ?? '',
        lat: spot.lat ?? null,
        lng: spot.lng ?? null,
        pricePerHour: Number(spot.pricePerHour),
        covered: !!spot.covered,
        availableFrom: spot.availableFrom ?? null,
        availableTo: spot.availableTo ?? null,
        active: !!spot.active,
        ...overrides,
    }

    if (!payload.location || String(payload.location).trim().length === 0) {
        throw new Error('Missing location for this spot. Cannot update.')
    }
    if (!Number.isFinite(payload.pricePerHour) || payload.pricePerHour <= 0) {
        throw new Error('Invalid pricePerHour for this spot. Cannot update.')
    }

    return payload
}

export default function ManageSpotsPage() {
    const nav = useNavigate()

    const [spots, setSpots] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [tab, setTab] = useState('spots') // 'spots' | 'bookings'
    const [createOpen, setCreateOpen] = useState(false)
    const [detailsSpot, setDetailsSpot] = useState(null)

    const activeCount = useMemo(() => spots.filter((s) => !!s.active).length, [spots])
    const totalEarnings = 0
    const upcomingBookings = 0

    const fetchMySpots = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await axios.get(`${API_BASE}/api/parking-spots/my`, {
                headers: {
                    ...authHeaders(),
                },
            })
            setSpots(Array.isArray(res.data) ? res.data : [])
        } catch (e) {
            const status = e?.response?.status
            if (status === 401 || status === 403) {
                setError('No permission / not logged in.')
            } else {
                setError('Failed to load your spots.')
            }
            setSpots([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMySpots()
    }, [])

    const toggleActive = async (spot) => {
        setError('')
        try {
            const payload = normalizeSpotForUpdate(spot, { active: !spot.active })
            await axios.put(`${API_BASE}/api/parking-spots/${spot.id}`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders(),
                },
            })

            setSpots((prev) =>
                prev.map((s) => (s.id === spot.id ? { ...s, active: !spot.active } : s)),
            )
        } catch (e) {
            const msg =
                e?.message ||
                e?.response?.data?.message ||
                'Update failed. Please try again.'
            setError(msg)
        }
    }

    return (
        <Layout title="Manage Spots">
            <div className="ep-ms-page">
                <a
                    className="ep-ms-back"
                    href="#"
                    onClick={(e) => {
                        e.preventDefault()
                        nav('/driver')
                    }}
                >
                    ← Back to Home
                </a>

                <div className="ep-ms-topbar">
                    <div>
                        <div className="ep-ms-titleRow">
                            <div className="ep-ms-icon">📅</div>
                            <div>
                                <h1 className="ep-ms-h1">My Parking Spots</h1>
                                <div className="ep-ms-subtitle">Manage your listings and bookings</div>
                            </div>
                        </div>
                    </div>

                    <button className="ep-ms-primaryBtn" onClick={() => setCreateOpen(true)}>
                        + Add New Spot
                    </button>
                </div>

                {error && <div className="ep-ms-error">{error}</div>}

                <div className="ep-ms-cardsRow">
                    <div className="ep-ms-statCard">
                        <div className="ep-ms-statLabel">Total Earnings</div>
                        <div className="ep-ms-statValue">₪{totalEarnings}</div>
                    </div>

                    <div className="ep-ms-statCard">
                        <div className="ep-ms-statLabel">Active Spots</div>
                        <div className="ep-ms-statValue">{activeCount}</div>
                    </div>

                    <div className="ep-ms-statCard">
                        <div className="ep-ms-statLabel">Upcoming Bookings</div>
                        <div className="ep-ms-statValue">{upcomingBookings}</div>
                    </div>
                </div>

                <div className="ep-ms-tabs">
                    <button
                        className={`ep-ms-tab ${tab === 'spots' ? 'ep-ms-tabActive' : ''}`}
                        onClick={() => setTab('spots')}
                    >
                        My Spots ({spots.length})
                    </button>
                    <button
                        className={`ep-ms-tab ${tab === 'bookings' ? 'ep-ms-tabActive' : ''}`}
                        onClick={() => setTab('bookings')}
                    >
                        Bookings (0)
                    </button>
                </div>

                {tab === 'bookings' ? (
                    <div className="ep-ms-empty">
                        Bookings UI is not implemented yet. When you add bookings endpoints, we’ll wire it here.
                    </div>
                ) : (
                    <>
                        {loading ? (
                            <div className="ep-ms-empty">Loading your spots…</div>
                        ) : spots.length === 0 ? (
                            <div className="ep-ms-empty">
                                You don’t have any spots yet. Click <b>Add New Spot</b> to create one.
                            </div>
                        ) : (
                            <div className="ep-ms-grid">
                                {spots.map((spot) => {
                                    const title =
                                        spot.location?.toString().split('-')[0]?.trim() || 'Parking Spot'
                                    const address = spot.location || ''
                                    const price = spot.pricePerHour != null ? Number(spot.pricePerHour) : null

                                    return (
                                        <div className="ep-ms-spotCard" key={spot.id ?? `${spot.lat}-${spot.lng}`}>
                                            <div className="ep-ms-spotImage">
                                                {spot.covered ? <div className="ep-ms-badge">✓ Covered</div> : null}
                                            </div>

                                            <div className="ep-ms-spotBody">
                                                <h3 className="ep-ms-spotTitle">{title}</h3>

                                                <div className="ep-ms-spotMeta">
                                                    <span>📍</span>
                                                    <span>{address}</span>
                                                </div>

                                                <div className="ep-ms-priceRow">
                                                    <div className="ep-ms-price">
                                                        {price != null ? `₪${price} / hour` : '—'}
                                                    </div>

                                                    <div
                                                        className={`ep-ms-statusPill ${
                                                            spot.active ? 'ep-ms-statusOn' : 'ep-ms-statusOff'
                                                        }`}
                                                    >
                                                        {spot.active ? 'Active' : 'Inactive'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="ep-ms-actions">
                                                <button
                                                    className={`ep-ms-btn ${spot.active ? 'ep-ms-danger' : ''}`}
                                                    onClick={() => toggleActive(spot)}
                                                >
                                                    {spot.active ? 'Deactivate' : 'Activate'}
                                                </button>

                                                <button className="ep-ms-btn" onClick={() => setDetailsSpot(spot)}>
                                                    View Details
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}

                {createOpen && (
                    <Modal onClose={() => setCreateOpen(false)}>
                        <CreateParkingPage
                            onClose={() => setCreateOpen(false)}
                            onCreated={() => {
                                setCreateOpen(false)
                                fetchMySpots()
                            }}
                        />
                    </Modal>
                )}

                {detailsSpot && (
                    <Modal onClose={() => setDetailsSpot(null)}>
                        <div style={{ padding: 16 }}>
                            <h2 style={{ marginTop: 0 }}>Spot Details</h2>
                            <div style={{ display: 'grid', gap: 8, fontWeight: 700 }}>
                                <div>
                                    <span style={{ opacity: 0.7 }}>Location:</span> {detailsSpot.location}
                                </div>
                                <div>
                                    <span style={{ opacity: 0.7 }}>Price:</span> ₪{detailsSpot.pricePerHour}/hr
                                </div>
                                <div>
                                    <span style={{ opacity: 0.7 }}>Covered:</span>{' '}
                                    {detailsSpot.covered ? 'Yes' : 'No'}
                                </div>
                                <div>
                                    <span style={{ opacity: 0.7 }}>Active:</span>{' '}
                                    {detailsSpot.active ? 'Yes' : 'No'}
                                </div>
                                <div>
                                    <span style={{ opacity: 0.7 }}>Coordinates:</span>{' '}
                                    {detailsSpot.lat}, {detailsSpot.lng}
                                </div>
                            </div>
                        </div>
                    </Modal>
                )}
            </div>
        </Layout>
    )
}

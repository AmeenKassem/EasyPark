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
function fmt(dt) {
    if (!dt) return '—'
    return String(dt).replace('T', ' ').slice(0, 16)
}

function statusBadgeStyle(status) {
    const s = String(status || '').toUpperCase()

    if (s === 'PENDING') return { background: '#FEF3C7', color: '#92400E' }
    if (s === 'APPROVED') return { background: '#DCFCE7', color: '#166534' }
    if (s === 'REJECTED') return { background: '#FEE2E2', color: '#991B1B' }
    if (s === 'CANCELLED') return { background: '#E2E8F0', color: '#0f172a' }

    return { background: '#E2E8F0', color: '#0f172a' }
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
    const [bookings, setBookings] = useState([])
    const [bookingsLoading, setBookingsLoading] = useState(false)
    const [bookingsError, setBookingsError] = useState('')
    const [bookingSavingId, setBookingSavingId] = useState(null)
    // Edit modal state
    const [editOpen, setEditOpen] = useState(false)
    const [editSpot, setEditSpot] = useState(null)
    const [editSaving, setEditSaving] = useState(false)
    const [editError, setEditError] = useState('')
    const [editForm, setEditForm] = useState({
        pricePerHour: '',
        covered: false,
        active: true,
    })


    const [spots, setSpots] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [tab, setTab] = useState('spots') // 'spots' | 'bookings'
    const [createOpen, setCreateOpen] = useState(false)
    const [detailsSpot, setDetailsSpot] = useState(null)

    const activeCount = useMemo(() => spots.filter((s) => !!s.active).length, [spots])
    const totalEarnings = 0
    const upcomingBookings = 0
    const fetchOwnerBookings = async () => {
        setBookingsLoading(true)
        setBookingsError('')
        try {
            const res = await axios.get(`${API_BASE}/api/bookings/owner`, {
                headers: { ...authHeaders() },
            })
            setBookings(Array.isArray(res.data) ? res.data : [])
        } catch (e) {
            const status = e?.response?.status
            if (status === 401 || status === 403) {
                setBookingsError('No permission / not logged in.')
            } else {
                setBookingsError('Failed to load bookings.')
            }
            setBookings([])
        } finally {
            setBookingsLoading(false)
        }
    }

    useEffect(() => {
        fetchMySpots();
        fetchOwnerBookings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab])
    const updateBookingStatus = async (bookingId, status) => {
        setBookingSavingId(bookingId)
        setBookingsError('')
        try {
            await axios.put(
                `${API_BASE}/api/bookings/${bookingId}/status`,
                { status }, // "APPROVED" | "REJECTED"
                {
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeaders(),
                    },
                },
            )
            await fetchOwnerBookings()
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                e?.response?.data ||
                e?.message ||
                'Failed to update booking status.'
            setBookingsError(String(msg))
        } finally {
            setBookingSavingId(null)
        }
    }

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
    const openEditFor = (spot) => {
        setEditError('')
        setEditSpot(spot)
        setEditForm({
            pricePerHour: String(spot.pricePerHour ?? ''),
            covered: !!spot.covered,
            active: !!spot.active,
        })
        setEditOpen(true)
    }

    const saveEdit = async () => {
        if (!editSpot) return
        setEditSaving(true)
        setEditError('')
        setError('')

        try {
            const payload = normalizeSpotForUpdate(editSpot, {
                pricePerHour: parseFloat(editForm.pricePerHour),
                covered: !!editForm.covered,
                active: !!editForm.active,
            })

            await axios.put(`${API_BASE}/api/parking-spots/${editSpot.id}`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders(),
                },
            })

            setEditOpen(false)
            setEditSpot(null)
            await fetchMySpots()
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                e?.response?.data ||
                e?.message ||
                'Failed to update the spot.'
            setEditError(String(msg))
        } finally {
            setEditSaving(false)
        }
    }

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
                        Bookings ({bookings.length})

                    </button>
                </div>

                {tab === 'bookings' ? (
                    <>
                        {bookingsError && <div className="ep-ms-error">{bookingsError}</div>}

                        {bookingsLoading ? (
                            <div className="ep-ms-empty">Loading bookings…</div>
                        ) : bookings.length === 0 ? (
                            <div className="ep-ms-empty">No booking requests yet.</div>
                        ) : (
                            <div className="ep-ms-grid">
                                {bookings.map((b) => {
                                    const isPending = b.status === 'PENDING'

                                    return (
                                        <div className="ep-ms-spotCard" key={b.id}>
                                            <div className="ep-ms-spotBody">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                                    <div style={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <span style={{ color: '#0f172a' }}>Booking #{b.id}</span>
                                                        <span
                                                            style={{
                                                                ...statusBadgeStyle(b.status),
                                                                padding: '6px 10px',
                                                                borderRadius: 999,
                                                                fontWeight: 900,
                                                                fontSize: 12,
                                                                lineHeight: '12px',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                            {b.status}
                                        </span>
                                                    </div>

                                                    <div style={{ fontWeight: 900, color: '#0f172a' }}>
                                                        {b.totalPrice != null ? `₪${b.totalPrice}` : ''}
                                                    </div>
                                                </div>

                                                <div className="ep-ms-spotMeta" style={{ marginTop: 8 }}>
                                                    <span>🅿️</span>
                                                    <span>Parking ID: {b.parkingId}</span>
                                                </div>

                                                <div className="ep-ms-spotMeta">
                                                    <span>🕒</span>
                                                    <span>
                                        <b>Start:</b> {fmt(b.startTime)} &nbsp;&nbsp; <b>End:</b> {fmt(b.endTime)}
                                    </span>
                                                </div>
                                            </div>

                                            <div className="ep-ms-actions">
                                                {isPending ? (
                                                    <>
                                                        <button
                                                            className="ep-ms-btn"
                                                            disabled={bookingSavingId === b.id}
                                                            onClick={() => updateBookingStatus(b.id, 'APPROVED')}
                                                            style={{
                                                                background: '#16a34a',
                                                                border: 0,
                                                                color: 'white',
                                                                fontWeight: 900,
                                                            }}
                                                        >
                                                            {bookingSavingId === b.id ? 'Saving…' : 'Approve'}
                                                        </button>

                                                        <button
                                                            className="ep-ms-btn"
                                                            disabled={bookingSavingId === b.id}
                                                            onClick={() => updateBookingStatus(b.id, 'REJECTED')}
                                                            style={{
                                                                background: '#ef4444',
                                                                border: 0,
                                                                color: 'white',
                                                                fontWeight: 900,
                                                            }}
                                                        >
                                                            {bookingSavingId === b.id ? 'Saving…' : 'Reject'}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div style={{ fontWeight: 800, color: '#64748b', padding: '10px 6px' }}>
                                                        No actions available.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
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

                                                <button className="ep-ms-btn" onClick={() => openEditFor(spot)}>
                                                    Edit
                                                </button>

                                                <button className="ep-ms-btn ep-ms-btnWide" onClick={() => setDetailsSpot(spot)}>
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
                {editOpen && (
                    <Modal onClose={() => setEditOpen(false)}>
                        <div style={{ padding: 16, width: 'min(520px, 96vw)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                <h2 style={{ margin: 0 }}>Edit Spot</h2>
                                <button className="ep-ms-btn" onClick={() => setEditOpen(false)} disabled={editSaving}>
                                    Close
                                </button>
                            </div>

                            <div style={{ height: 10 }} />

                            {editError && (
                                <div className="ep-ms-error" style={{ marginBottom: 10 }}>
                                    {editError}
                                </div>
                            )}

                            <div style={{ display: 'grid', gap: 12 }}>
                                <div>
                                    <div style={{ fontWeight: 800, marginBottom: 6 }}>Price per hour (₪)</div>
                                    <input
                                        value={editForm.pricePerHour}
                                        onChange={(e) => setEditForm((p) => ({ ...p, pricePerHour: e.target.value }))}
                                        type="number"
                                        min="1"
                                        step="0.5"
                                        style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }}
                                    />
                                </div>

                                <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 800 }}>
                                    <input
                                        type="checkbox"
                                        checked={editForm.covered}
                                        onChange={(e) => setEditForm((p) => ({ ...p, covered: e.target.checked }))}
                                    />
                                    Covered
                                </label>

                                <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 800 }}>
                                    <input
                                        type="checkbox"
                                        checked={editForm.active}
                                        onChange={(e) => setEditForm((p) => ({ ...p, active: e.target.checked }))}
                                    />
                                    Active
                                </label>

                                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                                    <button className="ep-ms-btn" onClick={() => setEditOpen(false)} disabled={editSaving} style={{ flex: 1 }}>
                                        Cancel
                                    </button>
                                    <button className="ep-ms-btn" onClick={saveEdit} disabled={editSaving} style={{ flex: 1, fontWeight: 900 }}>
                                        {editSaving ? 'Saving…' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>
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

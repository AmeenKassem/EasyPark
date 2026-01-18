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
    const totalEarnings = 0 // Placeholder logic
    const upcomingBookings = 0 // Placeholder logic

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
                                                            style={{ background: '#16a34a', border: 0, color: 'white', fontWeight: 900 }}
                                                        >
                                                            {bookingSavingId === b.id ? 'Saving…' : 'Approve'}
                                                        </button>

                                                        <button
                                                            className="ep-ms-btn"
                                                            disabled={bookingSavingId === b.id}
                                                            onClick={() => updateBookingStatus(b.id, 'REJECTED')}
                                                            style={{ background: '#ef4444', border: 0, color: 'white', fontWeight: 900 }}
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
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginTop: '20px' }}>
                                {spots.map((spot) => {
                                    const title = spot.location?.toString().split(',')[0]?.trim() || 'Parking Spot'
                                    const fullAddress = spot.location || ''
                                    const price = spot.pricePerHour != null ? Number(spot.pricePerHour) : null

                                    return (
                                        <div key={spot.id ?? `${spot.lat}-${spot.lng}`} style={{
                                            backgroundColor: '#ffffff',
                                            borderRadius: '16px',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
                                            overflow: 'hidden',
                                            border: '1px solid #f1f5f9',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            transition: 'transform 0.2s ease',
                                        }}>
                                            {/* Decorative Top Bar / Image Placeholder */}
                                            <div style={{
                                                height: '80px',
                                                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                position: 'relative'
                                            }}>
                                                <span style={{ fontSize: '32px' }}>🅿️</span>
                                                {spot.covered && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '12px',
                                                        right: '12px',
                                                        backgroundColor: '#2563eb',
                                                        color: 'white',
                                                        fontSize: '11px',
                                                        fontWeight: '700',
                                                        padding: '4px 8px',
                                                        borderRadius: '20px',
                                                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                                                    }}>
                                                        ✓ Covered
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                {/* Title & Address */}
                                                <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
                                                    {title}
                                                </h3>
                                                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    📍 {fullAddress}
                                                </div>

                                                {/* Price */}
                                                <div style={{ marginBottom: '20px' }}>
                                                    <span style={{ fontSize: '20px', fontWeight: '800', color: '#059669' }}>
                                                        ₪{price}
                                                    </span>
                                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}> / hour</span>
                                                </div>

                                                {/* Divider */}
                                                <div style={{ height: '1px', backgroundColor: '#f1f5f9', width: '100%', marginBottom: '16px', marginTop: 'auto' }}></div>

                                                {/* Actions & Toggle */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                                                    {/* Toggle Switch (Modern Style) */}
                                                    <div
                                                        onClick={() => toggleActive(spot)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            cursor: 'pointer',
                                                            userSelect: 'none'
                                                        }}
                                                    >
                                                        <div style={{
                                                            width: '44px',
                                                            height: '24px',
                                                            backgroundColor: spot.active ? '#10b981' : '#cbd5e1',
                                                            borderRadius: '99px',
                                                            position: 'relative',
                                                            transition: 'background-color 0.2s ease',
                                                            flexShrink: 0
                                                        }}>
                                                            <div style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                backgroundColor: 'white',
                                                                borderRadius: '50%',
                                                                position: 'absolute',
                                                                top: '2px',
                                                                left: spot.active ? '22px' : '2px',
                                                                transition: 'left 0.2s ease',
                                                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                                            }} />
                                                        </div>
                                                        <span style={{ fontSize: '12px', fontWeight: '600', color: spot.active ? '#10b981' : '#94a3b8' }}>
                                                            {spot.active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>

                                                    {/* Edit / Details Buttons */}
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            onClick={() => openEditFor(spot)}
                                                            style={{
                                                                background: 'transparent',
                                                                border: '1px solid #e2e8f0',
                                                                borderRadius: '8px',
                                                                padding: '6px 10px',
                                                                fontSize: '12px',
                                                                fontWeight: '600',
                                                                color: '#475569',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#1e293b' }}
                                                            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => setDetailsSpot(spot)}
                                                            style={{
                                                                background: 'transparent',
                                                                border: '1px solid #e2e8f0',
                                                                borderRadius: '8px',
                                                                padding: '6px 10px',
                                                                fontSize: '12px',
                                                                fontWeight: '600',
                                                                color: '#475569',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#1e293b' }}
                                                            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569' }}
                                                        >
                                                            Details
                                                        </button>
                                                    </div>
                                                </div>
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

                {/* --- EDIT SPOT MODAL --- */}
                {editOpen && (
                    <Modal onClose={() => setEditOpen(false)}>
                        <div style={{ width: '360px', maxWidth: '90vw', boxSizing: 'border-box', margin: '0 auto' }}>
                            {/* Header */}
                            <div style={{ marginBottom: '24px' }}>
                                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>Edit Spot</h2>
                            </div>

                            {/* Error */}
                            {editError && (
                                <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '10px', fontSize: '14px' }}>
                                    {editError}
                                </div>
                            )}

                            {/* Price Input */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Price per Hour</label>
                                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '12px', height: '50px', overflow: 'hidden' }}>
                                    <button
                                        onClick={() => setEditForm(p => ({ ...p, pricePerHour: Math.max(0, parseFloat(p.pricePerHour || 0) - 0.5) }))}
                                        style={{ width: '50px', height: '100%', border: 'none', background: '#f8fafc', color: '#64748b', fontSize: '20px', cursor: 'pointer' }}>−</button>
                                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
                                        <input
                                            type="number"
                                            value={editForm.pricePerHour}
                                            onChange={(e) => setEditForm(p => ({ ...p, pricePerHour: e.target.value }))}
                                            style={{ width: '60px', border: 'none', fontSize: '18px', fontWeight: '700', textAlign: 'right', outline: 'none', color: '#1e293b' }}
                                        />
                                        <span style={{ fontSize: '18px', fontWeight: '700', color: '#64748b' }}>₪</span>
                                    </div>
                                    <button
                                        onClick={() => setEditForm(p => ({ ...p, pricePerHour: (parseFloat(p.pricePerHour || 0) + 0.5) }))}
                                        style={{ width: '50px', height: '100%', border: 'none', background: '#f8fafc', color: '#64748b', fontSize: '20px', cursor: 'pointer' }}>+</button>
                                </div>
                            </div>

                            {/* Toggles Section  */}
                            <div style={{ marginBottom: '30px' }}>
                                <div
                                    onClick={() => setEditForm(p => ({ ...p, covered: !p.covered }))}
                                    style={{
                                        padding: '16px',
                                        borderRadius: '16px',
                                        border: `1px solid ${editForm.covered ? '#3b82f6' : '#e2e8f0'}`,
                                        backgroundColor: editForm.covered ? '#eff6ff' : '#fff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        width: '100%',
                                        boxSizing: 'border-box'
                                    }}>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: editForm.covered ? '#1e40af' : '#64748b' }}>Is Covered?</span>

                                    {/* Toggle Visual */}
                                    <div style={{ width: '44px', height: '24px', backgroundColor: editForm.covered ? '#3b82f6' : '#cbd5e1', borderRadius: '20px', position: 'relative' }}>
                                        <div style={{ width: '20px', height: '20px', backgroundColor: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: editForm.covered ? '22px' : '2px', transition: 'left 0.2s' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setEditOpen(false)}
                                    style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontWeight: '600', color: '#64748b', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button
                                    onClick={saveEdit}
                                    disabled={editSaving}
                                    style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', fontWeight: '600', color: '#fff', cursor: 'pointer', opacity: editSaving ? 0.7 : 1 }}>
                                    {editSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}
                {/* --- DETAILS MODAL --- */}
                {detailsSpot && (
                    <Modal onClose={() => setDetailsSpot(null)}>

                        <div style={{ width: '360px', maxWidth: '90vw', borderRadius: '16px', overflow: 'hidden', margin: '0 auto', backgroundColor: '#fff' }}>
                            {/* Map Header Placeholder */}
                            <div style={{ height: '100px', width: '100%', background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', borderBottom: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '40px' }}>🅿️</div>
                            </div>

                            <div style={{ padding: '24px' }}>
                                <h2 style={{ marginTop: 0, marginBottom: '4px', fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{detailsSpot.location?.split(',')[0]}</h2>
                                <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>{detailsSpot.location}</p>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                                    <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Price</div>
                                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#059669' }}>₪{detailsSpot.pricePerHour}/hr</div>
                                    </div>
                                    <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Status</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: detailsSpot.active ? '#10b981' : '#ef4444' }} />
                                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>{detailsSpot.active ? 'Active' : 'Inactive'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px dashed #bfdbfe', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e40af' }}>Features</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {detailsSpot.covered ? (
                                            <span style={{ padding: '4px 10px', backgroundColor: '#ffffff', color: '#2563eb', borderRadius: '20px', fontSize: '12px', fontWeight: '700', boxShadow: '0 1px 2px rgba(37,99,235,0.1)' }}>✓ Covered</span>
                                        ) : (
                                            <span style={{ padding: '4px 10px', backgroundColor: '#ffffff', color: '#64748b', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: '1px solid #e2e8f0' }}>Uncovered</span>
                                        )}
                                        <span style={{ padding: '4px 10px', backgroundColor: '#ffffff', color: '#64748b', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: '1px solid #e2e8f0' }}>
                                            {detailsSpot.lat && detailsSpot.lng ? `${detailsSpot.lat.toFixed(4)}, ${detailsSpot.lng.toFixed(4)}` : 'No Coords'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Modal>
                )}
            </div>
        </Layout>
    )
}
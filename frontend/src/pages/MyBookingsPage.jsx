import { useEffect, useState, useMemo } from 'react'
import Layout from '../components/layout/layout'
import { cancelBooking, getMyBookings,rateParking } from '../services/booking'
import '../styles/auth.css'

function fmt(dt) {
    if (!dt) return ''

    return dt.replace('T', ' ').slice(0, 16)
}

function statusBadgeStyle(status) {
    const s = String(status || '').toUpperCase()

    if (s === 'PENDING') return { background: '#FEF3C7', color: '#92400E' }
    if (s === 'APPROVED') return { background: '#DCFCE7', color: '#166534' }
    if (s === 'REJECTED') return { background: '#FEE2E2', color: '#991B1B' }
    if (s === 'CANCELLED') return { background: '#E2E8F0', color: '#0f172a' }

    return { background: '#E2E8F0', color: '#0f172a' }
}

function extractErrorMessage(e, fallback) {
    const data = e?.response?.data
    if (typeof data === 'string') return data
    if (data && typeof data === 'object') {
        if (data.message) return String(data.message)
        if (data.error) return String(data.error)
    }
    if (e?.message) return String(e.message)
    return fallback
}

function canCancelBooking(b) {
    const status = String(b?.status || '').toUpperCase()
    if (status !== 'PENDING') return false
    if (!b?.startTime) return false

    const start = new Date(b.startTime)
    if (Number.isNaN(start.getTime())) return false

    return start > new Date()
}


export default function MyBookingsPage() {
    const [loading, setLoading] = useState(true)
    const [savingId, setSavingId] = useState(null)
    const [items, setItems] = useState([])
    const [feedback, setFeedback] = useState({ message: '', isError: false })
    const [ratingByBooking, setRatingByBooking] = useState({})
    const [ratingSavingId, setRatingSavingId] = useState(null)

    const upcomingCount = useMemo(() => {
        const now = new Date()
        return items.filter(b => {
            const isFuture = b.startTime && new Date(b.startTime) > now
            const isActive = b.status === 'APPROVED' || b.status === 'PENDING'
            return isFuture && isActive
        }).length
    }, [items])

    const load = async () => {
        setLoading(true)
        setFeedback({ message: '', isError: false })
        try {
            const data = await getMyBookings()
            setItems(Array.isArray(data) ? data : [])
        } catch (e) {
            setFeedback({
                message: extractErrorMessage(e, 'Failed to load bookings.'),
                isError: true,
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const doCancel = async (id) => {
        setSavingId(id)
        setFeedback({ message: '', isError: false })
        try {
            await cancelBooking(id)
            await load()
            setFeedback({ message: 'Booking cancelled.', isError: false })
        } catch (e) {
            setFeedback({
                message: extractErrorMessage(e, 'Failed to cancel booking.'),
                isError: true,
            })
        } finally {
            setSavingId(null)
        }
    }
    const isApprovedBooking = (b) =>
        String(b?.status || '').toUpperCase() === 'APPROVED'

    const handleRatingChange = (bookingId, value) => {
        setRatingByBooking((prev) => ({
            ...prev,
            [bookingId]: value,
        }))
    }

    const doRate = async (booking) => {
        const selected = Number(ratingByBooking[booking.id])

        if (!selected || selected < 1 || selected > 5) {
            setFeedback({
                message: 'Please choose a rating between 1 and 5.',
                isError: true,
            })
            return
        }

        setRatingSavingId(booking.id)
        setFeedback({ message: '', isError: false })

        try {
            await rateParking(booking.parkingId, selected)
            setFeedback({ message: 'Rating submitted successfully.', isError: false })
        } catch (e) {
            setFeedback({
                message: extractErrorMessage(e, 'Failed to submit rating.'),
                isError: true,
            })
        } finally {
            setRatingSavingId(null)
        }
    }
    return (
        <Layout title="">
            <div className="auth-wrap" style={{ minHeight: 'calc(100vh - 80px)' }}>
                <div className="auth-card" style={{ maxWidth: 860, textAlign: 'left' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h1 className="auth-title" style={{ margin: 0 }}>
                            My Bookings
                        </h1>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Upcoming Bookings</span>
                            <span style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>{upcomingCount}</span>
                        </div>

                        <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Total Bookings</span>
                            <span style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>{items.length}</span>
                        </div>
                    </div>

                    {feedback.message && (
                        <div
                            style={{
                                marginTop: 14,
                                padding: 10,
                                borderRadius: 10,
                                background: feedback.isError ? '#fee2e2' : '#dcfce7',
                                color: feedback.isError ? '#991b1b' : '#166534',
                                fontWeight: 700,
                            }}
                        >
                            {feedback.message}
                        </div>
                    )}

                    {loading ? (
                        <div style={{ padding: 10 }}>Loading...</div>
                    ) : items.length === 0 ? (
                        <div style={{ padding: 10, fontWeight: 700, color: '#334155' }}>
                            No bookings yet.
                        </div>
                    ) : (
                        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                            {items.map((b) => {
                                const canCancel = canCancelBooking(b)
                                const isApproved = String(b.status || '').toUpperCase() === 'APPROVED'

                                return (
                                    <div
                                        key={b.id}
                                        style={{
                                            border: '1px solid rgba(0,0,0,0.12)',
                                            borderRadius: 12,
                                            padding: 12,
                                            display: 'grid',
                                            gap: 6,
                                        }}
                                    >
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

                                            <div style={{ fontWeight: 900 }}>
                                                {b.totalPrice != null ? `₪${b.totalPrice}` : ''}
                                            </div>
                                        </div>

                                        <div style={{ color: '#334155', fontWeight: 700 }}>
                                            Parking: {b.parkingLocation || '—'}
                                            <span style={{ marginLeft: 8, color: '#64748b', fontWeight: 600, fontSize: 12 }}>
                                                (ID: {b.parkingId})
                                            </span>
                                        </div>

                                        <div style={{ color: '#334155' }}>
                                            <strong>Start:</strong> {fmt(b.startTime)} &nbsp;&nbsp;
                                            <strong>End:</strong> {fmt(b.endTime)}
                                        </div>


                                        {isApproved && (
                                            <div style={{
                                                marginTop: 8,
                                                padding: '8px 12px',
                                                backgroundColor: '#f0fdf4',
                                                border: '1px solid #bbf7d0',
                                                borderRadius: '8px',
                                                color: '#166534',
                                                fontSize: '13px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <span style={{ fontSize: '16px' }}>📞</span>
                                                <span><strong>Owner Contact:</strong> {b.ownerPhone || 'Not available'}</span>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                                            <button
                                                type="button"
                                                className="auth-primary"
                                                style={{
                                                    width: 160,
                                                    background: canCancel ? '#ef4444' : '#94a3b8',
                                                    cursor: canCancel ? 'pointer' : 'not-allowed',
                                                }}
                                                disabled={!canCancel || savingId === b.id}
                                                title={!canCancel ? 'Cancellation is allowed only before the booking start time.' : ''}
                                                onClick={() => doCancel(b.id)}
                                            >
                                                {savingId === b.id ? 'Cancelling...' : 'Cancel'}
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    )
}
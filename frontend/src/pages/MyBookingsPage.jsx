import { useEffect, useState } from 'react'
import Layout from '../components/layout/layout'
import { cancelBooking, getMyBookings } from '../services/booking'
import '../styles/auth.css'

function fmt(dt) {
    if (!dt) return ''
    // dt is ISO like "2026-01-05T10:00:00"
    return dt.replace('T', ' ').slice(0, 16)
}

export default function MyBookingsPage() {
    const [loading, setLoading] = useState(true)
    const [savingId, setSavingId] = useState(null)
    const [items, setItems] = useState([])
    const [feedback, setFeedback] = useState({ message: '', isError: false })

    const load = async () => {
        setLoading(true)
        setFeedback({ message: '', isError: false })
        try {
            const data = await getMyBookings()
            setItems(Array.isArray(data) ? data : [])
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                e?.response?.data ||
                e?.message ||
                'Failed to load bookings.'
            setFeedback({ message: String(msg), isError: true })
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
            const msg =
                e?.response?.data?.message ||
                e?.response?.data ||
                e?.message ||
                'Failed to cancel booking.'
            setFeedback({ message: String(msg), isError: true })
        } finally {
            setSavingId(null)
        }
    }

    return (
        <Layout title="">
            <div className="auth-wrap" style={{ minHeight: 'calc(100vh - 80px)' }}>
                <div className="auth-card" style={{ maxWidth: 860, textAlign: 'left' }}>
                    <div className="auth-title" style={{ marginTop: 0 }}>
                        My Bookings
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
                            {items.map((b) => (
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
                                        <div style={{ fontWeight: 900 }}>
                                            Booking #{b.id} — {b.status}
                                        </div>
                                        <div style={{ fontWeight: 900 }}>
                                            {b.totalPrice != null ? `₪${b.totalPrice}` : ''}
                                        </div>
                                    </div>

                                    <div style={{ color: '#334155', fontWeight: 700 }}>
                                        Parking ID: {b.parkingId}
                                    </div>

                                    <div style={{ color: '#334155' }}>
                                        <strong>Start:</strong> {fmt(b.startTime)} &nbsp;&nbsp;
                                        <strong>End:</strong> {fmt(b.endTime)}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                                        <button
                                            type="button"
                                            className="auth-primary"
                                            style={{ width: 160, background: '#ef4444' }}
                                            disabled={savingId === b.id}
                                            onClick={() => doCancel(b.id)}
                                        >
                                            {savingId === b.id ? 'Cancelling...' : 'Cancel'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    )
}

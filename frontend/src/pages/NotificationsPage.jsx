import { useEffect, useState } from 'react'
import Layout from '../components/layout/layout'
import { getCurrentUser } from '../services/session'
import { getMyNotifications, markAllNotificationsRead, clearNotifications, notifyNotificationsChanged } from '../services/notifications'

const formatDate = (iso) => {
    try {
        return new Date(iso).toLocaleString([], {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    } catch {
        return iso
    }
}

export default function NotificationsPage() {
    const user = getCurrentUser()
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const [clearLoading, setClearLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!user?.id) return
        const loadNotifications = async () => {
            setError('')
            setLoading(true)
            try {
                const list = await getMyNotifications()
                setNotifications(list)
                await markAllNotificationsRead()
                notifyNotificationsChanged()
            } catch (e) {
                setError('Failed to load notifications. Please try again.')
            } finally {
                setLoading(false)
            }
        }

        loadNotifications()
    }, [user?.id])

    const handleClear = async () => {
        if (clearLoading) return
        setError('')
        setClearLoading(true)
        try {
            await clearNotifications()
            setNotifications([])
            notifyNotificationsChanged()
        } catch (e) {
            setError('Failed to clear notifications. Please try again.')
        } finally {
            setClearLoading(false)
        }
    }

    return (
        <Layout title="Notifications">
            <div className="ep-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>Your latest notifications</div>
                    <div style={{ color: '#64748b', marginTop: 4 }}>All new notifications are shown here.</div>
                </div>
                <button className="ep-btn" type="button" onClick={handleClear} disabled={!notifications.length || clearLoading}>
                    {clearLoading ? 'Clearing…' : 'Clear all'}
                </button>
            </div>

            {error && (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>
                    {error}
                </div>
            )}

            {loading ? (
                <div style={{ marginTop: 24, padding: 24, borderRadius: 16, background: '#f8fafc', color: '#475569', fontWeight: 600, textAlign: 'center' }}>
                    Loading notifications...
                </div>
            ) : notifications.length === 0 ? (
                <div style={{ marginTop: 24, padding: 24, borderRadius: 16, background: '#f8fafc', color: '#475569', fontWeight: 600, textAlign: 'center' }}>
                    No notifications yet. New notifications will appear here.
                </div>
            ) : (
                <div style={{ marginTop: 24, display: 'grid', gap: 14 }}>
                    {notifications.map((item) => (
                        <div key={item.id} style={{ borderRadius: 18, background: item.isRead ? '#f8fafc' : '#eff6ff', border: '1px solid #e2e8f0', padding: 18 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{item.title}</div>
                                <div style={{ fontSize: 13, color: '#64748b' }}>{formatDate(item.createdAt)}</div>
                            </div>
                            <div style={{ color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{item.message || 'No details available.'}</div>
                        </div>
                    ))}
                </div>
            )}
        </Layout>
    )
}

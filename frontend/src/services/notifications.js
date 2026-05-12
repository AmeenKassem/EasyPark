import axios from 'axios'
import { API_BASE_URL } from '../config.js'

const API_BASE = API_BASE_URL
const NOTIFICATION_EVENT = 'easypark_notifications_changed'

function authHeaders() {
    const token = localStorage.getItem('easypark_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
}

export function notifyNotificationsChanged() {
    window.dispatchEvent(new Event(NOTIFICATION_EVENT))
}

export function subscribeNotificationsChanged(handler) {
    window.addEventListener(NOTIFICATION_EVENT, handler)
    return () => window.removeEventListener(NOTIFICATION_EVENT, handler)
}

export async function getMyNotifications() {
    const res = await axios.get(`${API_BASE}/api/notifications`, {
        headers: authHeaders(),
    })
    return res.data || []
}

export async function getUnreadNotificationCount() {
    const res = await axios.get(`${API_BASE}/api/notifications/unread-count`, {
        headers: authHeaders(),
    })
    return res.data?.count ?? 0
}

export async function markAllNotificationsRead() {
    const res = await axios.put(`${API_BASE}/api/notifications/read-all`, null, {
        headers: authHeaders(),
    })
    return res.data || []
}

export async function clearNotifications() {
    const res = await axios.delete(`${API_BASE}/api/notifications`, {
        headers: authHeaders(),
    })
    return res.data || []
}

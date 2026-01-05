import axios from 'axios'

const API_BASE = 'http://localhost:8080'

function authHeaders() {
    const token = localStorage.getItem('easypark_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function createBooking({ parkingId, startTime, endTime }) {
    const res = await axios.post(
        `${API_BASE}/api/bookings`,
        { parkingId, startTime, endTime },
        { headers: authHeaders() },
    )
    return res.data
}

export async function getMyBookings() {
    const res = await axios.get(`${API_BASE}/api/bookings/my`, {
        headers: authHeaders(),
    })
    return res.data
}

export async function cancelBooking(id) {
    const res = await axios.put(`${API_BASE}/api/bookings/${id}/cancel`, null, {
        headers: authHeaders(),
    })
    return res.data
}

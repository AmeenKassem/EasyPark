const STORAGE_KEY = 'easypark_user'
const TOKEN_KEY = 'easypark_token'

export function getCurrentUser() {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
}

export function isAuthenticated() {
    return !!getCurrentUser()
}

export function loginMock({ fullName, roles }) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            fullName,
            roles,
        })
    )
}

// Real login helper (works for email/password + Google login)
export function loginUser({ user, token }) {
    if (token) localStorage.setItem(TOKEN_KEY, token)

    const role = user?.role
    const roles = role ? [role] : ['DRIVER']

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            id: user?.id,
            fullName: user?.fullName,
            email: user?.email,
            roles,
        })
    )
}

export function logout() {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(TOKEN_KEY)
}

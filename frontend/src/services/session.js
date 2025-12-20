const STORAGE_KEY = 'easypark_user'

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

export function logout() {
    localStorage.removeItem(STORAGE_KEY)
}

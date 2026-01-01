import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { getCurrentUser, logout, subscribeAuthChanged } from '../../services/session'
import '../../styles/layout.css'
import ProfileModal from '../modals/ProfileModal' // adjust path if needed
const linkClass = ({ isActive }) =>
    isActive ? 'ep-link ep-link-active' : 'ep-link'

export default function Layout({ title, children }) {
    const nav = useNavigate()
    const location = useLocation()
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const [user, setUser] = useState(getCurrentUser())

    useEffect(() => {
        // initial sync (covers cases where storage changed before mount)
        setUser(getCurrentUser())

        // re-render when auth changes
        return subscribeAuthChanged(() => {
            setUser(getCurrentUser())
        })
    }, [])

    const roles = new Set(user?.roles ?? [])

    // Auth screens should look like a mobile app landing (no header/top nav)
    const isAuthRoute = ['/', '/login', '/register', '/reset-password'].includes(
        location.pathname
    )
    useEffect(() => {
        setUserMenuOpen(false)
    }, [location.pathname])


    return (
        <div className={isAuthRoute ? 'ep-app ep-app-auth' : 'ep-app'}>
            {!isAuthRoute && (
                <header className="ep-header">
                    <div>
                        <span style={{ fontSize: 18 }}>🅿️</span>
                        <span>EasyPark</span>
                    </div>

                    <nav className="ep-nav">
                        {roles.has('DRIVER') && (
                            <NavLink to="/driver" className={linkClass}>
                                Find Parking
                            </NavLink>
                        )}

                        {roles.has('OWNER') && (
                            <NavLink to="/owner" className={linkClass}>
                                Manage Spots
                            </NavLink>
                        )}
                    </nav>

                    <div className="ep-actions">
                        {user ? (
                            <div style={{ position: 'relative', display: 'flex', gap: 10, alignItems: 'center' }}>
                                <button
                                    type="button"
                                    className="ep-chip"
                                    onClick={() => setUserMenuOpen((v) => !v)}
                                    style={{ cursor: 'pointer' }}

                                    title="Account"
                                >
                                    {user.fullName} • {(user?.roles ?? []).join(' / ')}

                                </button>

                                {userMenuOpen && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            right: 0,
                                            top: 'calc(100% + 8px)',
                                            minWidth: 180,
                                            background: 'white',
                                            color: '#0f172a',
                                            border: '1px solid rgba(0,0,0,0.12)',
                                            borderRadius: 10,
                                            padding: 8,
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                            zIndex: 50,
                                        }}
                                    >
                                        {roles.has('DRIVER') && (
                                            <button
                                                type="button"
                                                className="ep-btn"
                                                style={{ width: '100%', justifyContent: 'flex-start' }}
                                                onClick={() => {
                                                    setUserMenuOpen(false)
                                                    nav('/driver')
                                                }}
                                            >
                                                ← Back to Driver
                                            </button>
                                        )}


                                        <button
                                            type="button"
                                            className="ep-btn"
                                            style={{ width: '100%', justifyContent: 'flex-start' }}
                                            onClick={() => {
                                                setUserMenuOpen(false)
                                                setProfileOpen(true)
                                            }}

                                        >
                                            Manage Profile
                                        </button>

                                        <button
                                            type="button"
                                            className="ep-btn"
                                            style={{ width: '100%', justifyContent: 'flex-start' }}
                                            onClick={() => {
                                                setUserMenuOpen(false)
                                                logout()
                                                nav('/login')
                                            }}
                                        >
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (

                            <>
                                <button className="ep-btn" onClick={() => nav('/login')}>
                                    Login
                                </button>
                                <button
                                    className="ep-btn ep-btn-primary"
                                    onClick={() => nav('/register')}
                                >
                                    Register
                                </button>
                            </>
                        )}
                    </div>
                </header>
            )}

            <main className={isAuthRoute ? 'ep-main ep-main-auth' : 'ep-main'}>
                {isAuthRoute ? (
                    children
                ) : (
                    <div className="ep-container">
                        <h1 className="ep-title">{title}</h1>
                        {children}
                    </div>
                )}
            </main>
            <ProfileModal
                isOpen={profileOpen}
                onClose={() => setProfileOpen(false)}
                onUpdateSuccess={(updatedUser) => {
                    setProfileOpen(false)

                    const roles = updatedUser?.roles ?? []
                    const hasDriver = roles.includes('DRIVER')
                    const hasOwner = roles.includes('OWNER')

                    // If BOTH: stay on the same page
                    if (hasDriver && hasOwner) return

                    // If only DRIVER: go to driver
                    if (hasDriver) nav('/driver', { replace: true })

                    // If only OWNER: go to owner
                    else if (hasOwner) nav('/owner', { replace: true })

                    // fallback
                    else nav('/login', { replace: true })
                }}
            />



        </div>
    )
}

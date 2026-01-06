import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { getCurrentUser, logout, subscribeAuthChanged } from '../../services/session'
import '../../styles/layout.css'
import ProfileModal from '../modals/ProfileModal' // adjust path if needed

const linkClass = ({ isActive }) => (isActive ? 'ep-link ep-link-active' : 'ep-link')

function IconUser({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 12a4.2 4.2 0 1 0-4.2-4.2A4.2 4.2 0 0 0 12 12Z"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <path
                d="M4.5 20.2c1.4-4.2 13.6-4.2 15 0"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    )
}
function IconLock({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M7.5 11V8.8A4.5 4.5 0 0 1 12 4.3a4.5 4.5 0 0 1 4.5 4.5V11"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <path
                d="M7.2 11h9.6c.9 0 1.7.8 1.7 1.7v6.1c0 .9-.8 1.7-1.7 1.7H7.2c-.9 0-1.7-.8-1.7-1.7v-6.1c0-.9.8-1.7 1.7-1.7Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
        </svg>
    )
}


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
    const isAuthRoute = ['/', '/login', '/register', '/reset-password'].includes(location.pathname)

    useEffect(() => {
        setUserMenuOpen(false)
    }, [location.pathname])

    return (
        <div className={isAuthRoute ? 'ep-app ep-app-auth' : 'ep-app'}>
            {!isAuthRoute && (
                <header className="ep-header">
                    <div
                        className="ep-brand"
                        onClick={() => nav('/driver')}
                        role="button"
                        style={{cursor: 'pointer'}}
                    >
                      <span className="ep-brand-badge" aria-hidden="true">
                        <img
                            src="Logo_notext.png"
                            alt="Logo"
                            className="ep-brand-logo"
                        />
                      </span>

                        <div className="ep-brand-text">EasyPark</div>
                    </div>


                    <div className="ep-actions">
                        {user ? (
                            <div style={{position: 'relative', display: 'flex', gap: 10, alignItems: 'center'}}>
                                {/* CHANGED: Text chip -> Profile icon button */}
                                <button
                                    type="button"
                                    className="ep-profile-icon-btn"
                                    onClick={() => setUserMenuOpen((v) => !v)}
                                    title="Account"
                                    aria-label="Account menu"
                                >
                                    <IconUser size={18} />
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
                                                ← Find Parking
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            className="ep-btn"
                                            style={{ width: '100%', justifyContent: 'flex-start' }}
                                            onClick={() => {
                                                setUserMenuOpen(false)
                                                nav('/manage-profile')
                                            }}
                                        >
                                            Manage Profile
                                        </button>
                                        <button
                                            type="button"
                                            className="ep-btn"
                                            style={{ width: '100%', justifyContent: 'flex-start', gap: 8 }}
                                            onClick={() => {
                                                setUserMenuOpen(false)
                                                nav('/change-password')
                                            }}
                                        >
                                            <IconLock size={18} />
                                            Change Password
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
                                <button className="ep-btn ep-btn-primary" onClick={() => nav('/register')}>
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

                    const rolesArr = updatedUser?.roles ?? []
                    const hasDriver = rolesArr.includes('DRIVER')
                    const hasOwner = rolesArr.includes('OWNER')

                    // If BOTH: stay on the same page
                    if (hasDriver && hasOwner) return

                    // If only DRIVER: go to driver
                    if (hasDriver) nav('/driver', { replace: true })
                    // If only OWNER: go to owner
                    else if (hasOwner) nav('/manage-spots', { replace: true })
                    // fallback
                    else nav('/login', { replace: true })
                }}
            />
        </div>
    )
}

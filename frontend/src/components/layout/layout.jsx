import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { getCurrentUser, logout } from '../../services/session'
import '../../styles/layout.css'

const linkClass = ({ isActive }) =>
    isActive ? 'ep-link ep-link-active' : 'ep-link'

export default function Layout({ title, children }) {
    const nav = useNavigate()
    const location = useLocation()

    const user = getCurrentUser()
    const roles = new Set(user?.roles ?? [])

    // Auth screens should look like a mobile app landing (no header/top nav)
    const isAuthRoute = ['/', '/login', '/register', '/reset-password'].includes(
        location.pathname
    )

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
                            <>
                                <span className="ep-chip">
                                    {user.fullName} • {user.roles.join(' / ')}
                                </span>
                                <button
                                    className="ep-btn"
                                    onClick={() => {
                                        logout()
                                        nav('/login')
                                    }}
                                >
                                    Logout
                                </button>
                            </>
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
        </div>
    )
}

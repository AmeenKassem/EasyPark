import { NavLink, useNavigate } from 'react-router-dom'
import { getCurrentUser, logout } from '../../services/session'
import '../../styles/layout.css'

const linkClass = ({ isActive }) =>
    isActive ? 'ep-link ep-link-active' : 'ep-link'

export default function Layout({ title, children }) {
    const nav = useNavigate()
    const user = getCurrentUser()
    const roles = new Set(user?.roles ?? [])

    return (
        <div className="ep-app">
            <header className="ep-header">
                <div className="ep-brand" role="button" onClick={() => nav('/')}>
                    <span style={{ fontSize: 18 }}>🅿️</span>
                    <span>EasyPark</span>
                </div>

                <nav className="ep-nav">
                    <NavLink to="/" className={linkClass}>
                        Dashboard
                    </NavLink>

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

            <main className="ep-main">
                <div className="ep-container">
                    <h1 className="ep-title">{title}</h1>
                    {children}
                </div>
            </main>
        </div>
    )
}

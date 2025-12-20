import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Layout from '../components/layout/layout'
import '../styles/auth.css'
import { GoogleLogin } from '@react-oauth/google'
import { loginMock } from '../services/session'

function roleToRoles(role) {
    if (!role) return ['DRIVER']
    if (role === 'BOTH') return ['DRIVER', 'OWNER']
    return [role]
}

export default function LoginPage() {
    const nav = useNavigate()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const canSubmit = useMemo(() => {
        return email.trim().length >= 5 && password.length >= 6 && !loading
    }, [email, password, loading])

    async function onSubmit(e) {
        e.preventDefault()
        setError('')
        if (!canSubmit) {
            setError('Please enter a valid email and password.')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), password }),
            })

            if (!res.ok) {
                const msg = await res.text().catch(() => '')
                throw new Error(msg || `Login failed (${res.status})`)
            }

            const data = await res.json()

            // Your backend returns: { token, user: { fullName, role, ... } }
            loginMock({
                fullName: data?.user?.fullName || 'User',
                roles: roleToRoles(data?.user?.role),
            })

            nav('/')
        } catch (err) {
            setError(err?.message || 'Login failed.')
        } finally {
            setLoading(false)
        }
    }

    async function onGoogleSuccess(credentialResponse) {
        setError('')
        setLoading(true)
        try {
            const idToken = credentialResponse?.credential
            if (!idToken) throw new Error('Google sign-in did not return a token.')

            const res = await fetch('/api/auth/google-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ googleIdToken: idToken }),
            })

            if (!res.ok) {
                const msg = await res.text().catch(() => '')
                throw new Error(msg || `Google login failed (${res.status})`)
            }

            const data = await res.json()

            loginMock({
                fullName: data?.user?.fullName || 'User',
                roles: roleToRoles(data?.user?.role),
            })

            nav('/')
        } catch (err) {
            setError(err?.message || 'Google login failed.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Layout title="Login">
            <div className="auth-wrap">
                <div className="auth-card">
                    <h2 className="auth-title">Welcome back</h2>
                    <p className="auth-subtitle">
                        Sign in to continue. You can use email/password or Google.
                    </p>

                    <div style={{ display: 'grid', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <GoogleLogin onSuccess={onGoogleSuccess} onError={() => setError('Google login failed.')} />
                        </div>

                        <div className="auth-divider">or</div>
                    </div>

                    <form className="auth-form" onSubmit={onSubmit}>
                        <div className="auth-field">
                            <label>Email</label>
                            <input
                                className="auth-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                autoComplete="email"
                            />
                        </div>

                        <div className="auth-field">
                            <label>Password</label>
                            <input
                                className="auth-input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                        </div>

                        {error && <div className="auth-error">{error}</div>}

                        <div className="auth-actions">
                            <button
                                className="ep-btn ep-btn-primary"
                                type="submit"
                                disabled={!canSubmit}
                                style={{
                                    opacity: canSubmit ? 1 : 0.55,
                                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                                }}
                            >
                                {loading ? 'Signing in...' : 'Login'}
                            </button>

                            <Link className="ep-btn" to="/register" style={{ textDecoration: 'none' }}>
                                Create account
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    )
}

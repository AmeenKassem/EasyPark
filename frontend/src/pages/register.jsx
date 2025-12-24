import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/layout'
import { loginMock } from '../services/session'
import '../styles/auth.css'

const ROLE_OPTIONS = [
    { value: 'DRIVER', label: 'Driver' },
    { value: 'OWNER', label: 'Owner' },
    { value: 'BOTH', label: 'Driver + Owner' },
]

function roleToRoles(value) {
    if (value === 'BOTH') return ['DRIVER', 'OWNER']
    return [value]
}

export default function RegisterPage() {
    const nav = useNavigate()

    const [fullName, setFullName] = useState('')
    const [role, setRole] = useState('DRIVER')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const canSubmit = useMemo(() => {
        return (
            fullName.trim().length >= 2 &&
            email.trim().length >= 5 &&
            password.length >= 6
        )
    }, [fullName, email, password])

    async function onSubmit(e) {
        e.preventDefault()
        setError('')

        if (!canSubmit) {
            setError('Please fill in all required fields.')
            return
        }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: fullName.trim(),
                    email: email.trim(),
                    phone: phone.trim(),
                    password,
                    role,
                }),
            })

            if (!res.ok) {
                const msg = await res.text().catch(() => '')
                throw new Error(msg || `Register failed (${res.status})`)
            }

            const data = await res.json()

            // Persist user in frontend (same pattern as login)
            loginMock({
                fullName: data.user.fullName,
                roles: roleToRoles(data.user.role),
            })

            nav('/')
        } catch (err) {
            setError(err.message || 'Registration failed.')
        }
    }


    return (
        <Layout title="Register">
            <div className="auth-wrap">
                <div className="auth-card">
                    <h2 className="auth-title">Create your EasyPark account</h2>
                    <p className="auth-subtitle">
                        Register as a driver, parking owner, or both. (Mock mode for now —
                        backend registration will be connected later.)
                    </p>

                    <form className="auth-form" onSubmit={onSubmit}>
                        <div className="auth-row-two">
                            <div className="auth-field">
                                <label>Full name</label>
                                <input
                                    className="auth-input"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="John Doe"
                                    autoComplete="name"
                                />
                            </div>

                            <div className="auth-field">
                                <label>Role</label>
                                <select
                                    className="auth-select"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                >
                                    {ROLE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

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
                            <label>Phone</label>
                            <input
                                className="auth-input"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+972501234567"
                                autoComplete="tel"
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
                                autoComplete="new-password"
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
                                Register
                            </button>

                            <button
                                className="ep-btn"
                                type="button"
                                onClick={() => nav('/login')}
                            >
                                Back to login
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    )
}

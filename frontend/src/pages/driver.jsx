import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import '../styles/driver.css'
import { mockSpots } from '../mocks/spots'
import MapComponent from '../components/map/mapComponent'
import { logout } from '../services/session'

function IconPin({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 22s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <path
                d="M12 13.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
                stroke="currentColor"
                strokeWidth="1.8"
            />
        </svg>
    )
}

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

function IconSearch({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M10.5 18.5a8 8 0 1 1 5.2-14.1A8 8 0 0 1 10.5 18.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <path
                d="M16.8 16.8 21 21"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    )
}

function IconSliders({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h6M14 18h6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <path
                d="M14 6a2 2 0 1 0 0 .01ZM8 12a2 2 0 1 0 0 .01ZM12 18a2 2 0 1 0 0 .01Z"
                fill="currentColor"
            />
        </svg>
    )
}

export default function DriverPage() {
    const nav = useNavigate()
    const location = useLocation()

    const [address, setAddress] = useState('')
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [coveredOnly, setCoveredOnly] = useState(false)
    const [activeOnly, setActiveOnly] = useState(true)
    const [maxPrice, setMaxPrice] = useState(100)

    const [profileOpen, setProfileOpen] = useState(false)
    const profileBtnRef = useRef(null)
    const [profileMenuPos, setProfileMenuPos] = useState({ top: 0, left: 0 })

    useEffect(() => {
        setProfileOpen(false)
        setFiltersOpen(false)
    }, [location.key])

    const spots = useMemo(() => {
        const q = address.trim().toLowerCase()

        return (mockSpots || []).filter((s) => {
            if (activeOnly && s.status && s.status !== 'active') return false
            if (coveredOnly && !s.covered) return false

            const p = Number(s.pricePerHour)
            if (!Number.isNaN(p) && p > maxPrice) return false

            if (q) {
                const hay = `${s.title ?? ''} ${s.address ?? ''}`.toLowerCase()
                if (!hay.includes(q)) return false
            }

            return true
        })
    }, [address, coveredOnly, activeOnly, maxPrice])

    const doLogout = () => {
        try {
            localStorage.removeItem('easypark_token')
        } catch {
            // ignore
        }
        try {
            logout()
        } catch {
            // ignore
        }
        setProfileOpen(false)
        nav('/', { replace: true })
    }

    const openProfileMenu = () => {
        const el = profileBtnRef.current
        if (el) {
            const r = el.getBoundingClientRect()
            const menuWidth = 220
            const gap = 10
            const left = Math.min(window.innerWidth - menuWidth - 12, Math.max(12, r.right - menuWidth))
            const top = r.bottom + gap
            setProfileMenuPos({ top, left })
        }
        setProfileOpen(true)
    }

    useEffect(() => {
        if (!profileOpen) return

        const onResizeOrScroll = () => {
            const el = profileBtnRef.current
            if (!el) return
            const r = el.getBoundingClientRect()
            const menuWidth = 220
            const gap = 10
            const left = Math.min(window.innerWidth - menuWidth - 12, Math.max(12, r.right - menuWidth))
            const top = r.bottom + gap
            setProfileMenuPos({ top, left })
        }

        window.addEventListener('resize', onResizeOrScroll)
        window.addEventListener('scroll', onResizeOrScroll, true)

        return () => {
            window.removeEventListener('resize', onResizeOrScroll)
            window.removeEventListener('scroll', onResizeOrScroll, true)
        }
    }, [profileOpen])

    return (
        <div
            style={{
                position: 'relative',
                height: '100dvh',
                width: '100vw',
                overflow: 'hidden',
                background: '#0b1220',
            }}
        >
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <MapComponent key={location.key} spots={spots} />
            </div>

            <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        padding: '12px 14px',
                        background: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 8px 30px rgba(15, 23, 42, 0.12)',
                        pointerEvents: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div
                        onClick={() => nav('/driver')}
                        role="button"
                        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                    >
                        <span
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: '#2563eb',
                                display: 'grid',
                                placeItems: 'center',
                                color: 'white',
                            }}
                            aria-hidden="true"
                        >
                            <IconPin size={18} />
                        </span>
                        <div style={{ fontWeight: 900, fontSize: 18, color: '#0f172a' }}>EasyPark</div>
                    </div>

                    <button
                        ref={profileBtnRef}
                        type="button"
                        onClick={() => {
                            if (profileOpen) setProfileOpen(false)
                            else openProfileMenu()
                        }}
                        aria-label="Profile menu"
                        style={{
                            width: 42,
                            height: 42,
                            borderRadius: 999,
                            border: 0,
                            background: '#2563eb',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'grid',
                            placeItems: 'center',
                            boxShadow: '0 10px 20px rgba(37, 99, 235, 0.25)',
                        }}
                    >
                        <IconUser size={18} />
                    </button>
                </div>

                <div
                    style={{
                        position: 'absolute',
                        top: 74,
                        left: 12,
                        right: 12,
                        pointerEvents: 'auto',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '12px 14px',
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.96)',
                            boxShadow: '0 14px 40px rgba(15, 23, 42, 0.14)',
                        }}
                    >
                        <span style={{ color: '#94a3b8' }} aria-hidden="true">
                            <IconSearch size={18} />
                        </span>

                        <input
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Search location..."
                            autoComplete="off"
                            style={{
                                flex: 1,
                                border: 0,
                                outline: 'none',
                                fontSize: 16,
                                background: 'transparent',
                                color: '#0f172a',
                            }}
                        />

                        <button
                            type="button"
                            onClick={() => setFiltersOpen(true)}
                            aria-label="Filters"
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 999,
                                border: 0,
                                background: 'transparent',
                                cursor: 'pointer',
                                display: 'grid',
                                placeItems: 'center',
                                color: '#2563eb',
                            }}
                        >
                            <IconSliders size={18} />
                        </button>
                    </div>
                </div>

                <div style={{ position: 'absolute', left: 12, bottom: 18, pointerEvents: 'none' }}>
                    <div
                        style={{
                            pointerEvents: 'auto',
                            background: 'rgba(255,255,255,0.92)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: 999,
                            padding: '8px 12px',
                            boxShadow: '0 14px 40px rgba(15, 23, 42, 0.14)',
                            fontWeight: 800,
                            color: '#0f172a',
                        }}
                    >
                        {spots.length} spots found
                    </div>
                </div>

                {filtersOpen && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 20000, pointerEvents: 'auto' }}>
                        <button
                            type="button"
                            onClick={() => setFiltersOpen(false)}
                            aria-label="Close filters"
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(15, 23, 42, 0.45)',
                                border: 0,
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(255,255,255,0.98)',
                                borderTopLeftRadius: 18,
                                borderTopRightRadius: 18,
                                padding: 16,
                                boxShadow: '0 -18px 40px rgba(15, 23, 42, 0.20)',
                            }}
                        >
                            <div
                                style={{
                                    width: 46,
                                    height: 5,
                                    borderRadius: 999,
                                    background: 'rgba(15, 23, 42, 0.12)',
                                    margin: '0 auto 12px auto',
                                }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Filters</div>
                                <button
                                    type="button"
                                    onClick={() => setFiltersOpen(false)}
                                    style={{
                                        border: 0,
                                        background: 'transparent',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        color: '#2563eb',
                                    }}
                                >
                                    Close
                                </button>
                            </div>

                            <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 800, color: '#0f172a' }}>Active only</span>
                                    <input
                                        type="checkbox"
                                        checked={activeOnly}
                                        onChange={(e) => setActiveOnly(e.target.checked)}
                                    />
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 800, color: '#0f172a' }}>Covered only</span>
                                    <input
                                        type="checkbox"
                                        checked={coveredOnly}
                                        onChange={(e) => setCoveredOnly(e.target.checked)}
                                    />
                                </label>

                                <div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: 8,
                                        }}
                                    >
                                        <span style={{ fontWeight: 800, color: '#0f172a' }}>Max price</span>
                                        <span style={{ fontWeight: 900, color: '#64748b' }}>{maxPrice}/hr</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(Number(e.target.value))}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAddress('')
                                            setCoveredOnly(false)
                                            setActiveOnly(true)
                                            setMaxPrice(100)
                                        }}
                                        style={{
                                            flex: 1,
                                            height: 44,
                                            borderRadius: 12,
                                            border: '1px solid rgba(15, 23, 42, 0.14)',
                                            background: 'transparent',
                                            fontWeight: 900,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Reset
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltersOpen(false)}
                                        style={{
                                            flex: 1,
                                            height: 44,
                                            borderRadius: 12,
                                            border: 0,
                                            background: '#0f172a',
                                            color: 'white',
                                            fontWeight: 900,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>

                            <div style={{ height: 14 }} />
                        </div>
                    </div>
                )}
            </div>

            {profileOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 999999,
                        pointerEvents: 'auto',
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setProfileOpen(false)}
                        aria-label="Close profile menu"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'transparent',
                            border: 0,
                            padding: 0,
                            margin: 0,
                        }}
                    />

                    <div
                        style={{
                            position: 'absolute',
                            top: profileMenuPos.top,
                            left: profileMenuPos.left,
                            width: 220,
                            background: 'rgba(255,255,255,0.98)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(15, 23, 42, 0.10)',
                            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)',
                            borderRadius: 14,
                            padding: 8,
                        }}
                    >
                        <button
                            type="button"
                            onClick={doLogout}
                            style={{
                                width: '100%',
                                height: 42,
                                borderRadius: 12,
                                border: 0,
                                background: 'rgba(239, 68, 68, 0.10)',
                                textAlign: 'left',
                                padding: '0 12px',
                                fontWeight: 900,
                                cursor: 'pointer',
                                color: '#ef4444',
                            }}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

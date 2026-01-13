import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Autocomplete } from '@react-google-maps/api'
import '../styles/driver.css'
import MapComponent from '../components/map/mapComponent'
import { logout, getCurrentUser, subscribeAuthChanged } from '../services/session'
import ProfileModal from '../components/modals/ProfileModal'
import BookParkingModal from '../components/modals/BookParkingModal'

// --- ICONS ---
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
            <path d="M16.8 16.8 21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

const defaultCenter = { lat: 32.0853, lng: 34.7818 } // Tel Aviv default

export default function DriverPage() {
    const nav = useNavigate()
    const location = useLocation()

    const [user, setUser] = useState(getCurrentUser())
    const roles = useMemo(() => new Set(user?.roles ?? []), [user])

    // Map control (optional, only works if MapComponent calls onMapLoad)
    const mapRef = useRef(null)

    // Autocomplete refs/state
    const [autocomplete, setAutocomplete] = useState(null)
    const isPlaceSelectedRef = useRef(false)

    // Filters
    const [address, setAddress] = useState('')
    const [searchBounds, setSearchBounds] = useState(null)

    const [filtersOpen, setFiltersOpen] = useState(false)
    const [coveredOnly, setCoveredOnly] = useState(false)
    const [activeOnly, setActiveOnly] = useState(true)
    const [maxPrice, setMaxPrice] = useState('') // empty = no max price filter

    // Availability window (datetime-local strings)
    const [availFrom, setAvailFrom] = useState('')
    const [availTo, setAvailTo] = useState('')

    // Data
    const [allSpots, setAllSpots] = useState([])
    const [loading, setLoading] = useState(false)

    // Map center
    const [mapCenter, setMapCenter] = useState(defaultCenter)

    // Booking UI
    const [bookingOpen, setBookingOpen] = useState(false)
    const [bookingSpot, setBookingSpot] = useState(null)
    const [bookingToast, setBookingToast] = useState('')

    // Profile menu UI
    const [profileOpen, setProfileOpen] = useState(false)
    const profileBtnRef = useRef(null)
    const [profileMenuPos, setProfileMenuPos] = useState({ top: 0, left: 0 })
    const [isProfileModalOpen, setProfileModalOpen] = useState(false)

    // Keep user in sync with storage/auth events
    useEffect(() => {
        return subscribeAuthChanged(() => setUser(getCurrentUser()))
    }, [])

    // Close overlays when route changes
    useEffect(() => {
        setProfileOpen(false)
        setFiltersOpen(false)
    }, [location.key])

    useEffect(() => {
        setUser(getCurrentUser())
    }, [location.key])

    // SERVER FETCH (only when server-query params change)
    useEffect(() => {
        const fetchSpots = async () => {
            setLoading(true)
            try {
                const params = {}
                if (coveredOnly) params.covered = true

                const max = Number(maxPrice)
                if (Number.isFinite(max) && max > 0) params.maxPrice = max

                const response = await axios.get('http://localhost:8080/api/parking-spots/search', {
                    params,
                    headers: { Authorization: `Bearer ${localStorage.getItem('easypark_token')}` },
                })

                setAllSpots(response.data || [])
            } catch (error) {
                console.error('Failed to fetch spots', error)
                setAllSpots([])
            } finally {
                setLoading(false)
            }
        }

        fetchSpots()
    }, [coveredOnly, maxPrice])

    // CLIENT FILTERING (active + availability + bounds OR fallback text)
    const filteredSpots = useMemo(() => {
        let data = Array.isArray(allSpots) ? [...allSpots] : []

        if (activeOnly) {
            data = data.filter((s) => s?.active === true)
        }

        // Availability window filter
        if (availFrom && availTo) {
            const wantFrom = new Date(availFrom)
            const wantTo = new Date(availTo)

            data = data.filter((s) => {
                // If backend doesn't provide availability -> don't exclude (your original behavior)
                if (!s?.availableFrom || !s?.availableTo) return true
                const spotFrom = new Date(s.availableFrom)
                const spotTo = new Date(s.availableTo)
                return spotFrom <= wantFrom && spotTo >= wantTo
            })
        } else if (availFrom) {
            const wantFrom = new Date(availFrom)
            data = data.filter((s) => {
                if (!s?.availableFrom) return false
                return new Date(s.availableFrom) <= wantFrom
            })
        } else if (availTo) {
            const wantTo = new Date(availTo)
            data = data.filter((s) => {
                if (!s?.availableTo) return false
                return new Date(s.availableTo) >= wantTo
            })
        }

        // Bounds filter (preferred)
        if (searchBounds) {
            data = data.filter((s) => {
                // robust: 0 is valid; null/undefined invalid
                if (s?.lat == null || s?.lng == null) return false
                return (
                    s.lat <= searchBounds.north &&
                    s.lat >= searchBounds.south &&
                    s.lng <= searchBounds.east &&
                    s.lng >= searchBounds.west
                )
            })
            return data
        }

        // Fallback: text search if user typed but did not select (no bounds)
        if (address.trim()) {
            const q = address.trim().toLowerCase()
            data = data.filter((s) => (s?.location || '').toLowerCase().includes(q))
        }

        return data
    }, [allSpots, activeOnly, availFrom, availTo, searchBounds, address])

    // --- Place selection logic (shared by dropdown selection + Enter fallback) ---
    const handlePlaceSelect = (place) => {
        if (!place?.geometry?.location) return

        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()

        setMapCenter({ lat, lng })

        const types = place.types || []
        const isBroadArea =
            types.includes('locality') ||
            types.includes('administrative_area_level_1') ||
            types.includes('administrative_area_level_2')

        if (isBroadArea && place.geometry.viewport) {
            const bounds = place.geometry.viewport
            setSearchBounds({
                north: bounds.getNorthEast().lat(),
                south: bounds.getSouthWest().lat(),
                east: bounds.getNorthEast().lng(),
                west: bounds.getSouthWest().lng(),
            })

            if (mapRef.current?.fitBounds) {
                mapRef.current.fitBounds(bounds)
            }
        } else {
            // For specific addresses/buildings: create a ~1.5km box
            const delta = 0.015
            setSearchBounds({
                north: lat + delta,
                south: lat - delta,
                east: lng + delta,
                west: lng - delta,
            })

            if (mapRef.current?.setZoom && mapRef.current?.panTo) {
                mapRef.current.setZoom(15)
                mapRef.current.panTo({ lat, lng })
            }
        }

        if (place.formatted_address) {
            setAddress(place.formatted_address)
        }
    }

    const onLoadAutocomplete = (au) => setAutocomplete(au)

    const onPlaceChanged = () => {
        isPlaceSelectedRef.current = true
        if (!autocomplete) return
        const place = autocomplete.getPlace()
        handlePlaceSelect(place)
    }

    // Enter-to-select-first-prediction fallback
    const fetchFirstPredictionDetails = (inputText) => {
        return new Promise((resolve, reject) => {
            if (!window.google?.maps?.places) return reject(new Error('Google Maps Places API not loaded'))

            const autocompleteService = new window.google.maps.places.AutocompleteService()
            autocompleteService.getPlacePredictions({ input: inputText }, (predictions, status) => {
                if (
                    status !== window.google.maps.places.PlacesServiceStatus.OK ||
                    !predictions ||
                    predictions.length === 0
                ) {
                    return reject(new Error('No predictions found'))
                }

                const first = predictions[0]
                setAddress(first.description)

                const placesService = new window.google.maps.places.PlacesService(document.createElement('div'))
                placesService.getDetails(
                    {
                        placeId: first.place_id,
                        fields: ['geometry', 'formatted_address', 'types', 'place_id'],
                    },
                    (place, st) => {
                        if (st === window.google.maps.places.PlacesServiceStatus.OK && place) resolve(place)
                        else reject(new Error('Failed to get place details'))
                    }
                )
            })
        })
    }

    const handleInputKeyDown = (e) => {
        if (e.key !== 'Enter') return
        if (!address.trim()) return

        // Do not interfere if Google is already selecting a highlighted item
        const highlighted = document.querySelector('.pac-item-selected')
        if (highlighted) return

        isPlaceSelectedRef.current = false

        setTimeout(async () => {
            if (isPlaceSelectedRef.current) return // onPlaceChanged already handled

            try {
                const place = await fetchFirstPredictionDetails(address)
                handlePlaceSelect(place)
                e.target?.blur?.()
            } catch (err) {
                console.warn('Enter fallback place fetch failed:', err?.message || err)
            }
        }, 250)
    }

    // Reset filters
    const handleReset = () => {
        setAddress('')
        setSearchBounds(null)
        setCoveredOnly(false)
        setActiveOnly(true)
        setMaxPrice('')
        setAvailFrom('')
        setAvailTo('')
    }

    // Logout & profile menu positioning
    const doLogout = () => {
        try {
            localStorage.removeItem('easypark_token')
        } catch {}
        try {
            logout()
        } catch {}
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
        <div style={{ position: 'relative', height: '100dvh', width: '100vw', overflow: 'hidden', background: '#0b1220' }}>
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <MapComponent
                    key={location.key}
                    spots={filteredSpots}
                    center={mapCenter}
                    currentUserId={user?.id}
                    onSpotClick={(spot) => {
                        setBookingSpot(spot)
                        setBookingOpen(true)
                    }}
                    // Optional: only effective if MapComponent calls it
                    onMapLoad={(map) => {
                        mapRef.current = map
                    }}
                />
            </div>

            <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
                {/* Header */}
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
                    <div onClick={() => nav('/driver')} role="button" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <span
                style={{
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    background: 'rgb(37,99,235)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'white',
                    overflow: 'hidden',
                }}
                aria-hidden="true"
            >
              <img src="Logo_notext.png" alt="Logo" style={{ width: 41, height: 50, display: 'block', marginLeft: -1 }} />
            </span>
                        <div style={{ fontWeight: 900, fontSize: 18, color: '#0549fa' }}>EasyPark</div>
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

                {/* Search bar */}
                <div style={{ position: 'absolute', top: 74, left: 12, right: 12, pointerEvents: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.96)', boxShadow: '0 14px 40px rgba(15, 23, 42, 0.14)' }}>
            <span style={{ color: '#94a3b8' }} aria-hidden="true">
              <IconSearch size={18} />
            </span>

                        <div style={{ flex: 1 }}>
                            <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged}>
                                <input
                                    value={address}
                                    onChange={(e) => {
                                        setAddress(e.target.value)
                                        if (e.target.value === '') setSearchBounds(null)
                                    }}
                                    onKeyDown={handleInputKeyDown}
                                    placeholder="Search location..."
                                    autoComplete="off"
                                    style={{
                                        width: '100%',
                                        border: 0,
                                        outline: 'none',
                                        fontSize: 16,
                                        background: 'transparent',
                                        color: '#0f172a',
                                    }}
                                />
                            </Autocomplete>
                        </div>

                        <button
                            type="button"
                            onClick={() => setFiltersOpen(true)}
                            aria-label="Filters"
                            style={{ width: 40, height: 40, borderRadius: 999, border: 0, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#2563eb' }}
                        >
                            <IconSliders size={18} />
                        </button>
                    </div>
                </div>

                {/* Footer stats */}
                <div style={{ position: 'absolute', left: 12, bottom: 18, pointerEvents: 'none' }}>
                    <div style={{ pointerEvents: 'auto', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', borderRadius: 999, padding: '8px 12px', boxShadow: '0 14px 40px rgba(15, 23, 42, 0.14)', fontWeight: 800, color: '#0f172a' }}>
                        {loading ? 'Loading...' : `${filteredSpots.length} spots found`}
                    </div>
                </div>

                {/* Filters modal */}
                {filtersOpen && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 20000, pointerEvents: 'auto' }}>
                        <button type="button" onClick={() => setFiltersOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.45)', border: 0 }} />
                        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.98)', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, boxShadow: '0 -18px 40px rgba(15, 23, 42, 0.20)' }}>
                            <div style={{ width: 46, height: 5, borderRadius: 999, background: 'rgba(15, 23, 42, 0.12)', margin: '0 auto 12px auto' }} />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Filters</div>
                                <button type="button" onClick={() => setFiltersOpen(false)} style={{ border: 0, background: 'transparent', fontWeight: 800, cursor: 'pointer', color: '#2563eb' }}>
                                    Close
                                </button>
                            </div>

                            <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 800, color: '#0f172a' }}>Active only</span>
                                    <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 800, color: '#0f172a' }}>Covered only</span>
                                    <input type="checkbox" checked={coveredOnly} onChange={(e) => setCoveredOnly(e.target.checked)} />
                                </label>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <span style={{ fontWeight: 800, color: '#0f172a' }}>Max price</span>
                                        <span style={{ fontWeight: 900, color: '#64748b' }}>{maxPrice ? `${maxPrice}/hr` : 'Any'}</span>
                                    </div>

                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        min="1"
                                        step="1"
                                        placeholder="e.g. 100"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(e.target.value)}
                                        style={{
                                            width: '100%',
                                            height: 44,
                                            borderRadius: 12,
                                            border: '1px solid rgba(15,23,42,0.14)',
                                            padding: '0 12px',
                                            outline: 'none',
                                            fontSize: 16,
                                            color: '#0f172a',
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gap: 10 }}>
                                    <div>
                                        <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Available from</div>
                                        <input
                                            type="datetime-local"
                                            value={availFrom}
                                            onChange={(e) => {
                                                const v = e.target.value
                                                setAvailFrom(v)
                                                if (availTo && v && v > availTo) setAvailTo('')
                                            }}
                                            style={{
                                                width: '100%',
                                                height: 44,
                                                borderRadius: 12,
                                                border: '1px solid rgba(15,23,42,0.14)',
                                                padding: '0 12px',
                                                outline: 'none',
                                                fontSize: 16,
                                                color: '#0f172a',
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Available to</div>
                                        <input
                                            type="datetime-local"
                                            value={availTo}
                                            min={availFrom || undefined}
                                            onChange={(e) => setAvailTo(e.target.value)}
                                            style={{
                                                width: '100%',
                                                height: 44,
                                                borderRadius: 12,
                                                border: '1px solid rgba(15,23,42,0.14)',
                                                padding: '0 12px',
                                                outline: 'none',
                                                fontSize: 16,
                                                color: '#0f172a',
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                                    <button type="button" onClick={handleReset} style={{ flex: 1, height: 44, borderRadius: 12, border: '1px solid rgba(15, 23, 42, 0.14)', background: 'transparent', fontWeight: 900, cursor: 'pointer' }}>
                                        Reset
                                    </button>
                                    <button type="button" onClick={() => setFiltersOpen(false)} style={{ flex: 1, height: 44, borderRadius: 12, border: 0, background: '#0f172a', color: 'white', fontWeight: 900, cursor: 'pointer' }}>
                                        Apply
                                    </button>
                                </div>
                            </div>

                            <div style={{ height: 14 }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Profile dropdown */}
            {profileOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999999, pointerEvents: 'auto' }}>
                    <button type="button" onClick={() => setProfileOpen(false)} style={{ position: 'absolute', inset: 0, background: 'transparent', border: 0, padding: 0, margin: 0 }} />
                    <div
                        className= "profile-menu"
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
                        {roles.has('OWNER') && (
                            <button
                                type="button"
                                onClick={() => {
                                    setProfileOpen(false)
                                    nav('/manage-spots')
                                }}
                                style={{
                                    width: '100%',
                                    height: 42,
                                    borderRadius: 12,
                                    border: 0,
                                    background: '#e2e8f0',
                                    textAlign: 'left',
                                    padding: '0 12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    color: '#1e293b',
                                    marginBottom: '5px',
                                    transition: 'background 0.2s',
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                                onMouseOut={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                            >
                                Manage Spots
                            </button>
                        )}

                        {roles.has('DRIVER') && (
                            <button
                                type="button"
                                onClick={() => {
                                    setProfileOpen(false)
                                    nav('/my-bookings')
                                }}
                                style={{
                                    width: '100%',
                                    height: 42,
                                    borderRadius: 12,
                                    border: 0,
                                    background: 'transparent',
                                    textAlign: 'left',
                                    padding: '0 12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    color: '#1e293b',
                                    marginBottom: '5px',
                                    transition: 'background 0.2s',
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                                onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                                My Bookings
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                setProfileOpen(false)
                                setProfileModalOpen(true)
                                nav('/manage-profile')
                            }}
                            style={{
                                width: '100%',
                                height: 42,
                                borderRadius: 12,
                                border: 0,
                                background: 'transparent',
                                textAlign: 'left',
                                padding: '0 12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                color: '#1e293b',
                                marginBottom: '5px',
                                transition: 'background 0.2s',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            Manage Profile
                        </button>

                        <button
                                                        type="button"
                                                        onClick={() => {
                                                            setProfileOpen(false)
                                                            nav('/stats')
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            height: 42,
                                                            borderRadius: 12,
                                                            border: 0,
                                                            background: 'transparent',
                                                            textAlign: 'left',
                                                            padding: '0 12px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            color: '#1e293b',
                                                            marginBottom: '5px',
                                                            transition: 'background 0.2s',
                                                        }}
                                                        onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                                                        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                                                    >
                                                        My Statistics
                                                    </button>

                        <button
                            type="button"
                            onClick={() => {
                                setProfileOpen(false)
                                nav('/change-password')
                            }}
                            style={{
                                width: '100%',
                                height: 42,
                                borderRadius: 12,
                                border: 0,
                                background: 'transparent',
                                textAlign: 'left',
                                padding: '0 12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                color: '#1e293b',
                                marginBottom: '5px',
                                transition: 'background 0.2s',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                            Change Password
                        </button>

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

            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setProfileModalOpen(false)}
                onUpdateSuccess={(updatedUser) => {
                    const u = updatedUser ?? getCurrentUser()
                    const nextRoles = new Set(u?.roles ?? [])

                    if (nextRoles.has('OWNER') && !nextRoles.has('DRIVER')) {
                        nav('/owner', { replace: true })
                        return
                    }
                }}
            />

            <BookParkingModal
                isOpen={bookingOpen}
                spot={bookingSpot}
                onClose={() => setBookingOpen(false)}
                onBooked={(b) => {
                    const total = b?.totalPrice != null ? `₪${b.totalPrice}` : ''
                    setBookingToast(`Booking created (#${b?.id}). Status: ${b?.status || 'PENDING'} ${total}`)
                    setTimeout(() => setBookingToast(''), 3500)
                }}
            />

            {bookingToast && (
                <div style={{ position: 'absolute', left: 12, right: 12, bottom: 80, zIndex: 50000, pointerEvents: 'none' }}>
                    <div
                        style={{
                            pointerEvents: 'auto',
                            background: 'rgba(255,255,255,0.96)',
                            border: '1px solid rgba(15,23,42,0.12)',
                            borderRadius: 14,
                            padding: 12,
                            boxShadow: '0 14px 40px rgba(15, 23, 42, 0.14)',
                            fontWeight: 900,
                            color: '#0f172a',
                        }}
                    >
                        {bookingToast}
                    </div>
                </div>
            )}
        </div>
    )
}
